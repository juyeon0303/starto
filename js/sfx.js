/** 전투 효과음 — Web Audio (별도 BGM 컨텍스트) */
const SFX_VOL = 0.52;

export function createGameSfx() {
  return new GameSfx();
}

class GameSfx {
  constructor() {
    this.ctx = null;
    this.bus = null;
    this.lastSwing = 0;
    this.lastHit = 0;
    this.lastHurt = 0;
  }

  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.bus = this.ctx.createGain();
    this.bus.gain.value = SFX_VOL;
    this.bus.connect(this.ctx.destination);
    return true;
  }

  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
  }

  t() {
    return this.ctx?.currentTime ?? 0;
  }

  playSwing(spaceType) {
    if (!this.ensure()) return;
    this.resume();
    const now = performance.now();
    if (now - this.lastSwing < 45) return;
    this.lastSwing = now;

    const ranged = spaceType === "bolt" || spaceType === "shot" || spaceType === "zap";
    if (ranged) this.tonePop(520 + Math.random() * 80, 0.045, 0.09, "sine");
    else if (spaceType === "bash") this.noiseSweep(220, 90, 0.1, 0.14);
    else this.noiseSweep(640, 180, 0.055, 0.1);
  }

  playHit(isSkill = false, big = false) {
    if (!this.ensure()) return;
    this.resume();
    const now = performance.now();
    const gap = isSkill ? 55 : 38;
    if (now - this.lastHit < gap) return;
    this.lastHit = now;

    const base = isSkill ? 145 : 195;
    const vol = big ? 0.22 : isSkill ? 0.16 : 0.11;
    this.thump(base, vol, isSkill ? 0.11 : 0.07);
    if (isSkill) this.tonePop(base * 1.6, 0.06, vol * 0.5, "triangle");
  }

  playSkill(kind = "primary") {
    if (!this.ensure()) return;
    this.resume();
    const when = this.t();
    const dur = kind === "secondary" ? 0.14 : 0.18;
    this.sweep(280, 920, dur, 0.12, when);
    this.thump(110, 0.1, 0.08, when + 0.04);
  }

  playHurt() {
    if (!this.ensure()) return;
    this.resume();
    const now = performance.now();
    if (now - this.lastHurt < 120) return;
    this.lastHurt = now;
    this.thump(85, 0.2, 0.1);
    this.sweep(420, 120, 0.16, 0.14, this.t(), "sawtooth");
  }

  playKill() {
    if (!this.ensure()) return;
    this.resume();
    this.tonePop(880, 0.08, 0.1, "sine");
    this.tonePop(660, 0.1, 0.08, "sine", this.t() + 0.05);
  }

  thump(freq, vol, dur, when = this.t()) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.35), when + dur);
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.02);
    osc.connect(gain);
    gain.connect(this.bus);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  tonePop(freq, dur, vol, type = "sine", when = this.t()) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(this.bus);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  noiseSweep(from, to, dur, vol, when = this.t()) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(from, when);
    filter.frequency.exponentialRampToValueAtTime(to, when + dur);
    filter.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.bus);
    src.start(when);
  }

  sweep(from, to, dur, vol, when = this.t(), type = "sine") {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(to, when + dur);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(vol, when + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(this.bus);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}
