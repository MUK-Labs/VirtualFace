import { vogelLayout } from "./layouts/vogel.js";
import { WebMidi } from "./midi.js";

const app = document.querySelector(".app");
const keyboard = document.querySelector("#keyboard");
const stage = document.querySelector(".stage");
const panel = document.querySelector("#midi-panel");
const midiButton = document.querySelector("#midi-button");
const enableMidi = document.querySelector("#midi-enable");
const midiStatus = document.querySelector("#midi-status");
const midiDot = document.querySelector("#midi-dot");
const routing = document.querySelector("#midi-routing");
const inputDevice = document.querySelector("#midi-input");
const inputChannel = document.querySelector("#midi-input-channel");
const outputDevice = document.querySelector("#midi-output");
const outputChannel = document.querySelector("#midi-output-channel");
const fullscreen = document.querySelector("#fullscreen");
const fullscreenLabel = document.querySelector("#fullscreen-label");
const keyInfo = document.querySelector("#key-info");

const { keys, width, height } = vogelLayout;
const buttons = new Map();
const keysByAddress = new Map();
const localSources = new Map();
const localCounts = new Map();
const inboundSources = new Map();
const defaultHint = keyInfo.textContent;
const banks = Math.max(...keys.map(channelOffset)) + 1;
let inspectedKey = null;

function channelOffset(key) {
  return key.channelOffset ?? 0;
}

function address(channel, note) {
  return `${channel}:${note}`;
}

function channelFor(key, baseChannel) {
  return ((baseChannel - 1 + channelOffset(key)) % 16) + 1;
}

function setOptions(select, options, value) {
  select.replaceChildren(...options.map(({ id, name }) => new Option(name, id)));
  select.value = value;
}

const channels = Array.from({ length: 16 }, (_, index) => {
  const id = String(index + 1);
  return { id, name: id };
});
const none = { id: "none", name: "None" };
const all = { id: "all", name: "All devices" };
const anyChannel = { id: "any", name: "Any channel" };

setOptions(inputChannel, banks === 1 ? [anyChannel, ...channels] : channels, banks === 1 ? anyChannel.id : "1");
setOptions(outputChannel, channels, "1");
if (banks > 1) {
  document.querySelector("#midi-mapping").textContent =
    `VirtualFace uses ${banks} consecutive MIDI channels from the selected channel. Focus or hover over a key to see its MIDI address.`;
  inputChannel.labels[0].firstChild.textContent = "Input base channel";
  outputChannel.labels[0].firstChild.textContent = "Output base channel";
}

function noteAddress(key) {
  const out = channelFor(key, Number(outputChannel.value));
  const input = inputChannel.value === anyChannel.id
    ? "any channel"
    : `ch. ${channelFor(key, Number(inputChannel.value))}`;
  return `MIDI ${key.midiNote} · in ${input} · out ch. ${out}`;
}

function showKey(key) {
  inspectedKey = key;
  keyInfo.textContent = key ? `${key.label} · ${noteAddress(key)}` : defaultHint;
}

function refreshKeyAddresses() {
  for (const [key, button] of buttons) button.title = `${key.label} · ${noteAddress(key)}`;
  showKey(inspectedKey);
}

function refreshKey(key) {
  const active = localCounts.has(key) || inboundSources.has(key);
  const button = buttons.get(key);
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
}

function routeInput({ note, on, channel, source }) {
  const incoming = inputChannel.value;
  const offset = incoming === anyChannel.id ? 0 : (channel - Number(incoming) + 16) % 16;
  const key = keysByAddress.get(address(offset, note));
  if (!key) return;
  if (on) {
    if (!inboundSources.has(key)) inboundSources.set(key, new Set());
    inboundSources.get(key).add(source);
  } else {
    const sources = inboundSources.get(key);
    sources?.delete(source);
    if (sources?.size === 0) inboundSources.delete(key);
  }
  refreshKey(key);
}

