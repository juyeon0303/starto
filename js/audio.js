/** 전투 BGM — CC0 battle-loop.mp3 우선, 없으면 긴장감 Web Audio 폴백 */
const BGM_CANDIDATES = [
  "assets/audio/battle-loop.mp3",
  "assets/audio/swordland.mp3",
  "assets/audio/sao-battle.mp3",
];
const BGM_VOLUME = 0.5;

export function createGameAudio() {
  return new GameAudio();
}

class GameAudio {
  constructor() {
    this.el = null;
    this.ctx = null;
    this.fallbackNodes = null;
    this.useFallback = false;
    this.active = false;
    this.wanted = false;
    this.fallbackTimer = null;
    this.candidateIndex = 0;

    this.loadNextCandidate();
  }

  loadNextCandidate() {
    if (this.candidateIndex >= BGM_CANDIDATES.length) {
      this.useFallback = true;
      this.el = null;
      return;
    }
    const src = BGM_CANDIDATES[this.candidateIndex++];
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = BGM_VOLUME;
    audio.addEventListener(
      "error",
      () => {
        if (this.el === audio) this.loadNextCandidate();
      },
      { once: true }
    );
    this.el = audio;
  }

  async play() {
    this.wanted = true;
    if (this.active) return;

    if (!this.useFallback && this.el) {
      try {
        this.el.currentTime = 0;
        await this.el.play();
        this.active = true;
        return;
      } catch {
        this.useFallback = true;
      }
    }

    this.startFallback();
  }

  pause() {
    if (!this.active) return;
    if (this.fallbackNodes) {
      this.ctx?.suspend();
    } else {
      this.el?.pause();
    }
  }

  resume() {
    if (!this.wanted || !this.active) return;
    if (this.fallbackNodes) {
      this.ctx?.resume();
    } else {
      this.el?.play().catch(() => {});
    }
  }

  stop() {
    this.wanted = false;
    this.active = false;
    if (this.el) {
      this.el.pause();
      this.el.currentTime = 0;
    }
    this.stopFallback();
  }

  /** 긴장감 — 빠른 펄스 베이스 + 단조 아르페지오 + 타격 */
  startFallback() {
    if (this.fallbackNodes) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    const master = this.ctx.createGain();
    master.gain.value = BGM_VOLUME;
    master.connect(this.ctx.destination);

    const bus = this.ctx.createBiquadFilter();
    bus.type = "lowpass";
    bus.frequency.value = 4200;
    bus.connect(master);

    const beat = 60 / 132;
    const arp = [220, 261.63, 311.13, 349.23, 415.3, 349.23, 293.66, 246.94];
    let step = 0;
    let nextAt = this.ctx.currentTime + 0.05;

    this.startTensionDrone(bus, this.ctx.currentTime);

    const schedule = () => {
      if (!this.fallbackNodes || !this.wanted) return;
      while (nextAt < this.ctx.currentTime + 0.3) {
        if (step % 2 === 0) this.playPulseKick(bus, nextAt);
        if (step % 4 === 2) this.playSnare(bus, nextAt);
        if (step % 2 === 1) {
          this.playArp(bus, arp[(step / 2) % arp.length], nextAt, beat * 0.9);
        }
        if (step % 8 === 0) this.playStab(bus, [174.61, 207.65, 261.63], nextAt);
        if (step % 16 === 12) this.playRiser(bus, nextAt, beat * 4);
        step += 1;
        nextAt += beat * 0.5;
      }
      this.fallbackTimer = setTimeout(schedule, 70);
    };

    this.fallbackNodes = { master, bus };
    this.active = true;
    schedule();
  }

  startTensionDrone(dest, when) {
    [1, 1.5, 2].forEach((mul, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 110 * mul;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 280 + i * 40;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.035 - i * 0.008, when + 1.5);
      gain.gain.setValueAtTime(0.028 - i * 0.006, when + 8000);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 9000);
    });
  }

  playPulseKick(dest, when) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(120, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.1);
    gain.gain.setValueAtTime(0.38, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.14);
  }

  playSnare(dest, when) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.07, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    src.connect(gain);
    gain.connect(dest);
    src.start(when);
  }

  playArp(dest, freq, when, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq * 2;
    filter.Q.value = 8;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.07, when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  playStab(dest, freqs, when) {
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.06 - i * 0.012, when + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.6);
    });
  }

  playRiser(dest, when, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, when);
    osc.frequency.exponentialRampToValueAtTime(520, when + dur);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.05, when + dur * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  stopFallback() {
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
    this.fallbackTimer = null;
    this.fallbackNodes = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
