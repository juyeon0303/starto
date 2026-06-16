import {
  CHAMPIONS,
  ENEMIES,
  WAVE_COUNT,
  WAVE_EVENTS,
  compositionRoles,
  getScoutCounters,
  getWaveComposition,
  pickRandom,
  summarizeComposition,
} from "./data.js";
import {
  PAD,
  W,
  H,
  initVfx,
  updateVfx,
  renderFrame,
  spawnBurst,
  addShake,
  addFlash,
  addFloatText,
  addRing,
  addTrail,
  screenToWorld,
} from "./vfx.js";
import { mountSilhouette } from "./silhouettes.js";
import { createGameAudio } from "./audio.js";
import { updateEnemyFacing } from "./enemy-art.js";
import {
  addFx,
  playSpaceVfx,
  playPrimaryVfx,
  playSecondaryVfx,
  projKindFor,
  themeFor,
} from "./champ-vfx.js";

const SKILL_DMG = 3.8;
const SKILL2_DMG = 2.4;
/** J = 연타 평타. K/L만 쿨 있음. */
const BASIC_DMG = 1.05;
const MELEE_SLASH_RANGE = 78;
const MELEE_SLASH_ARC = 0.82;
const STAB_RANGE = 92;
const BASH_RADIUS = 58;
const KITE_START = 130;
const KITE_MAX_BOOST = 0.38;
const AUTO_ATTACK_ENABLED = false;
const SKILL_RING_LEN = 226;

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.state = "pick";
    this.wave = 0;
    this.event = null;
    this.champion = null;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.traps = [];
    this.particles = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.pendingComposition = null;
    this.scoutCounter = null;
    this.waveBuff = {};
    this.keys = {};
    this.mouse = { x: W / 2, y: H / 2 };
    this.invuln = 0;
    this.smokeTimer = 0;
    this.eventSkill = 1;
    this.eventDefense = 1;
    this.message = "";
    this.lastTime = 0;
    this.paused = false;
    this.audio = createGameAudio();
    initVfx(this);

    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        e.preventDefault();
        if (this.paused) this.resumeGame();
        else if (this.isRunActive()) this.pauseGame();
        return;
      }
      if (this.paused) return;

      this.keys[e.code] = true;
      if (this.state !== "combat") return;
      if (e.code === "KeyJ") {
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (e.code === "KeyK") {
        e.preventDefault();
        this.useSkill(1);
      }
      if (e.code === "KeyL") {
        e.preventDefault();
        this.useSkill(2);
      }
    });
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      const sx = ((e.clientX - r.left) / r.width) * W;
      const sy = ((e.clientY - r.top) / r.height) * H;
      const w = screenToWorld(sx, sy);
      this.mouse.x = w.x;
      this.mouse.y = w.y;
    });

    this.showWelcome();
    requestAnimationFrame((t) => this.loop(t));
  }

  setMenuMode(on) {
    document.body.classList.toggle("menu-open", on);
  }

  showWelcome() {
    this.state = "welcome";
    this.paused = false;
    this.setMenuMode(true);
    this.setCombatUiVisible(false);
    this.setRunControlsVisible(false);

    const wrap = document.createElement("div");
    wrap.className = "welcome-panel";

    const pitch = document.createElement("p");
    pitch.className = "welcome-pitch";
    pitch.textContent = "8웨이브 · 5~10분";

    const btn = document.createElement("button");
    btn.className = "btn-start";
    btn.textContent = "스타또!";
    btn.onclick = () => this.openChampionPick();

    wrap.append(pitch, btn);
    this.showOverlay(
      "링크 스타또",
      "",
      [wrap],
      "welcome"
    );
  }

  openChampionPick() {
    this.state = "pick";
    this.setMenuMode(true);
    this.setCombatUiVisible(false);
    const options = pickRandom(CHAMPIONS, 3);

    const grid = document.createElement("div");
    grid.className = "champ-grid";
    options.forEach((c) => {
      grid.appendChild(
        this.makeChampCard(c, () => this.startRun(c))
      );
    });

    this.showOverlay(
      "챔프 선택",
      "WASD 이동 · J 연타 · K / L 스킬",
      [grid],
      "champ"
    );
  }

  startRun(champ) {
    this.champion = { ...champ };
    this.wave = 0;
    this.paused = false;
    this.player = this.makePlayer(champ);
    initVfx(this);
    this.setupSkillUi(champ);
    this.setMenuMode(false);
    this.setRunControlsVisible(true);
    this.hideOverlay();
    this.audio.play();
    this.prepareWave();
  }

  isRunActive() {
    return this.state === "combat" || this.state === "scout";
  }

  setRunControlsVisible(show) {
    this.ui.runControls?.classList.toggle("hidden", !show);
  }

  pauseGame() {
    if (!this.isRunActive() || this.paused) return;
    this.paused = true;
    document.body.classList.add("game-paused");
    this.audio.pause();

    const wrap = document.createElement("div");
    wrap.className = "pause-actions";

    const resume = document.createElement("button");
    resume.className = "btn-start";
    resume.textContent = "계속하기";
    resume.onclick = () => this.resumeGame();

    const home = document.createElement("button");
    home.className = "run-btn run-btn-ghost pause-home-btn";
    home.textContent = "홈으로";
    home.onclick = () => this.exitToHome();

    wrap.append(resume, home);

    const desc =
      this.state === "combat"
        ? `웨이브 ${this.wave} · ${this.champion?.name || ""}`
        : "대응 선택 중";

    this.showOverlay("일시정지", desc, [wrap], "pause");
  }

  confirmExitToHome() {
    if (!this.isRunActive()) return;
    this.paused = true;
    document.body.classList.add("game-paused");
    this.audio.pause();

    const wrap = document.createElement("div");
    wrap.className = "pause-actions";

    const cancel = document.createElement("button");
    cancel.className = "run-btn run-btn-ghost pause-home-btn";
    cancel.textContent = "취소";
    cancel.onclick = () => this.resumeGame();

    const home = document.createElement("button");
    home.className = "btn-start";
    home.textContent = "홈으로";
    home.onclick = () => this.exitToHome();

    wrap.append(cancel, home);
    this.showOverlay("종료", "진행 중인 판을 끝내고 홈으로 돌아갑니다.", [wrap], "pause");
  }

  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    document.body.classList.remove("game-paused");
    this.hideOverlay();
    this.lastTime = performance.now();
    this.audio.resume();
    if (this.state === "scout") this.showScoutOverlay();
  }

  exitToHome() {
    this.paused = false;
    document.body.classList.remove("game-paused");
    this.audio.stop();
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.traps = [];
    this.spawnQueue = [];
    this.champion = null;
    this.player = null;
    this.wave = 0;
    this.hideOverlay();
    this.showWelcome();
  }

  setupSkillUi(champ) {
    const slots = this.ui.skillSlots;
    if (!slots) return;

    mountSilhouette(this.ui.champPortrait, champ.id, champ.glow || champ.color);

    const configs = [
      { name: champ.spaceName, desc: "", accent: "#ffd166", glow: "#ffe082" },
      { name: champ.skillName, desc: champ.skillDesc || "", accent: champ.color, glow: champ.glow },
      {
        name: champ.skill2Name,
        desc: champ.skill2Desc || "",
        accent: champ.glow || champ.color,
        glow: champ.color,
      },
    ];

    configs.forEach((cfg, i) => {
      const s = slots[i];
      if (!s) return;
      s.name.textContent = cfg.name;
      s.name.title = cfg.desc;
      s.icon.style.background = `linear-gradient(145deg, ${cfg.accent}, ${cfg.glow})`;
      s.icon.style.boxShadow = `0 0 18px ${cfg.glow}66`;
      mountSilhouette(s.sil, champ.id, "rgba(255,255,255,0.92)");
    });
  }

  setCombatUiVisible(show) {
    document.body.classList.toggle("combat-active", show);
    if (!this.ui.combatUi) return;
    this.ui.combatUi.classList.toggle("hidden", !show);
  }

  makePlayer(champ) {
    return {
      x: W / 2,
      y: H / 2,
      hp: champ.hp,
      maxHp: champ.hp,
      angle: 0,
      atkCd: 0,
      spaceSwing: 0,
      skillCd: 0,
      skill2Cd: 0,
      radius: 16,
      moveAngle: 0,
    };
  }

  prepareWave() {
    this.wave += 1;
    this.state = "scout";
    this.setCombatUiVisible(false);
    this.pendingComposition = getWaveComposition(this.wave);
    this.event = pickRandom(WAVE_EVENTS, 1)[0];
    this.eventSkill = this.event.id === "surge" ? 1.15 : 1;
    this.eventDefense = this.event.id === "iron" ? 0.88 : 1;
    this.eventFog = this.event.id === "fog" ? 0.9 : 1;
    this.scoutCounterOptions = getScoutCounters(this.pendingComposition);
    this.showScoutOverlay();
  }

  showScoutOverlay() {
    const roles = compositionRoles(this.pendingComposition);
    const counters = this.scoutCounterOptions || [];
    const summary = summarizeComposition(this.pendingComposition);

    const content = document.createElement("div");
    content.className = "scout-panel";

    const intel = document.createElement("div");
    intel.className = "scout-intel";
    intel.innerHTML = `
      <p><strong>웨이브 ${this.wave}</strong> · ${this.event.name} — ${this.event.desc}</p>
      <p class="squad-line">적 편성: ${summary}</p>
      <ul class="role-list">
        ${roles
          .map(
            (r) =>
              `<li><span class="dot" style="background:${r.color}"></span>${r.name} ×${r.count} <em>(${r.role})</em> — ${r.hint}</li>`
          )
          .join("")}
      </ul>
    `;
    content.appendChild(intel);

    const picks = document.createElement("div");
    picks.className = "scout-picks";
    counters.forEach((c) => {
      const btn = this.makePickBtn(c.name, c.desc, () => {
        this.scoutCounter = c;
        this.waveBuff = { ...c.fx };
        this.hideOverlay();
        this.beginCombat();
      }, "#00d4ff", "#ffd166");
      picks.appendChild(btn);
    });
    content.appendChild(picks);

    this.showOverlay("대응 선택", "다음 적 편성 확인. 하나만 고르면 바로 시작.", [content], "scout");
    this.message = `웨이브 ${this.wave} — 대응 고르기`;
    this.updateHud();
  }

  beginCombat() {
    this.state = "combat";
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.traps = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;

    let t = 0.4;
    this.pendingComposition.forEach((g) => {
      for (let i = 0; i < g.count; i++) {
        this.spawnQueue.push({ type: g.type, at: t, scale: g.scale });
        t += 0.4;
      }
    });

    this.message = `웨이브 ${this.wave} · ${this.scoutCounter?.name || ""}`;
    this.setCombatUiVisible(true);
    this.updateHud();
  }

  win() {
    this.state = "win";
    this.paused = false;
    document.body.classList.remove("game-paused");
    this.audio.stop();
    this.setMenuMode(true);
    this.setCombatUiVisible(false);
    this.setRunControlsVisible(false);
    this.showOverlay("클리어", `${WAVE_COUNT}웨이브 끝. 한 판 약 5~8분.`, [
      this.makePickBtn("다시 하기", "처음부터", () => {
        this.hideOverlay();
        this.showWelcome();
      }),
    ], "result");
  }

  lose() {
    this.state = "lose";
    this.paused = false;
    document.body.classList.remove("game-paused");
    this.audio.stop();
    this.setMenuMode(true);
    this.setCombatUiVisible(false);
    this.setRunControlsVisible(false);
    this.showOverlay("패배", `웨이브 ${this.wave}에서 함락.`, [
      this.makePickBtn("재도전", "처음부터", () => {
        this.hideOverlay();
        this.showWelcome();
      }),
    ], "result");
  }

  clampInArena(x, y, radius = 0) {
    const minX = PAD + radius;
    const maxX = W - PAD - radius;
    const minY = PAD + radius;
    const maxY = H - PAD - radius;
    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  }

  clampEnemy(e) {
    const c = this.clampInArena(e.x, e.y, e.radius);
    e.x = c.x;
    e.y = c.y;
  }

  spawnEnemy(type, scale) {
    const def = ENEMIES[type];
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) {
      x = PAD;
      y = PAD + Math.random() * (H - PAD * 2);
    } else if (edge === 1) {
      x = W - PAD;
      y = PAD + Math.random() * (H - PAD * 2);
    } else if (edge === 2) {
      x = PAD + Math.random() * (W - PAD * 2);
      y = PAD;
    } else {
      x = PAD + Math.random() * (W - PAD * 2);
      y = H - PAD;
    }

    let speed = def.speed;
    if (this.event?.id === "rage") speed *= 1.1;

    this.enemies.push({
      type,
      pattern: def.pattern,
      x,
      y,
      hp: def.hp * scale,
      maxHp: def.hp * scale,
      speed,
      damage: def.damage * (1 + (this.wave - 1) * 0.055),
      radius: def.radius,
      color: def.color,
      armor: def.armor || 0,
      atkCd: 1,
      stun: 0,
      state: "idle",
      stateT: 0,
      chargeAngle: 0,
      zoneCd: 2.5,
      shootCd: 1.2,
      flankSide: Math.random() > 0.5 ? 1 : -1,
      anim: Math.random() * Math.PI * 2,
      faceAngle: Math.random() * Math.PI * 2,
    });
    this.clampEnemy(this.enemies[this.enemies.length - 1]);
    addRing(this, x, y, def.glow || def.color, 50);
  }

  speedMult() {
    return 1 + (this.waveBuff.speedBonus || 0);
  }

  skillCdMult() {
    return 1 - (this.waveBuff.skillCdBonus || 0);
  }

  dmgVsEnemy(e, base) {
    let dmg = base;
    if (this.waveBuff.armorBonus && (e.type === "bulwark" || e.type === "boss")) {
      dmg *= 1 + this.waveBuff.armorBonus;
    }
    if (this.waveBuff.huntBonus && (e.type === "skirmisher" || e.type === "archer")) {
      dmg *= 1 + this.waveBuff.huntBonus;
    }
    if (e.armor) dmg *= 1 - e.armor;
    return dmg;
  }

  skillDamage(mult = 1) {
    return this.champion.damage * SKILL_DMG * mult * this.eventSkill * (1 + (this.waveBuff.skillBonus || 0));
  }

  skill2Damage() {
    return this.champion.damage * SKILL2_DMG * this.eventSkill * (1 + (this.waveBuff.skillBonus || 0));
  }

  nearestEnemy(maxDist = Infinity) {
    return this.nearestEnemyFrom(this.player?.x ?? W / 2, this.player?.y ?? H / 2, maxDist);
  }

  nearestEnemyFrom(x, y, maxDist = Infinity) {
    let best = null;
    let bestD = maxDist;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  aimAtNearestEnemy(maxDist = Infinity) {
    const target = this.nearestEnemy(maxDist);
    if (target && this.player) {
      this.player.angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      return target;
    }
    return null;
  }

  resolveSkillAim() {
    if (!this.aimAtNearestEnemy()) this.updateAim();
  }

  pushFriendlyProjectile(x, y, angle, speed, opts = {}) {
    const kind = opts.kind ?? projKindFor(this.champion, opts.slot ?? "space");
    this.projectiles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: opts.damage ?? 0,
      life: opts.life ?? 0.6,
      radius: opts.radius ?? 6,
      color: opts.color ?? themeFor(this.champion).glow,
      pierce: opts.pierce ?? false,
      friendly: true,
      homing: opts.homing !== false,
      homingTurn: opts.homingTurn ?? 22,
      maxTrackRange: opts.maxTrackRange ?? Infinity,
      kind,
    });
  }

  steerProjectile(pr, dt) {
    if (!pr.friendly || pr.homing === false) return;
    const maxR = pr.maxTrackRange ?? Infinity;
    const target = this.nearestEnemyFrom(pr.x, pr.y, maxR);
    if (!target) return;

    const speed = Math.hypot(pr.vx, pr.vy) || 1;
    const dx = target.x - pr.x;
    const dy = target.y - pr.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < 42) {
      pr.vx = (dx / dist) * speed;
      pr.vy = (dy / dist) * speed;
      return;
    }

    const cur = Math.atan2(pr.vy, pr.vx);
    const want = Math.atan2(dy, dx);
    const diff = normAngle(want - cur);
    const maxTurn = (pr.homingTurn ?? 22) * dt;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
    const ang = cur + turn;
    pr.vx = Math.cos(ang) * speed;
    pr.vy = Math.sin(ang) * speed;
  }

  damageEnemy(e, amount, isSkill = false) {
    const dmg = isSkill ? this.dmgVsEnemy(e, amount) : amount * (1 - (e.armor || 0) * 0.5);
    e.hp -= dmg;
    if (isSkill) {
      const th = themeFor(this.champion);
      addFloatText(this, e.x, e.y, String(Math.round(dmg)), th.glow, 13);
      spawnBurst(this, e.x, e.y, th.color, false);
    } else {
      spawnBurst(this, e.x, e.y, "#fff", false);
    }
  }

  dealDamage(amount, x, y, radius, knock = 0, isSkill = true) {
    this.enemies.forEach((e) => {
      if (Math.hypot(e.x - x, e.y - y) <= radius + e.radius) {
        this.damageEnemy(e, amount, isSkill);
        if (knock) {
          const a = Math.atan2(e.y - y, e.x - x);
          e.x += Math.cos(a) * knock;
          e.y += Math.sin(a) * knock;
          this.clampEnemy(e);
        }
      }
    });
  }

  autoAttack(dt) {
    const p = this.player;
    const c = this.champion;
    p.atkCd -= dt;
    if (p.atkCd > 0) return;

    const range = c.range * this.eventFog;
    const target = this.nearestEnemy(range + 15);
    if (!target) return;
    if (Math.hypot(target.x - p.x, target.y - p.y) > range) return;

    p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    const dmg = c.damage * 0.55;

    if (c.range >= 120) {
      this.projectiles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(p.angle) * 380,
        vy: Math.sin(p.angle) * 380,
        damage: dmg,
        life: 0.9,
        radius: 4,
        color: c.color,
        pierce: false,
        friendly: true,
      });
    } else {
      this.damageEnemy(target, dmg, false);
    }
    p.atkCd = 1 / (c.atkRate * 0.85);
  }

  spaceInterval() {
    const rate = this.champion?.spaceRate ?? 2.6;
    const rush = 1 + (this.waveBuff.skillCdBonus || 0) * 0.5;
    return 1 / (rate * rush);
  }

  useSkill(slot) {
    if (this.state !== "combat" || !this.player) return;
    const p = this.player;
    const c = this.champion;
    this.resolveSkillAim();

    if (slot === 0) {
      if (p.spaceSwing > 0) return;
      this.castSpace();
      p.spaceSwing = this.spaceInterval();
      addFlash(this, themeFor(c).accent, 0.1);
      this.flashSkillSlot(0);
    } else if (slot === 1) {
      if (p.skillCd > 0) return;
      this.castPrimary();
      p.skillCd = c.skillCd * this.skillCdMult();
      addFlash(this, themeFor(c).glow, 0.14);
      this.flashSkillSlot(1);
    } else {
      if (p.skill2Cd > 0) return;
      this.castSecondary();
      p.skill2Cd = c.skill2Cd * this.skillCdMult();
      addFlash(this, themeFor(c).color, 0.1);
      this.flashSkillSlot(2);
    }
  }

  updateAim() {
    const p = this.player;
    let mx = 0,
      my = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) my -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) my += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (mx || my) {
      p.moveAngle = Math.atan2(my, mx);
      p.angle = p.moveAngle;
    } else {
      p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    }
  }

  flashSkillSlot(i) {
    this.ui.skillSlots?.[i]?.root?.classList.add("just-used");
    setTimeout(() => this.ui.skillSlots?.[i]?.root?.classList.remove("just-used"), 120);
  }

  basicRange() {
    return (this.champion?.range ?? 60) * this.eventFog;
  }

  basicDamage(dist = 0) {
    let dmg = this.champion.damage * BASIC_DMG * this.eventSkill * (1 + (this.waveBuff.skillBonus || 0));
    const type = this.champion.spaceType;
    if (type === "bolt" || type === "shot" || type === "zap") {
      dmg *= this.rangedFalloff(dist);
    }
    return dmg;
  }

  rangedFalloff(dist, range = this.basicRange()) {
    if (dist <= range * 0.72) return 1;
    if (dist >= range) return 0.58;
    const t = (dist - range * 0.72) / (range * 0.28);
    return 1 - t * 0.42;
  }

  enemyChaseMul(e, p) {
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d <= KITE_START) return 1;
    return 1 + Math.min(KITE_MAX_BOOST, (d - KITE_START) / 320);
  }

  basicProjectileOpts(extra = {}) {
    const c = this.champion;
    const homing = c?.spaceHoming === true;
    return {
      homing,
      homingTurn: homing ? (c?.spaceHomingTurn ?? 14) : 0,
      maxTrackRange: this.basicRange() + 24,
      ...extra,
    };
  }

  castSpace() {
    const p = this.player;
    const c = this.champion;
    const th = themeFor(c);
    const maxR = this.basicRange();
    const near = this.nearestEnemy(maxR + 20);
    const nearDist = near ? Math.hypot(near.x - p.x, near.y - p.y) : maxR;
    const dmg = this.basicDamage(nearDist);
    const a = p.angle;

    switch (c.spaceType) {
      case "slash":
        this.enemies.forEach((e) => {
          const ea = Math.atan2(e.y - p.y, e.x - p.x);
          const diff = Math.abs(normAngle(ea - a));
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (diff < MELEE_SLASH_ARC && d < MELEE_SLASH_RANGE) {
            this.damageEnemy(e, dmg * (d < MELEE_SLASH_RANGE * 0.55 ? 1.08 : 1), true);
          }
        });
        addTrail(this, p.x, p.y, p.x + Math.cos(a) * 50, p.y + Math.sin(a) * 50, th.slash, 6);
        break;
      case "bolt": {
        if (!near || nearDist > maxR) break;
        this.pushFriendlyProjectile(
          p.x,
          p.y,
          a,
          620,
          this.basicProjectileOpts({
            slot: "space",
            damage: dmg,
            life: 0.5,
            radius: 8,
            color: th.glow,
          })
        );
        break;
      }
      case "stab": {
        const t = this.aimAtNearestEnemy(STAB_RANGE) || this.nearestEnemy(STAB_RANGE);
        if (t) this.damageEnemy(t, dmg * 1.4, true);
        else this.dealDamage(dmg, p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, 44, 0);
        addTrail(this, p.x, p.y, p.x + Math.cos(a) * 36, p.y + Math.sin(a) * 36, th.glow, 4);
        break;
      }
      case "bash":
        this.dealDamage(dmg, p.x, p.y, BASH_RADIUS, 26);
        break;
      case "shot": {
        if (!near || nearDist > maxR) break;
        this.pushFriendlyProjectile(
          p.x,
          p.y,
          a,
          660,
          this.basicProjectileOpts({
            slot: "space",
            damage: dmg,
            life: 0.58,
            radius: 5,
            color: th.accent,
          })
        );
        break;
      }
      case "zap": {
        const t = this.nearestEnemy(maxR);
        if (!t) break;
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d > maxR) break;
        this.damageEnemy(t, dmg * (c.spaceZapMult ?? 1), true);
        addTrail(this, p.x, p.y, t.x, t.y, th.glow, 5);
        break;
      }
    }

    playSpaceVfx(this, c, p, a);
    spawnBurst(this, p.x + Math.cos(a) * 28, p.y + Math.sin(a) * 28, th.accent, false);
    addShake(this, c.id === "guardian" ? 5 : 3);
    addRing(this, p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, th.glow, 38);
  }

  castPrimary() {
    const p = this.player;
    const c = this.champion;
    const th = themeFor(c);
    const dmg = this.skillDamage();

    switch (c.skillType) {
      case "dash": {
        const dist = 130 * this.eventFog;
        const nx = clamp(p.x + Math.cos(p.angle) * dist, PAD, W - PAD);
        const ny = clamp(p.y + Math.sin(p.angle) * dist, PAD, H - PAD);
        addTrail(this, p.x, p.y, nx, ny, th.slash, 8);
        this.enemies.forEach((e) => {
          if (distToSegment(e.x, e.y, p.x, p.y, nx, ny) < e.radius + 28) {
            this.damageEnemy(e, dmg, true);
          }
        });
        p.x = nx;
        p.y = ny;
        spawnBurst(this, p.x, p.y, th.glow, true);
        addShake(this, 5);
        playPrimaryVfx(this, c, p, { nx, ny });
        break;
      }
      case "nova":
        this.dealDamage(dmg, p.x, p.y, 120 * this.eventFog, 35);
        spawnBurst(this, p.x, p.y, th.glow, true);
        addShake(this, 6);
        addFlash(this, th.color, 0.28);
        playPrimaryVfx(this, c, p);
        break;
      case "blink": {
        const t = this.nearestEnemy(300);
        if (t) {
          playPrimaryVfx(this, c, p);
          p.x = t.x + (p.x - t.x) * 0.2;
          p.y = t.y + (p.y - t.y) * 0.2;
          this.damageEnemy(t, dmg * 1.3, true);
          spawnBurst(this, p.x, p.y, th.glow, true);
        }
        break;
      }
      case "slam":
        this.dealDamage(dmg, p.x, p.y, 95, 28);
        this.enemies.forEach((e) => {
          if (Math.hypot(e.x - p.x, e.y - p.y) < 95) e.stun = 1.1;
        });
        this.invuln = 1.5;
        spawnBurst(this, p.x, p.y, th.glow, true);
        addShake(this, 8);
        playPrimaryVfx(this, c, p);
        break;
      case "pierce":
        this.pushFriendlyProjectile(p.x, p.y, p.angle, 540, {
          slot: "primary",
          damage: dmg,
          life: 1.2,
          radius: 7,
          color: th.accent,
          pierce: true,
        });
        break;
      case "chain": {
        let cur = this.nearestEnemy(9999);
        let lx = p.x,
          ly = p.y;
        for (let i = 0; i < 4 && cur; i++) {
          addFx(this, {
            kind: "lightning",
            x1: lx,
            y1: ly,
            x2: cur.x,
            y2: cur.y,
            jx: (Math.random() - 0.5) * 22,
            jy: (Math.random() - 0.5) * 22,
            color: th.glow,
            maxT: 0.3,
          });
          this.damageEnemy(cur, dmg * (1 - i * 0.1), true);
          this.particles.push({ x: cur.x, y: cur.y, t: 0.28, color: th.glow });
          lx = cur.x;
          ly = cur.y;
          cur = this.enemies
            .filter((e) => e.hp > 0 && Math.hypot(e.x - lx, e.y - ly) < 170)
            .sort((a, b) => Math.hypot(a.x - lx, a.y - ly) - Math.hypot(b.x - lx, b.y - ly))[0];
        }
        addShake(this, 4);
        break;
      }
    }
  }

  castSecondary() {
    const p = this.player;
    const c = this.champion;
    const th = themeFor(c);
    const dmg = this.skill2Damage();
    const a = p.angle;

    switch (c.skill2Type) {
      case "arc":
        this.enemies.forEach((e) => {
          const ea = Math.atan2(e.y - p.y, e.x - p.x);
          let diff = Math.abs(normAngle(ea - a));
          if (diff < 0.9 && Math.hypot(e.x - p.x, e.y - p.y) < 90) this.damageEnemy(e, dmg, true);
        });
        this.burst(p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, th.slash);
        playSecondaryVfx(this, c, p, a);
        addShake(this, 5);
        break;
      case "bolt":
        this.pushFriendlyProjectile(p.x, p.y, a, 620, {
          slot: "secondary",
          damage: dmg * 1.2,
          life: 1,
          radius: 8,
          color: th.glow,
        });
        break;
      case "smoke":
        this.invuln = 0.65;
        this.smokeTimer = 0.75;
        p.x = clamp(p.x + Math.cos(a) * 72, PAD, W - PAD);
        p.y = clamp(p.y + Math.sin(a) * 72, PAD, H - PAD);
        spawnBurst(this, p.x, p.y, "#546e7a", true);
        addRing(this, p.x, p.y, th.glow, 95);
        addFloatText(this, p.x, p.y - 24, "무적", th.glow, 16);
        addFlash(this, th.color, 0.18);
        playSecondaryVfx(this, c, p, a);
        break;
      case "taunt":
        this.enemies.forEach((e) => {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < 200 && d > 1) {
            e.x += ((p.x - e.x) / d) * 55;
            e.y += ((p.y - e.y) / d) * 55;
            this.clampEnemy(e);
          }
        });
        playSecondaryVfx(this, c, p, a);
        addRing(this, p.x, p.y, th.glow, 110);
        break;
      case "trap":
        this.traps.push({ x: p.x, y: p.y, r: 70, t: 5, slow: 0.35 });
        playSecondaryVfx(this, c, p, a);
        break;
      case "field":
        this.zones.push({
          x: p.x + Math.cos(a) * 90,
          y: p.y + Math.sin(a) * 90,
          r: 55,
          t: 2.5,
          tick: 0.35,
          friendly: true,
          damage: dmg * 0.45,
        });
        playSecondaryVfx(this, c, p, a);
        break;
    }
  }

  burst(x, y, color, big = false) {
    spawnBurst(this, x, y, color, big);
  }

  hurtPlayer(amount, source = "melee") {
    const p = this.player;
    if (this.invuln > 0) return;

    if (source === "proj" && this.waveBuff.projReduce) amount *= 1 - this.waveBuff.projReduce;
    if (source === "zone" && this.waveBuff.zoneReduce) amount *= 1 - this.waveBuff.zoneReduce;
    if ((source === "charge" || source === "boss") && this.waveBuff.chargeReduce) {
      amount *= 1 - this.waveBuff.chargeReduce;
    }

    p.hp -= amount * this.eventDefense;
    this.invuln = Math.max(this.invuln, 0.45);
    addShake(this, source === "boss" ? 8 : 4);
    addFlash(this, "#ff2d55", 0.4);
    if (p.hp <= 0) this.lose();
  }

  updateEnemyAI(e, dt) {
    const p = this.player;
    if (e.stun > 0) {
      e.stun -= dt;
      this.clampEnemy(e);
      return;
    }

    const chase = this.enemyChaseMul(e, p);

    for (const trap of this.traps) {
      if (Math.hypot(e.x - trap.x, e.y - trap.y) < trap.r) e.slowMul = trap.slow;
    }
    const slow = e.slowMul || 1;
    e.slowMul = 1;

    switch (e.pattern) {
      case "charge":
        this.aiCharge(e, p, dt, slow, chase);
        break;
      case "ranged":
        this.aiRanged(e, p, dt, slow, chase);
        break;
      case "tank":
        this.aiChase(e, p, dt, slow * 0.95, chase);
        break;
      case "flank":
        this.aiFlank(e, p, dt, slow, chase);
        break;
      case "zone":
        this.aiCaster(e, p, dt, slow, chase);
        break;
      case "boss":
        this.aiBoss(e, p, dt, slow, chase);
        break;
      default:
        this.aiChase(e, p, dt, slow, chase);
    }

    this.clampEnemy(e);
  }

  aiChase(e, p, dt, slow = 1, chase = 1) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    e.x += Math.cos(a) * e.speed * slow * chase * dt;
    e.y += Math.sin(a) * e.speed * slow * chase * dt;
    this.tryMelee(e, p, dt);
  }

  aiCharge(e, p, dt, slow, chase = 1) {
    if (e.state === "idle") {
      this.aiChase(e, p, dt, slow * 0.7, chase);
      e.stateT += dt;
      if (e.stateT > 1.35 && Math.hypot(p.x - e.x, p.y - e.y) < 260) {
        e.state = "windup";
        e.stateT = 0;
        e.chargeAngle = Math.atan2(p.y - e.y, p.x - e.x);
      }
    } else if (e.state === "windup") {
      e.stateT += dt;
      if (e.stateT > 0.85) {
        e.state = "dash";
        e.stateT = 0;
      }
    } else if (e.state === "dash") {
      e.x += Math.cos(e.chargeAngle) * e.speed * 2.8 * dt;
      e.y += Math.sin(e.chargeAngle) * e.speed * 2.8 * dt;
      e.stateT += dt;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius + 4) {
        this.hurtPlayer(e.damage * 1.1, "charge");
      }
      if (e.stateT > 0.45) {
        e.state = "idle";
        e.stateT = 0;
      }
    }
  }

  aiRanged(e, p, dt, slow, chase = 1) {
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    if (d > 210) {
      e.x += Math.cos(a) * e.speed * slow * chase * dt;
      e.y += Math.sin(a) * e.speed * slow * chase * dt;
    } else if (d < 150) {
      e.x -= Math.cos(a) * e.speed * slow * chase * dt;
      e.y -= Math.sin(a) * e.speed * slow * chase * dt;
    }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 320) {
      e.shootCd = 1.8;
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      this.enemyProjectiles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(ang) * 280,
        vy: Math.sin(ang) * 280,
        damage: e.damage * 0.85,
        life: 2.2,
        radius: 6,
        color: "#ffcc80",
      });
    }
    if (d < e.radius + p.radius + 2) this.hurtPlayer(e.damage * 0.6, "melee");
  }

  aiFlank(e, p, dt, slow, chase = 1) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const perp = a + (Math.PI / 2) * e.flankSide;
    e.x += (Math.cos(a) * 0.55 + Math.cos(perp) * 0.85) * e.speed * slow * chase * dt;
    e.y += (Math.sin(a) * 0.55 + Math.sin(perp) * 0.85) * e.speed * slow * chase * dt;
    this.tryMelee(e, p, dt);
  }

  aiCaster(e, p, dt, slow, chase = 1) {
    this.aiChase(e, p, dt, slow * 0.55, chase);
    e.zoneCd -= dt;
    if (e.zoneCd <= 0) {
      e.zoneCd = 3.2;
      this.zones.push({
        x: p.x,
        y: p.y,
        r: 48,
        t: 1.6,
        telegraph: 1.1,
        damage: e.damage,
        friendly: false,
      });
    }
  }

  aiBoss(e, p, dt, slow, chase = 1) {
    e.stateT += dt;
    if (e.state === "idle") {
      this.aiChase(e, p, dt, slow * 0.5, chase);
    }
    if (e.state === "idle" && e.stateT > 2.5) {
      e.state = "windup";
      e.stateT = 0;
      e.chargeAngle = Math.atan2(p.y - e.y, p.x - e.x);
    } else if (e.state === "windup") {
      e.stateT += dt;
      if (e.stateT > 0.8) {
        e.state = "dash";
        e.stateT = 0;
      }
    } else if (e.state === "dash") {
      e.x += Math.cos(e.chargeAngle) * e.speed * 2.2 * dt;
      e.y += Math.sin(e.chargeAngle) * e.speed * 2.2 * dt;
      e.stateT += dt;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius + 6) {
        this.hurtPlayer(e.damage * 1.1, "boss");
      }
      if (e.stateT > 0.55) {
        e.state = "idle";
        e.stateT = 0;
        this.zones.push({
          x: p.x,
          y: p.y,
          r: 65,
          t: 1.8,
          telegraph: 1.2,
          damage: e.damage * 0.9,
          friendly: false,
        });
      }
    } else {
      this.aiChase(e, p, dt, slow * 0.75, chase);
    }
  }

  tryMelee(e, p, dt) {
    if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
      e.atkCd -= dt;
      if (e.atkCd <= 0) {
        this.hurtPlayer(e.damage, "melee");
        e.atkCd = 0.75;
      }
    }
  }

  updateCombat(dt) {
    const p = this.player;
    if (!p) return;

    let mx = 0,
      my = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) my -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) my += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      p.moveAngle = Math.atan2(my, mx);
      p.x = clamp(p.x + (mx / len) * this.champion.speed * this.speedMult() * dt, PAD + p.radius, W - PAD - p.radius);
      p.y = clamp(p.y + (my / len) * this.champion.speed * this.speedMult() * dt, PAD + p.radius, H - PAD - p.radius);
    }

    p.angle = mx || my ? p.moveAngle : Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    if (this.enemies.length) this.aimAtNearestEnemy(this.basicRange() + 40);
    if (p.spaceSwing > 0) p.spaceSwing -= dt;
    if (this.keys.KeyJ && p.spaceSwing <= 0) this.useSkill(0);
    if (p.skillCd > 0) p.skillCd -= dt;
    if (p.skill2Cd > 0) p.skill2Cd -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.smokeTimer > 0) this.smokeTimer -= dt;

    if (AUTO_ATTACK_ENABLED) this.autoAttack(dt);

    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.spawnTimer) {
      const job = this.spawnQueue.shift();
      this.spawnEnemy(job.type, job.scale);
    }
    this.spawnTimer += dt;

    this.projectiles = this.projectiles.filter((pr) => {
      pr.life -= dt;
      this.steerProjectile(pr, dt);
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.life <= 0) return false;
      for (const e of this.enemies) {
        if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.radius + pr.radius) {
          this.damageEnemy(e, pr.damage, pr.friendly);
          if (!pr.pierce) return false;
        }
      }
      return true;
    });

    this.enemyProjectiles = this.enemyProjectiles.filter((pr) => {
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.life <= 0 || pr.x < PAD || pr.x > W - PAD || pr.y < PAD || pr.y > H - PAD) return false;
      if (Math.hypot(pr.x - p.x, pr.y - p.y) < pr.radius + p.radius) {
        this.hurtPlayer(pr.damage, "proj");
        return false;
      }
      return true;
    });

    this.zones = this.zones.filter((z) => {
      z.t -= dt;
      if (z.telegraph) z.telegraph -= dt;
      if (z.friendly && z.tick) {
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.35;
          this.enemies.forEach((e) => {
            if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.radius) {
              this.damageEnemy(e, z.damage, true);
            }
          });
        }
      }
      if (!z.friendly && z.telegraph <= 0) {
        if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.radius) {
          this.hurtPlayer(z.damage, "zone");
        }
      }
      return z.t > 0;
    });

    this.traps = this.traps.filter((t) => {
      t.t -= dt;
      return t.t > 0;
    });

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) {
        const def = ENEMIES[e.type];
        spawnBurst(this, e.x, e.y, def?.glow || e.color, e.type === "boss");
        if (e.type === "boss") addShake(this, 6);
        this.enemies.splice(i, 1);
        continue;
      }
      updateEnemyFacing(e, p);
      this.updateEnemyAI(e, dt);
    }

    this.particles = this.particles.filter((fx) => {
      fx.t -= dt;
      return fx.t > 0;
    });

    if (!this.spawnQueue.length && this.enemies.length === 0 && this.spawnTimer > 1.5) {
      if (this.wave >= WAVE_COUNT) this.win();
      else this.prepareWave();
    }
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    updateVfx(this, this.paused ? 0 : dt);
    if (this.state === "combat" && !this.paused) this.updateCombat(dt);
    if (this.state === "combat" && !this.paused) this.updateHud();
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  draw() {
    renderFrame(this, this.ctx);
  }

  updateHud() {
    this.ui.waveNum.textContent = `${Math.max(this.wave, 1)} / ${WAVE_COUNT}`;

    const parts = [];
    if (this.pendingComposition && this.state === "scout") {
      parts.push(`다음 ${summarizeComposition(this.pendingComposition)}`);
    }
    if (this.event) parts.push(this.event.name);
    if (this.scoutCounter && this.state === "combat") {
      parts.push(`대응 ${this.scoutCounter.name}`);
    }
    if (this.champion && this.state === "combat") {
      parts.push(this.champion.name);
    }
    this.ui.waveInfo.textContent = parts.join(" · ") || "—";

    if (!this.player || this.state !== "combat") return;

    const p = this.player;
    const c = this.champion;
    const hpPct = p.hp / p.maxHp;

    if (this.ui.combatHpFill) {
      this.ui.combatHpFill.style.width = `${hpPct * 100}%`;
    }
    if (this.ui.combatHpText) {
      this.ui.combatHpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    }

    const max1 = c ? c.skillCd * this.skillCdMult() : 1;
    const max2 = c ? c.skill2Cd * this.skillCdMult() : 1;
    this.updateSpaceSlot(this.ui.skillSlots?.[0]);
    this.updateSkillSlot(this.ui.skillSlots?.[1], p.skillCd, max1);
    this.updateSkillSlot(this.ui.skillSlots?.[2], p.skill2Cd, max2);
  }

  updateSpaceSlot(slot) {
    if (!slot?.root) return;
    slot.root.classList.add("ready");
    slot.root.classList.remove("on-cd");
    if (slot.sweep) slot.sweep.style.opacity = "0";
    if (slot.ring) slot.ring.style.opacity = "0";
    if (slot.num) slot.num.textContent = "";
  }

  updateSkillSlot(slot, cd, maxCd) {
    if (!slot?.root) return;
    const ready = cd <= 0.05;
    const pct = ready ? 0 : Math.min(1, cd / maxCd);

    slot.root.classList.toggle("ready", ready);
    slot.root.classList.toggle("on-cd", !ready);

    if (slot.sweep) {
      slot.sweep.style.setProperty("--cd-pct", String(pct));
      slot.sweep.style.opacity = ready ? "0" : "1";
    }

    if (slot.ring) {
      slot.ring.style.strokeDashoffset = String(SKILL_RING_LEN * pct);
      slot.ring.style.opacity = ready ? "0" : "1";
    }

    if (slot.num) {
      if (ready) {
        slot.num.textContent = "✓";
        slot.num.style.fontSize = "1.6rem";
        slot.num.style.color = "#69f0ae";
      } else {
        slot.num.style.fontSize = "1.45rem";
        slot.num.style.color = "#fff";
        if (cd >= 1) {
          slot.num.textContent = Math.ceil(cd).toString();
        } else {
          slot.num.textContent = cd.toFixed(1);
        }
      }
    }
  }

  makeChampCard(champ, fn) {
    const btn = document.createElement("button");
    btn.className = "champ-card";
    btn.style.setProperty("--champ-color", champ.color);
    btn.style.setProperty("--champ-glow", champ.glow || champ.color);

    const art = document.createElement("div");
    art.className = "champ-card-art";
    mountSilhouette(art, champ.id, champ.glow || champ.color);

    const name = document.createElement("strong");
    name.className = "champ-card-name";
    name.textContent = champ.name;

    const skills = document.createElement("ul");
    skills.className = "champ-card-skills";
    skills.innerHTML = `
      <li><kbd>J</kbd><span>${champ.spaceName}</span></li>
      <li><kbd>K</kbd><span>${champ.skillName}</span></li>
      <li><kbd>L</kbd><span>${champ.skill2Name}<small class="skill-hint">${champ.skill2Desc || ""}</small></span></li>
    `;

    btn.append(art, name, skills);
    btn.onclick = fn;
    return btn;
  }

  makePickBtn(title, desc, fn, accent = "#00d4ff", glow = "#00d4ff", champId = null) {
    const btn = document.createElement("button");
    btn.className = "pick-btn";
    btn.style.setProperty("--pick-accent", accent);
    btn.style.setProperty("--pick-glow", glow);
    if (champId) {
      const sil = document.createElement("div");
      sil.className = "pick-silhouette";
      mountSilhouette(sil, champId, accent);
      btn.appendChild(sil);
    }
    const body = document.createElement("div");
    body.className = "pick-btn-body";
    body.innerHTML = `<strong>${title}</strong><span>${desc}</span>`;
    btn.appendChild(body);
    btn.onclick = fn;
    return btn;
  }

  showOverlay(title, desc, buttons, mode = "default") {
    this.ui.overlay.classList.remove("hidden");
    this.ui.overlay.dataset.mode = mode;
    this.ui.overlayTitle.textContent = title;
    this.ui.overlayDesc.textContent = desc;
    this.ui.overlayDesc.hidden = !desc;
    this.ui.overlayContent.innerHTML = "";
    buttons.forEach((b) => this.ui.overlayContent.appendChild(b));
  }

  hideOverlay() {
    this.ui.overlay.classList.add("hidden");
    this.ui.overlay.dataset.mode = "";
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return Math.hypot(px - nx, py - ny);
}