function renderMidi(state) {
  const connected = state.status === "connected";
  midiDot.classList.toggle("connected", connected);
  routing.hidden = !connected;
  enableMidi.hidden = connected || state.status === "unavailable";
  enableMidi.disabled = state.status === "connecting";
  enableMidi.textContent = state.status === "error" ? "Retry MIDI" : "Enable MIDI";
  const messages = {
    idle: "Enable MIDI to connect a controller or a sound source.",
    connecting: "Waiting for MIDI permission…",
    connected: state.inputs.length || state.outputs.length
      ? "Choose the input and output ports for this keyboard."
      : "MIDI enabled. Connect a device to see its ports.",
    error: state.error || "MIDI access failed.",
    unavailable: "Web MIDI is unavailable here. Try a supported browser over HTTPS or localhost.",
  };
  midiStatus.textContent = state.error || messages[state.status];
  setOptions(inputDevice, [all, none, ...state.inputs], state.inputId);
  setOptions(outputDevice, [none, ...state.outputs], state.outputId);
  outputChannel.value = String(state.outputChannel);
  outputChannel.disabled = state.outputId === none.id;
  inputChannel.disabled = state.inputId === none.id;
  refreshKeyAddresses();
}

const midi = new WebMidi({ onNote: routeInput, onState: renderMidi });
enableMidi.addEventListener("click", () => midi.connect());
inputDevice.addEventListener("change", () => {
  const selection = inputChannel.value;
  midi.setInput(inputDevice.value, banks === 1 && selection !== anyChannel.id ? Number(selection) : null);
});
inputChannel.addEventListener("change", () => {
  // Remove all highlights from the old routing before reading the new channel.
  const affectedKeys = [...inboundSources.keys()];
  inboundSources.clear();
  affectedKeys.forEach(refreshKey);
  const selection = inputChannel.value;
  midi.setInput(inputDevice.value, banks === 1 && selection !== anyChannel.id ? Number(selection) : null);
  refreshKeyAddresses();
});
function updateOutput() {
  releaseLocalNotes();
  midi.setOutput(outputDevice.value, Number(outputChannel.value));
}
outputDevice.addEventListener("change", updateOutput);
outputChannel.addEventListener("change", updateOutput);

function play(source, key, velocity = 100) {
  if (localSources.get(source) === key) return;
  stop(source);
  if (!key) return;
  const count = localCounts.get(key) ?? 0;
  localSources.set(source, key);
  localCounts.set(key, count + 1);
  if (count === 0) midi.press(key.midiNote, velocity, channelOffset(key));
  refreshKey(key);
  showKey(key);
}

function stop(source) {
  const key = localSources.get(source);
  if (!key) return;
  localSources.delete(source);
  const count = localCounts.get(key) - 1;
  if (count > 0) {
    localCounts.set(key, count);
  } else {
    localCounts.delete(key);
    midi.release(key.midiNote, channelOffset(key));
  }
  refreshKey(key);
}

function releaseLocalNotes() {
  for (const source of localSources.keys()) stop(source);
}

document.querySelector("#release-all").addEventListener("click", () => {
  releaseLocalNotes();
  midi.panic();
  const affectedKeys = [...inboundSources.keys()];
  inboundSources.clear();
  affectedKeys.forEach(refreshKey);
});
window.addEventListener("blur", releaseLocalNotes);
window.addEventListener("pagehide", releaseLocalNotes);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseLocalNotes();
});

function openPanel(open, restoreFocus = false) {
  panel.hidden = !open;
  midiButton.setAttribute("aria-expanded", String(open));
  if (restoreFocus) midiButton.focus();
}
midiButton.addEventListener("click", () => openPanel(panel.hidden));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!panel.hidden) openPanel(false, true);
  else if (app.classList.contains("is-fullscreen")) exitFullscreen();
});
document.addEventListener("pointerdown", (event) => {
  if (!panel.hidden && !panel.contains(event.target) && !midiButton.contains(event.target)) openPanel(false);
}, true);

function setFullscreenView(active) {
  app.classList.toggle("is-fullscreen", active);
  fullscreenLabel.textContent = active ? "Exit fullscreen" : "Fullscreen";
  fullscreen.setAttribute("aria-pressed", String(active));
}

async function exitFullscreen() {
  setFullscreenView(false);
  if (document.fullscreenElement) await document.exitFullscreen();
}

fullscreen.setAttribute("aria-pressed", "false");
fullscreen.addEventListener("click", async () => {
  if (app.classList.contains("is-fullscreen")) {
    await exitFullscreen();
    return;
  }
  openPanel(false);
  setFullscreenView(true);
  if (!document.fullscreenEnabled) return;
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    // Embedded previews and some mobile browsers only support the in-page view.
  }
});
document.addEventListener("fullscreenchange", () => setFullscreenView(Boolean(document.fullscreenElement)));

function buttonLabel(label) {
  const wrapper = document.createElement("span");
  const match = label.match(/^(.+?)([⁺⁻][¹²])$/);
  if (!match || !match[2]) {
    wrapper.textContent = label;
    return wrapper;
  }
  const suffix = document.createElement("small");
  wrapper.textContent = match[1];
  suffix.textContent = match[2];
  wrapper.append(suffix);
  return wrapper;
}

