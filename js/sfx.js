/** 전투 효과음 — 메이플스토리 스타일 (J/K/L 구분) */
const SFX_VOL = 0.55;

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
    this.hitPitch = 0;
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

  /** J 연타 — 스윙 */
  playSwing(spaceType) {
    if (!this.ensure()) return;
    this.resume();
    const now = performance.now();
    if (now - this.lastSwing < 40) return;
    this.lastSwing = now;

    const when = this.t();
    const ranged = spaceType === "bolt" || spaceType === "shot" || spaceType === "zap";

    if (ranged) {
      this.mapleSwish(880, 520, 0.05, 0.09, when);
      this.tonePop(1040 + Math.random() * 60, 0.035, 0.07, "square", when + 0.02);
    } else if (spaceType === "bash") {
      this.mapleSwish(420, 160, 0.07, 0.13, when);
      this.thump(140, 0.12, 0.07, when + 0.03);
    } else if (spaceType === "slash") {
      this.mapleSwish(720, 280, 0.06, 0.11, when);
      this.tonePop(520, 0.04, 0.08, "triangle", when + 0.025);
      this.tonePop(780, 0.03, 0.05, "sine", when + 0.04);
    } else {
      this.mapleSwish(640, 220, 0.055, 0.1, when);
      this.tonePop(680 + Math.random() * 40, 0.038, 0.075, "triangle", when + 0.02);
    }
  }

  /** 타격 확정 — slot: j | k | l */
  playHit(slot = "j", big = false) {
    if (!this.ensure()) return;
    this.resume();
    const now = performance.now();
    const gap = slot === "j" ? 32 : slot === "k" ? 48 : 44;
    if (now - this.lastHit < gap) return;
    this.lastHit = now;

    this.hitPitch = (this.hitPitch + 1) % 5;
    const step = this.hitPitch * 18;
    const when = this.t();
    const vol = big ? 0.24 : slot === "k" ? 0.17 : slot === "l" ? 0.16 : 0.13;

    if (slot === "j") {
      this.thump(260 + step, vol, 0.055, when);
      this.tonePop(1180 + step * 2, 0.04, vol * 0.65, "square", when + 0.012);
      this.tonePop(640, 0.025, vol * 0.35, "sine", when + 0.008);
    } else if (slot === "k") {
      this.thump(200, vol * 1.05, 0.07, when);
      this.tonePop(720, 0.035, vol * 0.5, "triangle", when + 0.02);
      this.tonePop(960, 0.03, vol * 0.45, "square", when + 0.04);
      this.tonePop(1280, 0.025, vol * 0.35, "sine", when + 0.055);
    } else {
      this.thump(170, vol, 0.075, when);
      this.sweep(900, 420, 0.1, vol * 0.45, when, "triangle");
      this.tonePop(1520, 0.035, vol * 0.4, "sine", when + 0.03);
    }

    if (big) {
      this.tonePop(440, 0.08, vol * 0.55, "sine", when + 0.06);
      this.mapleSwish(380, 120, 0.08, vol * 0.35, when + 0.02);
    }
  }

  /** K / L 스킬 시전 */
  playSkill(kind = "primary") {
    if (!this.ensure()) return;
    this.resume();
    const when = this.t();

    if (kind === "secondary") {
      this.sweep(880, 320, 0.14, 0.13, when, "triangle");
      this.tonePop(620, 0.05, 0.1, "square", when + 0.04);
      this.tonePop(980, 0.04, 0.08, "sine", when + 0.07);
      this.mapleSwish(560, 180, 0.06, 0.09, when + 0.02);
    } else {
      this.sweep(320, 980, 0.16, 0.14, when, "sine");
      this.tonePop(840, 0.045, 0.11, "triangle", when + 0.05);
      this.tonePop(1120, 0.035, 0.09, "square", when + 0.08);
      this.thump(120, 0.09, 0.07, when + 0.03);
    }
  }

  playHurt() {
    if (!this.ensure()) return;
    this.resume();
    const now = performance.now();
    if (now - this.lastHurt < 120) return;
    this.lastHurt = now;
    const when = this.t();
    this.thump(95, 0.18, 0.09, when);
    this.sweep(380, 140, 0.14, 0.12, when, "sawtooth");
  }

  playKill() {
    if (!this.ensure()) return;
    this.resume();
    const when = this.t();
    this.tonePop(988, 0.06, 0.11, "square", when);
    this.tonePop(1318, 0.08, 0.1, "sine", when + 0.05);
    this.tonePop(784, 0.1, 0.08, "triangle", when + 0.1);
  }

  playClear() {
    if (!this.ensure()) return;
    this.resume();
    const when = this.t();
    this.sweep(440, 880, 0.22, 0.14, when, "sine");
    this.tonePop(660, 0.1, 0.1, "triangle", when + 0.08);
    this.tonePop(880, 0.12, 0.11, "square", when + 0.14);
    this.tonePop(1175, 0.16, 0.1, "sine", when + 0.22);
  }

  mapleSwish(from, to, dur, vol, when = this.t()) {
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(from, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, to), when + dur);
    filter.Q.value = 1.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.bus);
    src.start(when);
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
