const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const PITCH_BEND = 0xe0;
const BEND_CENTER = 8192;
const GM_PERCUSSION_CHANNEL = 10;

function channelOrder(baseChannel, singleChannel) {
  if (singleChannel) return [baseChannel - 1];
  return Array.from({ length: 16 }, (_, index) => (baseChannel - 1 + index) % 16)
    .filter((channel) => channel !== GM_PERCUSSION_CHANNEL - 1);
}

function bendMessage(channel, bend) {
  return [PITCH_BEND | channel, bend & 0x7f, bend >> 7];
}

function noteAndBend(pitch, range) {
  if (!Number.isFinite(pitch)) return null;
  const note = Math.max(0, Math.min(127, Math.round(pitch)));
  const amount = (pitch - note) / range;
  if (Math.abs(amount) > 1) return null;
  const bend = BEND_CENTER + Math.round(amount * (amount > 0 ? BEND_CENTER - 1 : BEND_CENTER));
  return { note, bend };
}

export class TunedMidi {
  #send;
  #onVoiceLimit;
  #range = 2;
  #baseChannel = 1;
  #singleChannel = false;
  #channels = channelOrder(1, false);
  #nextChannel = 0;
  #voices = new Map();
  #bentChannels = new Set();

  constructor({ send, onVoiceLimit = () => {} }) {
    this.#send = send;
    this.#onVoiceLimit = onVoiceLimit;
  }

  configure({
    bendRange = this.#range,
    baseChannel = this.#baseChannel,
    singleChannel = this.#singleChannel,
  } = {}) {
    if (!Number.isFinite(bendRange) || bendRange < 0.5 || bendRange > 96) return false;
    if (!Number.isInteger(baseChannel) || baseChannel < 1 || baseChannel > 16) return false;
    if (this.#range === bendRange && this.#baseChannel === baseChannel && this.#singleChannel === singleChannel) {
      return true;
    }
    this.panic();
    this.#range = bendRange;
    this.#baseChannel = baseChannel;
    this.#singleChannel = singleChannel;
    this.#channels = channelOrder(baseChannel, singleChannel);
    return true;
  }

  press(id, pitch, velocity = 100) {
    if (this.#voices.has(id)) return true;
    if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) return false;
    const target = noteAndBend(pitch, this.#range);
    if (!target) return false;

    const index = this.#freeChannelIndex();
    if (index === -1) {
      this.#onVoiceLimit();
      return false;
    }

    const channel = this.#channels[index];
    const { note, bend } = target;
    if (!this.#send(bendMessage(channel, bend))) return false;
    this.#bentChannels.add(channel);
    if (!this.#send([NOTE_ON | channel, note, velocity])) return false;
    this.#voices.set(id, { channel, note });
    this.#nextChannel = (index + 1) % this.#channels.length;
    return true;
  }

  release(id) {
    const voice = this.#voices.get(id);
    if (!voice) return false;
    // Keep the bend in place during the receiver's release envelope.
    if (!this.#send([NOTE_OFF | voice.channel, voice.note, 0])) return false;
    this.#voices.delete(id);
    return true;
  }

  panic() {
    for (const voice of this.#voices.values()) this.#send([NOTE_OFF | voice.channel, voice.note, 0]);
    for (const channel of this.#bentChannels) this.#send(bendMessage(channel, BEND_CENTER));
    this.#voices.clear();
    this.#bentChannels.clear();
    this.#nextChannel = 0;
  }

  #freeChannelIndex() {
    const busy = new Set([...this.#voices.values()].map(({ channel }) => channel));
    // Rotate through spare channels to leave release tails at their own tuning.
    for (let step = 0; step < this.#channels.length; step += 1) {
      const index = (this.#nextChannel + step) % this.#channels.length;
      if (!busy.has(this.#channels[index])) return index;
    }
    return -1;
  }
}
