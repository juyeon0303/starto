/** 전투 BGM — Swordland 계열 보스전 오케스트라 (MP3 우선) */
const BGM_CANDIDATES = [
  "assets/audio/swordland.mp3",
  "assets/audio/sao-battle.mp3",
];
const BGM_VOLUME = 0.44;

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

  /** 스타버스트/최종보스전 느낌 — 느린 현·타이мпani·상승 멜로디 */
  startFallback() {
    if (this.fallbackNodes) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    const master = this.ctx.createGain();
    master.gain.value = BGM_VOLUME;
    master.connect(this.ctx.destination);

    const reverb = this.ctx.createBiquadFilter();
    reverb.type = "lowpass";
    reverb.frequency.value = 2800;
    reverb.connect(master);

    const padRoot = 146.83;
    const motif = [293.66, 349.23, 392, 440, 392, 349.23, 329.63, 293.66];
    const beat = 60 / 76;
    let step = 0;
    let nextAt = this.ctx.currentTime + 0.08;

    this.playStringPad(reverb, padRoot, this.ctx.currentTime, 9999);

    const schedule = () => {
      if (!this.fallbackNodes || !this.wanted) return;
      while (nextAt < this.ctx.currentTime + 0.35) {
        if (step % 8 === 0) this.playTimpani(reverb, nextAt);
        if (step % 4 === 0) this.playLowBrass(reverb, padRoot * 1.5, nextAt, beat * 3.2);
        if (step % 2 === 0) {
          const n = motif[Math.floor(step / 2) % motif.length];
          this.playStringLead(reverb, n, nextAt, beat * 1.6);
        }
        if (step % 16 === 12) this.playChoirHit(reverb, [392, 493.88, 587.33], nextAt);
        step += 1;
        nextAt += beat;
      }
      this.fallbackTimer = setTimeout(schedule, 100);
    };

    this.fallbackNodes = { master, reverb };
    this.active = true;
    schedule();
  }

  playStringPad(dest, root, when, dur) {
    [1, 1.25, 1.5, 2].forEach((mul, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = root * mul;
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 4.5 + i * 0.3;
      lfoGain.gain.value = 1.2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.028 - i * 0.004, when + 1.2);
      gain.gain.setValueAtTime(0.022 - i * 0.003, when + dur - 0.5);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(when);
      lfo.start(when);
      osc.stop(when + dur);
      lfo.stop(when + dur);
    });
  }

  playStringLead(dest, freq, when, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, when);
    filter.frequency.linearRampToValueAtTime(2400, when + dur * 0.4);
    filter.frequency.linearRampToValueAtTime(700, when + dur);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.09, when + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  playLowBrass(dest, freq, when, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.055, when + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur);
  }

  playTimpani(dest, when) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.35);
    gain.gain.setValueAtTime(0.35, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.6);
  }

  playChoirHit(dest, freqs, when) {
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.04 - i * 0.008, when + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 1.8);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 2);
    });
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