const keysById = new Map(keys.map((key) => [key.id, key]));
const fragment = document.createDocumentFragment();
for (const key of keys) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "key";
  button.dataset.key = key.id;
  button.dataset.shape = key.shape;
  button.dataset.kind = key.kind;
  button.dataset.midiNote = key.midiNote;
  button.dataset.channelOffset = channelOffset(key);
  button.setAttribute("aria-label", key.label);
  button.setAttribute("aria-pressed", "false");
  button.tabIndex = buttons.size === 0 ? 0 : -1;
  button.append(buttonLabel(key.label));
  button.style.left = `${100 * key.x / width}%`;
  button.style.top = `${100 * key.y / height}%`;
  button.style.width = `${100 * key.width / width}%`;
  button.style.height = `${100 * key.height / height}%`;
  buttons.set(key, button);
  keysByAddress.set(address(channelOffset(key), key.midiNote), key);
  fragment.append(button);
}
keyboard.append(fragment);
refreshKeyAddresses();

function fitKeyboard() {
  const style = getComputedStyle(stage);
  const availableHeight = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const scale = Math.max(0, Math.min(stage.clientWidth / width, availableHeight / height));
  keyboard.style.width = `${width * scale}px`;
  keyboard.style.height = `${height * scale}px`;
  for (const [key, button] of buttons) {
    const isCircle = key.shape === "circle";
    const availableWidth = key.width * scale * (isCircle ? 0.83 : 0.9);
    const letters = key.label.replace(/[⁺⁻][¹²]$/, "");
    const textWidth = letters.length * 0.62 + (letters === key.label ? 0 : 0.95);
    const targetSize = scale * (isCircle ? 22 : 32);
    button.style.fontSize = `${Math.max(5.5, Math.min(20, targetSize, availableWidth / textWidth))}px`;
  }
}
new ResizeObserver(fitKeyboard).observe(stage);
fitKeyboard();

function keyAt(element) {
  return keysById.get(element?.closest(".key")?.dataset.key);
}

const activePointers = new Set();
keyboard.addEventListener("pointerdown", (event) => {
  const key = keyAt(event.target);
  if (!key || event.button !== 0) return;
  event.preventDefault();
  activePointers.add(event.pointerId);
  keyboard.setPointerCapture(event.pointerId);
  play(`pointer:${event.pointerId}`, key);
});
keyboard.addEventListener("pointermove", (event) => {
  if (!activePointers.has(event.pointerId)) return;
  play(`pointer:${event.pointerId}`, keyAt(document.elementFromPoint(event.clientX, event.clientY)));
});
function endPointer(event) {
  activePointers.delete(event.pointerId);
  stop(`pointer:${event.pointerId}`);
}
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) keyboard.addEventListener(type, endPointer);
keyboard.addEventListener("contextmenu", (event) => event.preventDefault());
keyboard.addEventListener("pointerover", (event) => {
  if (event.pointerType === "mouse") showKey(keyAt(event.target));
});
keyboard.addEventListener("pointerleave", () => showKey(null));
keyboard.addEventListener("focusin", (event) => showKey(keyAt(event.target)));
keyboard.addEventListener("focusout", () => {
  stop("keyboard");
  showKey(null);
});

const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
function nearestKey(key, [horizontal, vertical]) {
  let nearest = key;
  let distance = Infinity;
  const x = key.x + key.width / 2;
  const y = key.y + key.height / 2;
  for (const candidate of keys) {
    const dx = candidate.x + candidate.width / 2 - x;
    const dy = candidate.y + candidate.height / 2 - y;
    const along = dx * horizontal + dy * vertical;
    if (along <= 0) continue;
    const across = Math.abs(dx * vertical + dy * horizontal);
    const score = Math.hypot(along, 2 * across);
    if (score >= distance) continue;
    distance = score;
    nearest = candidate;
  }
  return nearest;
}

keyboard.addEventListener("keydown", (event) => {
  const key = keyAt(event.target);
  if (!key) return;
  const direction = directions[event.key];
  if (direction) {
    event.preventDefault();
    const next = buttons.get(nearestKey(key, direction));
    event.target.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (!event.repeat) play("keyboard", key);
  }
});
keyboard.addEventListener("keyup", (event) => {
  if (event.key !== " " && event.key !== "Enter") return;
  event.preventDefault();
  stop("keyboard");
});
