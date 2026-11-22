const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;

function listPorts(ports) {
  return [...ports.values()]
    .filter((port) => port.state === "connected")
    .map((port) => ({ id: port.id, name: port.name || "Unnamed MIDI device" }));
}

function isChannel(channel) {
  return Number.isInteger(channel) && channel >= 1 && channel <= 16;
}

function isDataByte(byte) {
  return Number.isInteger(byte) && byte >= 0 && byte <= 127;
}

export class WebMidi {
  #onNote;
  #onState;
  #onOutputChange;
  #access = null;
  #status = "idle";
  #error = null;
  #inputId = "all";
  #inputChannel = null;
  #outputId = "none";
  #outputChannel = 1;
  #inputPorts = new Map();
  #outputPort = null;
  #sentNotes = new Map();

  constructor({ onNote = () => {}, onState = () => {}, onOutputChange = () => {} } = {}) {
    this.#onNote = onNote;
    this.#onState = onState;
    this.#onOutputChange = onOutputChange;
  }

  async connect() {
    if (this.#access) return true;
    if (this.#status === "connecting") return false;

    const browser = globalThis.navigator;
    if (typeof browser?.requestMIDIAccess !== "function") {
      this.#status = "unavailable";
      this.#error = globalThis.isSecureContext === false
        ? "Web MIDI requires HTTPS or localhost."
        : "Web MIDI is unavailable in this browser.";
      this.#publishState();
      return false;
    }

    this.#status = "connecting";
    this.#error = null;
    this.#publishState();

    try {
      this.#access = await browser.requestMIDIAccess({ sysex: false });
    } catch (error) {
      this.#status = "error";
      this.#error = error?.message || "MIDI access was denied.";
      this.#publishState();
      return false;
    }

    this.#status = "connected";
    this.#access.onstatechange = () => this.#refreshPorts();
    this.#refreshPorts();
    return true;
  }

  setInput(id, channel = null) {
    if (channel !== null && !isChannel(channel)) return;
    if (id === this.#inputId && channel === this.#inputChannel) return;

    for (const [port, notes] of this.#inputPorts) {
      this.#clearInputNotes(port, notes);
    }
    this.#inputId = id;
    this.#inputChannel = channel;
    this.#refreshPorts();
  }

  setOutput(id, channel = 1) {
    if (!isChannel(channel)) return;
    if (id === this.#outputId && channel === this.#outputChannel) return;

    this.#clearOutputNotes();
    this.#outputId = id;
    this.#outputChannel = channel;
    this.#error = null;
    this.#refreshPorts();
  }

  press(note, velocity = 100, channelOffset = 0) {
    if (!isDataByte(note) || !isDataByte(velocity) || velocity === 0) return false;
    if (!Number.isInteger(channelOffset) || channelOffset < 0 || channelOffset > 15) {
      return false;
    }

    const channel = (this.#outputChannel - 1 + channelOffset) % 16;
    const key = channel * 128 + note;
    if (this.#sentNotes.has(key)) return true;
    if (!this.#send([NOTE_ON | channel, note, velocity])) return false;

    this.#sentNotes.set(key, [NOTE_OFF | channel, note, 0]);
    return true;
  }

  release(note, channelOffset = 0) {
    if (!isDataByte(note)) return false;
    if (!Number.isInteger(channelOffset) || channelOffset < 0 || channelOffset > 15) {
      return false;
    }

    const channel = (this.#outputChannel - 1 + channelOffset) % 16;
    const key = channel * 128 + note;
    const message = this.#sentNotes.get(key);
    if (!message) return false;

    this.#sentNotes.delete(key);
    return this.#send(message);
  }

  sendMessage(message) {
    return this.#send(message);
  }

  panic() {
    this.#clearOutputNotes();
    for (const [port, notes] of this.#inputPorts) {
      this.#clearInputNotes(port, notes);
    }
  }

  #publishState() {
    this.#onState({
      status: this.#status,
      error: this.#error,
      inputs: this.#access ? listPorts(this.#access.inputs) : [],
      outputs: this.#access ? listPorts(this.#access.outputs) : [],
      inputId: this.#inputId,
      inputChannel: this.#inputChannel,
      outputId: this.#outputId,
      outputChannel: this.#outputChannel,
    });
  }

  #refreshPorts() {
    if (!this.#access) {
      this.#publishState();
      return;
    }

    const { inputs, outputs } = this.#access;
    const activeInputs = new Set([...inputs.values()].filter((port) => (
      port.state === "connected" && (this.#inputId === "all" || port.id === this.#inputId)
    )));
    if (this.#inputId !== "all" && activeInputs.size === 0) this.#inputId = "none";

    for (const [port, notes] of this.#inputPorts) {
      if (activeInputs.has(port)) continue;
      port.onmidimessage = null;
      this.#clearInputNotes(port, notes);
      this.#inputPorts.delete(port);
    }
    for (const port of activeInputs) {
      if (this.#inputPorts.has(port)) continue;
      const notes = new Map();
      this.#inputPorts.set(port, notes);
      port.onmidimessage = ({ data }) => this.#receive(port, notes, data);
    }

    const output = outputs.get(this.#outputId);
    const activeOutput = output?.state === "connected" ? output : null;
    if (this.#outputPort !== activeOutput) {
      this.#onOutputChange();
      this.#clearOutputNotes();
      this.#outputPort = activeOutput;
    }
    if (!activeOutput) this.#outputId = "none";

    this.#publishState();
  }

  #receive(port, notes, data) {
    if (data.length < 3 || port.state !== "connected") return;

    const [status, note, velocity] = data;
    const channel = (status & 0x0f) + 1;
    if (this.#inputChannel !== null && this.#inputChannel !== channel) return;

    const message = status & 0xf0;
    if (message === CONTROL_CHANGE && (note === 120 || (note >= 123 && note <= 127))) {
      this.#clearInputNotes(port, notes, channel);
      return;
    }
    if (message !== NOTE_ON && message !== NOTE_OFF) return;

    const key = (channel - 1) * 128 + note;
    const count = notes.get(key) || 0;
    if (message === NOTE_ON && velocity > 0) {
      notes.set(key, count + 1);
      this.#emitNote(port, channel, note, velocity, true);
    } else if (count === 1) {
      notes.delete(key);
      this.#emitNote(port, channel, note, velocity, false);
    } else if (count > 1) {
      notes.set(key, count - 1);
    }
  }

  #emitNote(port, channel, note, velocity, on) {
    this.#onNote({
      note, velocity, on, channel, portId: port.id,
      source: JSON.stringify([port.id, channel]),
    });
  }

  #clearInputNotes(port, notes, onlyChannel = null) {
    for (const key of notes.keys()) {
      const channel = Math.floor(key / 128) + 1;
      if (onlyChannel !== null && onlyChannel !== channel) continue;
      notes.delete(key);
      this.#emitNote(port, channel, key % 128, 0, false);
    }
  }

  #clearOutputNotes() {
    for (const message of this.#sentNotes.values()) this.#send(message);
    this.#sentNotes.clear();
  }

  #send(message) {
    if (this.#outputPort?.state !== "connected") return false;

    try {
      this.#outputPort.send(message);
      if (this.#error) {
        this.#error = null;
        this.#publishState();
      }
      return true;
    } catch (error) {
      this.#error = error?.message || "The MIDI output could not send a message.";
      this.#publishState();
      return false;
    }
  }
}
