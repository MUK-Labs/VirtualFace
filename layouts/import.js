const maxBytes = 1024 * 1024;
const maxKeys = 16 * 128;
const shapes = new Set(["rect", "circle"]);
const kinds = new Set(["base", "chromatic-up", "chromatic-down", "major-third", "minor-third", "septimal"]);
const finishes = new Set(["ivory", "ebony", "mahogany", "walnut", "boxwood"]);

function labelText(value, field, maximum) {
  const label = typeof value === "string" ? value.trim() : "";
  if (!label || label.length > maximum) {
    throw new Error(`${field} must be text between 1 and ${maximum} characters long.`);
  }
  return label;
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function fitsAxis(position, size, limit) {
  return inRange(position, 0, limit) && Number.isFinite(size) && size > 0
    && (position + size) / limit <= 1 + 2 * Number.EPSILON;
}

export function parseControllerLayout(text) {
  let definition;
  try {
    definition = JSON.parse(text);
  } catch {
    throw new Error("This file does not contain valid JSON.");
  }
  if (definition?.version !== 1) throw new Error("Set the controller file’s version to 1.");
  const { width, height } = definition;
  const name = labelText(definition.name, "The controller name", 100);
  if (!inRange(width, 1, 1e6) || !inRange(height, 1, 1e6)) {
    throw new Error("The layout width and height must be numbers between 1 and 1,000,000.");
  }
  if (!Array.isArray(definition.keys) || definition.keys.length < 1 || definition.keys.length > maxKeys) {
    throw new Error(`Include between 1 and ${maxKeys} keys in the keys array.`);
  }

  const addresses = new Set();
  const keys = definition.keys.map((key, index) => {
    const field = `Key ${index + 1}`;
    if (!key || typeof key !== "object" || Array.isArray(key)) throw new Error(`${field} must be a JSON object.`);
    const label = labelText(key.label, `${field} label`, 40);
    const { x, y, width: keyWidth, height: keyHeight, midiNote, channelOffset = 0 } = key;
    const { shape = "rect", kind = "base" } = key;
    const finish = key.finish === "" ? undefined : key.finish;
    if (!fitsAxis(x, keyWidth, width) || !fitsAxis(y, keyHeight, height)) {
      throw new Error(`${field} must have a positive width and height and fit within the layout.`);
    }
    if (!Number.isInteger(midiNote) || !inRange(midiNote, 0, 127)
      || !Number.isInteger(channelOffset) || !inRange(channelOffset, 0, 15)) {
      throw new Error(`${field} needs a MIDI note from 0 to 127 and a channel offset from 0 to 15.`);
    }
    const ratio = key.ratio === undefined ? 2 ** ((midiNote - 60) / 12) : key.ratio;
    if (!Number.isFinite(ratio) || ratio <= 0) throw new Error(`${field} pitch ratio must be a positive number.`);
    if (!shapes.has(shape) || !kinds.has(kind) || (finish !== undefined && !finishes.has(finish))) {
      throw new Error(`${field} uses an unknown shape, kind, or finish.`);
    }
    const address = channelOffset * 128 + midiNote;
    if (addresses.has(address)) throw new Error(`${field} repeats a MIDI note and channel offset already in use.`);
    addresses.add(address);
    return {
      id: `imported-${index + 1}`, label, x, y, width: keyWidth, height: keyHeight,
      midiNote, channelOffset, ratio, shape, kind, finish,
    };
  });
  return { name, width, height, keys };
}

export async function readControllerFile(file) {
  if (file.size > maxBytes) throw new Error("Controller files can be up to 1 MiB.");
  return parseControllerLayout(await file.text());
}

export async function readControllerUrl(value, signal) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a direct HTTPS link to the JSON file.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Enter a direct HTTPS link without an embedded username or password.");
  }

  let response;
  try {
    response = await fetch(url, { signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
  } catch {
    throw new Error("Could not read the link. The host must allow access from VirtualFace. You can also open the file from your device.");
  }
  if (!response.ok) throw new Error(`The file host returned HTTP ${response.status}. Check the link or open a local file.`);
  if (!response.body) throw new Error("The link returned an empty file.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("Controller files can be up to 1 MiB.");
      }
      text += decoder.decode(chunk, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return parseControllerLayout(text + decoder.decode());
}
