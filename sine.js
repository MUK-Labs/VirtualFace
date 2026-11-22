const MAX_HELD_VOICES = 16;
const MAX_SOUNDING_VOICES = 32;
const PEAK_GAIN = 0.025;
const ATTACK = 0.012;
const RELEASE = 0.065;

export class SineSynth {
  #AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  #context = null;
  #enabled = true;
  #heldVoices = new Map();
  #soundingVoices = new Set();

  get supported() {
    return typeof this.#AudioContext === "function";
  }

  setEnabled(enabled) {
    this.#enabled = Boolean(enabled);
    if (!this.#enabled) this.panic();
  }

  unlock() {
    if (!this.supported || !this.#enabled) return false;
    try {
      this.#context ??= new this.#AudioContext();
      if (this.#context.state !== "running") {
        this.#context.resume().catch(() => {
          // A later user gesture can try again.
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  press(id, frequency, velocity = 100) {
    if (!Number.isFinite(frequency) || frequency <= 0 || frequency > 20000) return false;
    if (!Number.isFinite(velocity) || velocity <= 0) return false;
    if (this.#heldVoices.has(id)) return true;
    if (!this.unlock()) return false;

    if (this.#heldVoices.size >= MAX_HELD_VOICES) {
      this.release(this.#heldVoices.keys().next().value);
    }
    if (this.#soundingVoices.size >= MAX_SOUNDING_VOICES) {
      const oldestTail = [...this.#soundingVoices].find((voice) => voice.releasing);
      oldestTail.oscillator.stop();
      this.#disconnect(oldestTail);
    }

    const { currentTime: start, destination } = this.#context;
    const oscillator = this.#context.createOscillator();
    const envelope = this.#context.createGain();
    const peak = PEAK_GAIN * Math.min(1, velocity / 127);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(peak, start + ATTACK);
    oscillator.connect(envelope);
    envelope.connect(destination);

    const voice = { oscillator, envelope, start, peak, releasing: false };
    oscillator.onended = () => this.#disconnect(voice);
    this.#heldVoices.set(id, voice);
    this.#soundingVoices.add(voice);
    oscillator.start(start);
    return true;
  }

  release(id) {
    const voice = this.#heldVoices.get(id);
    if (!voice) return;
    this.#heldVoices.delete(id);
    voice.releasing = true;

    const now = this.#context.currentTime;
    const level = voice.peak * Math.min(1, Math.max(0, (now - voice.start) / ATTACK));
    const { gain } = voice.envelope;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(level, now);
    gain.linearRampToValueAtTime(0, now + RELEASE);
    voice.oscillator.stop(now + RELEASE);
  }

  panic() {
    for (const id of this.#heldVoices.keys()) this.release(id);
  }

  #disconnect(voice) {
    if (!this.#soundingVoices.delete(voice)) return;
    voice.oscillator.disconnect();
    voice.envelope.disconnect();
  }
}
