import {
  AUGMENT_TIER_LABEL,
  CHAMPIONS,
  DIFFICULTY,
  ENEMIES,
  WAVE_EVENTS,
  formatAugmentStats,
  getScoutAugments,
  getWaveComposition,
  isAugmentRecommended,
  mergeAugmentFx,
  pickRandom,
} from "./data.js";
import {
  loadLeaderboard,
  saveScore,
  getBestScore,
  renderLeaderboardTable,
} from "./leaderboard.js";
import {
  ARCADE_DURATION,
  COMBO_MILESTONE,
  createScoreState,
  formatScore,
  formatTime,
  registerKill,
  registerWaveClear,
  tickCombo,
  timeUrgency,
} from "./score.js";
import {
  PAD,
  W,
  H,
  initVfx,
  updateVfx,
  clearTransientVfx,
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
import { createGameSfx } from "./sfx.js";
import { updateEnemyFacing } from "./enemy-art.js";
import {
  addFx,
  playSpaceVfx,
  playPrimaryVfx,
  playSecondaryVfx,
  projKindFor,
  themeFor,
} from "./champ-vfx.js";
import {
  ambientPickupCount,
  createBuffPickup,
  createHealPickup,
  formatTempBuffs,
  healAmountForWave,
  lootDropChance,
  mergeCombatFx,
  mergeTempFx,
  rollLootKind,
} from "./loot.js";

const SKILL_DMG = 3.8;
const SKILL2_DMG = 2.4;
/** J = 연타 평타. K/L만 쿨 있음. */
const BASIC_DMG = 1.05;
const MELEE_SLASH_RANGE = 64;
const SLASH_AOE_DMG = 0.88;
/** 픽셀 단위 관대 판정 — 링에 닿아 보이는데 빗나가는 체감 완화 */
const MELEE_REACH_LEEWAY = 8;
const STAB_RANGE = 92;
const BASH_RADIUS = 58;
const KITE_START = 195;
const KITE_MAX_BOOST = 0.28;
const AUTO_ATTACK_ENABLED = false;
const SKILL_RING_LEN = 226;
const ZAP_REACH_BONUS = 62;
const RANGED_LEASH = 58;
const SIM_STEP = 1 / 60;
const MAX_SIM_STEPS = 4;

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
    this.runAugments = [];
    this.scoutAugmentOptions = null;
    this.waveBuff = {};
    this.waveTempBuff = {};
    this.pickups = [];
    this._combatFxMerged = null;
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
    this.sfx = createGameSfx();
    this.dpr = 1;
    this.accumulator = 0;
    this.lastZapTarget = null;
    this.lastAttackSlot = "j";
    this.hudCache = {};
    this.scoreState = createScoreState();
    this.timeLeft = ARCADE_DURATION;
    this.scorePopTimer = 0;
    this.setupCanvas();
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

  setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    pitch.textContent = "10분 · 점수 올리기 · 최고 기록 경신";

    const best = getBestScore();
    const bestLine = document.createElement("p");
    bestLine.className = "welcome-best";
    bestLine.innerHTML = best > 0
      ? `최고 기록 <strong>${formatScore(best)}</strong> pt`
      : "첫 기록을 남겨보세요";

    const btn = document.createElement("button");
    btn.className = "btn-start";
    btn.textContent = "스타또!";
    btn.onclick = () => this.openChampionPick();

    const lbPanel = document.createElement("div");
    lbPanel.className = "lb-panel";
    lbPanel.innerHTML = `
      <p class="lb-title">TOP ${10} 랭킹</p>
      ${renderLeaderboardTable(loadLeaderboard(), { limit: 5 })}
    `;

    wrap.append(pitch, bestLine, btn, lbPanel);
    this.showOverlay("링크 스타또", "처치 · 콤보 · 웨이브 클리어로 점수를 쌓으세요.", [wrap], "welcome");
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
    this.runAugments = [];
    this.waveBuff = {};
    this.waveTempBuff = {};
    this.pickups = [];
    this.lastWaveClearHeal = 0;
    this.scoreState = createScoreState();
    this.timeLeft = ARCADE_DURATION;
    this.scorePopTimer = 0;
    this.invalidateCombatFx();
    this.player = this.makePlayer(champ);
    initVfx(this);
    this.setupSkillUi(champ);
    this.setMenuMode(false);
    this.setRunControlsVisible(true);
    this.hideOverlay();
    this.sfx.ensure();
    this.sfx.resume();
    this.audio.play();
    this.startNextWave(false);
  }

  isRunActive() {
    return this.state === "combat";
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
        ? `${formatTime(this.timeLeft)} · ${formatScore(this.scoreState?.total ?? 0)} pt`
        : "준비 중";

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
      if (s.desc) {
        s.desc.textContent = i === 0 ? "" : cfg.desc;
        s.desc.title = cfg.desc;
      }
      if (s.range) {
        s.range.textContent = i === 0 ? s.range.textContent || "사거리 —" : "";
      }
      s.icon.style.background = `linear-gradient(145deg, ${cfg.accent}, ${cfg.glow})`;
      s.icon.style.boxShadow = `0 0 18px ${cfg.glow}66`;
      mountSilhouette(s.sil, champ.id, "rgba(255,255,255,0.92)");
    });
  }

  setCombatUiVisible(show) {
    document.body.classList.toggle("combat-active", show);
    if (!this.ui.combatUi) return;
    this.ui.combatUi.classList.toggle("hidden", !show);
    this.ui.augmentStrip?.classList.toggle("hidden", !show);
  }

  recomputeWaveBuff() {
    this.waveBuff = mergeAugmentFx(this.runAugments);
    this.invalidateCombatFx();
  }

  invalidateCombatFx() {
    this._combatFxMerged = null;
  }

  combatFx() {
    if (!this._combatFxMerged) {
      this._combatFxMerged = mergeCombatFx(this.waveBuff, this.waveTempBuff);
    }
    return this._combatFxMerged;
  }

  randomArenaPoint(margin = 48) {
    return this.clampInArena(
      PAD + margin + Math.random() * (W - PAD * 2 - margin * 2),
      PAD + margin + Math.random() * (H - PAD * 2 - margin * 2),
      14
    );
  }

  spawnPickup(x, y, data) {
    const pos = this.clampInArena(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 16, 14);
    this.pickups.push({
      x: pos.x,
      y: pos.y,
      radius: 14,
      life: 11 + this.wave * 0.55,
      bob: Math.random() * Math.PI * 2,
      ...data,
    });
  }

  spawnAmbientPickups() {
    const maxHp = this.player?.maxHp ?? 100;
    const n = ambientPickupCount(this.wave);
    for (let i = 0; i < n; i++) {
      const pt = this.randomArenaPoint();
      const kind = this.wave <= 3 || Math.random() < 0.55 ? "heal" : "buff";
      const data =
        kind === "heal" ? createHealPickup(this.wave, maxHp) : createBuffPickup(this.wave);
      this.spawnPickup(pt.x, pt.y, data);
    }
  }

  tryDropLoot(e) {
    const drops = e.type === "boss" ? 2 : 1;
    for (let i = 0; i < drops; i++) {
      if (i === 0 && Math.random() > lootDropChance(this.wave, e.type)) continue;
      if (i === 1 && e.type !== "boss") continue;

      const kind =
        e.type === "boss"
          ? i === 0
            ? "heal"
            : "buff"
          : rollLootKind(this.wave, e.type);
      const maxHp = this.player?.maxHp ?? 100;
      const data =
        kind === "heal" ? createHealPickup(this.wave, maxHp) : createBuffPickup(this.wave);
      const ang = (Math.PI * 2 * i) / drops + Math.random() * 0.6;
      const dist = e.type === "boss" ? 28 : 12;
      this.spawnPickup(e.x + Math.cos(ang) * dist, e.y + Math.sin(ang) * dist, data);
    }
  }

  collectPickup(p) {
    if (!this.player) return;
    const pl = this.player;

    if (p.kind === "heal") {
      const heal = p.amount ?? healAmountForWave(this.wave, pl.maxHp);
      pl.hp = Math.min(pl.maxHp, pl.hp + heal);
      if (pl.hpTrail != null) pl.hpTrail = pl.hp / pl.maxHp;
      addFloatText(this, pl.x, pl.y - 20, `+${heal} HP`, "#69f0ae", 15);
      addRing(this, pl.x, pl.y, "#69f0ae", 55);
    } else {
      this.waveTempBuff = mergeTempFx(this.waveTempBuff, p.fx);
      this.invalidateCombatFx();
      addFloatText(this, pl.x, pl.y - 20, p.name, p.color || "#ffd166", 16);
      addRing(this, pl.x, pl.y, p.glow || p.color, 65);
      addFlash(this, p.glow || p.color, 0.12);
    }
    spawnBurst(this, p.x, p.y, p.glow || p.color, false);
    this.sfx.playSkill("secondary");
  }

  updatePickups(dt) {
    const p = this.player;
    if (!p) return;

    this.pickups = this.pickups.filter((pick) => {
      pick.life -= dt;
      pick.bob += dt * 4;
      if (pick.life <= 0) return false;
      if (Math.hypot(pick.x - p.x, pick.y - p.y) < pick.radius + p.radius + 6) {
        this.collectPickup(pick);
        return false;
      }
      return true;
    });
  }

  applyAugmentInstant(aug) {
    const bonus = aug.fx?.hpBonus;
    if (!bonus || !this.player) return;
    this.player.maxHp += bonus;
    this.player.hp += bonus;
    if (this.player.hpTrail != null) {
      this.player.hpTrail = this.player.hp / this.player.maxHp;
    }
  }

  /** 웨이브 클리어 시 체력 일부 회복 — 누적 피해 완화 */
  applyWaveClearHeal() {
    const p = this.player;
    if (!p || p.hp <= 0) return 0;
    const missing = p.maxHp - p.hp;
    if (missing <= 0) return 0;
    const pct = Math.max(0.07, 0.13 - (this.wave - 1) * 0.006);
    const flat = 6 + this.wave * 1.5;
    const amount = Math.min(missing, Math.round(p.maxHp * pct + flat));
    if (amount <= 0) return 0;
    p.hp += amount;
    if (p.hpTrail != null) p.hpTrail = p.hp / p.maxHp;
    return amount;
  }

  pickAugment(aug) {
    if (!aug || this.runAugments.some((a) => a.id === aug.id)) return;
    this.runAugments.push(aug);
    this.applyAugmentInstant(aug);
    this.recomputeWaveBuff();
    this.sfx.playSkill("primary");
    addFlash(this, aug.tier === "prismatic" ? "#e040fb" : "#ffd166", 0.2);
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
      hpTrail: 1,
    };
  }

  autoGrantAugment() {
    if (!this.pendingComposition) return null;
    const enemyTypes = new Set(this.pendingComposition.map((g) => g.type));
    const options = getScoutAugments(
      this.pendingComposition,
      this.runAugments.map((a) => a.id),
      this.wave
    );
    if (!options.length) return null;
    const aug =
      options.find((a) => isAugmentRecommended(a, enemyTypes)) ||
      pickRandom(options, 1)[0];
    if (!aug || this.runAugments.some((a) => a.id === aug.id)) return null;
    this.pickAugment(aug);
    return aug;
  }

  startNextWave(fromClear = false) {
    if (fromClear && this.timeLeft <= 0) {
      this.endRun("time");
      return;
    }

    this.wave += 1;
    clearTransientVfx(this);
    this.invuln = 0;
    this.smokeTimer = 0;
    this.paused = false;
    document.body.classList.remove("game-paused");

    if (fromClear) {
      this.lastWaveClearHeal = this.applyWaveClearHeal();
      const wavePts = registerWaveClear(this.scoreState, this.wave);
      const p = this.player;
      if (p) {
        addFloatText(this, p.x, p.y - 24, `웨이브 ${this.wave}! +${formatScore(wavePts)}`, "#69f0ae", 18);
        addFlash(this, "#69f0ae", 0.22);
        addShake(this, 5);
        this.scorePopTimer = 0.35;
      }
    } else {
      this.lastWaveClearHeal = 0;
    }

    this.pendingComposition = getWaveComposition(this.wave);
    this.event = pickRandom(WAVE_EVENTS, 1)[0];
    this.eventSkill = this.event.id === "surge" ? 1.15 : 1;
    this.eventDefense = this.event.id === "iron" ? 0.88 : 1;
    this.eventFog = this.event.id === "fog" ? 0.94 : 1;

    const aug = this.autoGrantAugment();
    if (aug && this.player) {
      addFloatText(
        this,
        this.player.x,
        this.player.y - 40,
        `${aug.icon} ${aug.name}`,
        aug.tier === "prismatic" ? "#e040fb" : "#ffd166",
        15
      );
    }

    this.beginCombat();
  }

  beginCombat() {
    this.hideOverlay();
    this.paused = false;
    document.body.classList.remove("game-paused");
    this.state = "combat";
    clearTransientVfx(this);
    this.invuln = 0;
    this.smokeTimer = 0;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.zones = [];
    this.traps = [];
    this.pickups = [];
    this.waveTempBuff = {};
    this.invalidateCombatFx();
    this.spawnQueue = [];
    this.spawnTimer = 0;

    let t = 0.22;
    this.pendingComposition.forEach((g) => {
      for (let i = 0; i < g.count; i++) {
        this.spawnQueue.push({ type: g.type, at: t, scale: g.scale });
        t += Math.max(0.18, 0.28 - this.wave * 0.008);
      }
    });

    this.message = `W${this.wave} · ${formatScore(this.scoreState.total)} pt · ${formatTime(this.timeLeft)}`;
    this.spawnAmbientPickups();
    this.setCombatUiVisible(true);
    this.updateHud();
  }

  endRun(reason = "death") {
    const survived = reason === "time";
    this.state = survived ? "timeup" : "lose";
    this.paused = false;
    document.body.classList.remove("game-paused");
    this.audio.stop();
    if (survived) this.sfx.playClear();
    this.setMenuMode(true);
    this.setCombatUiVisible(false);
    this.setRunControlsVisible(false);

    const entry = {
      score: this.scoreState?.total ?? 0,
      kills: this.scoreState?.kills ?? 0,
      waves: this.wave,
      maxCombo: this.scoreState?.maxCombo ?? 0,
      champId: this.champion?.id ?? "",
      champName: this.champion?.name ?? "—",
    };
    const { board, rank, isNewBest } = saveScore(entry);

    const hero = document.createElement("div");
    hero.className = "result-score-hero";
    hero.innerHTML = `
      <span class="big-score">${formatScore(entry.score)}</span>
      <span class="rank-line${isNewBest ? " new-best" : ""}">
        ${isNewBest ? "🎉 신기록!" : `#${rank} · TOP ${board.length}`}
      </span>
    `;

    const stats = document.createElement("div");
    stats.className = "result-stats";
    stats.innerHTML = `
      <div class="result-stat">처치<strong>${entry.kills}</strong></div>
      <div class="result-stat">웨이브<strong>${entry.waves}</strong></div>
      <div class="result-stat">최대 콤보<strong>×${entry.maxCombo}</strong></div>
      <div class="result-stat">챔프<strong>${entry.champName}</strong></div>
    `;

    const lbPanel = document.createElement("div");
    lbPanel.className = "lb-panel";
    lbPanel.innerHTML = `
      <p class="lb-title">랭킹</p>
      ${renderLeaderboardTable(board, { limit: 5 })}
    `;

    const again = this.makePickBtn(
      "다시 하기",
      survived ? "10분 다시 도전" : "재도전",
      () => {
        this.hideOverlay();
        this.showWelcome();
      }
    );

    this.showOverlay(
      survived ? "타임!" : "함락",
      survived
        ? "10분 생존 · 점수가 기록되었습니다."
        : `${formatScore(entry.score)} pt · 웨이브 ${this.wave}에서 전멸`,
      [hero, stats, lbPanel, again],
      survived ? "result-win" : "result"
    );
  }

  lose() {
    this.endRun("death");
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
    if (this.event?.id === "rage") speed *= 1.15;

    let hpScale = scale;
    if (type === "boss" && this.wave === 4) hpScale *= DIFFICULTY.firstBossHpScale;

    const scaledHp = Math.round(def.hp * hpScale);

    this.enemies.push({
      type,
      pattern: def.pattern,
      x,
      y,
      hp: scaledHp,
      maxHp: scaledHp,
      speed,
      damage: def.damage * (1 + (this.wave - 1) * DIFFICULTY.waveDmgGrowth),
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
      hpTrail: 1,
    });
    this.clampEnemy(this.enemies[this.enemies.length - 1]);
    addRing(this, x, y, def.glow || def.color, 50);
  }

  speedMult() {
    return 1 + (this.combatFx().speedBonus || 0);
  }

  skillCdMult() {
    return 1 - (this.combatFx().skillCdBonus || 0);
  }

  dmgVsEnemy(e, base) {
    let dmg = base;
    const fx = this.combatFx();
    if (fx.armorBonus && (e.type === "bulwark" || e.type === "boss")) {
      dmg *= 1 + fx.armorBonus;
    }
    if (fx.huntBonus && (e.type === "skirmisher" || e.type === "archer")) {
      dmg *= 1 + fx.huntBonus;
    }
    if (e.armor) dmg *= 1 - e.armor;
    return dmg;
  }

  skillDamage(mult = 1) {
    return this.champion.damage * SKILL_DMG * mult * this.eventSkill * (1 + (this.combatFx().skillBonus || 0));
  }

  skill2Damage() {
    return this.champion.damage * SKILL2_DMG * this.eventSkill * (1 + (this.combatFx().skillBonus || 0));
  }

  nearestEnemy(maxDist = Infinity) {
    return this.nearestEnemyFrom(this.player?.x ?? W / 2, this.player?.y ?? H / 2, maxDist);
  }

  nearestEnemyFrom(x, y, maxDist = Infinity) {
    let best = null;
    let bestD = maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= maxDist && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  pickZapTarget(reach) {
    const p = this.player;
    if (!p) return null;

    const hitReach = reach + ZAP_REACH_BONUS + p.radius;
    let best = null;
    let bestScore = Infinity;

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      const edge = d - e.radius - p.radius;
      if (edge > hitReach) continue;

      const ea = Math.atan2(e.y - p.y, e.x - p.x);
      const diff = Math.abs(normAngle(ea - p.angle));
      const score = edge + diff * 90;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }

    if (best) return best;
    return this.nearestEnemyFrom(p.x, p.y, hitReach);
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
      pierceMax: opts.pierceMax ?? null,
      pierceFalloff: opts.pierceFalloff ?? 1,
      hitSet: opts.pierce ? new Set() : null,
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
    if (dmg <= 0) return;
    if (e.hpTrail == null) e.hpTrail = e.hp / e.maxHp;
    e.hp -= dmg;
    e.hp = Math.max(0, Math.round(e.hp * 10) / 10);
    if (e.hp < 0.05) e.hp = 0;
    e.lastHitSkill = isSkill;
    const th = themeFor(this.champion);
    this.sfx.playHit(this.lastAttackSlot || "j", e.type === "boss");
    addShake(this, isSkill ? (e.type === "boss" ? 7 : 4.5) : 3);
    addRing(this, e.x, e.y, th.glow, isSkill ? (e.type === "boss" ? 72 : 52) : 34);
    const ls = this.combatFx().lifesteal;
    if (ls && this.player?.hp > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + dmg * ls);
    }
    if (isSkill) {
      addFloatText(this, e.x, e.y, String(Math.round(dmg)), th.glow, 15);
      spawnBurst(this, e.x, e.y, th.color, e.type === "boss");
      addFlash(this, th.accent, e.type === "boss" ? 0.12 : 0.07);
    } else {
      addFloatText(this, e.x, e.y, String(Math.round(dmg)), "#ffe082", 12);
      spawnBurst(this, e.x, e.y, "#fff", false);
    }
  }

  onEnemyKilled(e) {
    const def = ENEMIES[e.type];
    const result = registerKill(this.scoreState, e.type, !!e.lastHitSkill);
    this.scorePopTimer = 0.28;
    const color = result.combo >= COMBO_MILESTONE ? "#ff9100" : "#ffd166";
    addFloatText(
      this,
      e.x,
      e.y - 18,
      `+${formatScore(result.points)}`,
      color,
      result.combo >= 3 ? 17 : 15
    );
    if (result.combo >= 2) {
      addFloatText(
        this,
        e.x,
        e.y - 36,
        `×${result.combo} COMBO`,
        result.milestone ? "#ff5252" : "#69f0ae",
        result.milestone ? 18 : 14
      );
    }
    if (result.milestone) {
      addFlash(this, "#ff9100", 0.25);
      addShake(this, 8);
      this.sfx.playSkill("primary");
    }
    spawnBurst(this, e.x, e.y, def?.glow || e.color, e.type === "boss");
    addRing(this, e.x, e.y, def?.glow || e.color, e.type === "boss" ? 110 : 70);
    if (e.type === "boss") addShake(this, 10);
    this.sfx.playKill();
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
    const rush = 1 + (this.combatFx().skillCdBonus || 0) * 0.5;
    return 1 / (rate * rush);
  }

  useSkill(slot) {
    if (this.state !== "combat" || !this.player) return;
    const p = this.player;
    const c = this.champion;
    this.resolveSkillAim();

    if (slot === 0) {
      if (p.spaceSwing > 0) return;
      this.lastAttackSlot = "j";
      this.sfx.playSwing(this.champion?.spaceType);
      this.castSpace();
      p.spaceSwing = this.spaceInterval();
      addFlash(this, themeFor(c).accent, 0.14);
      this.flashSkillSlot(0);
    } else if (slot === 1) {
      if (p.skillCd > 0) return;
      this.lastAttackSlot = "k";
      this.sfx.playSkill("primary");
      this.castPrimary();
      p.skillCd = c.skillCd * this.skillCdMult();
      addFlash(this, themeFor(c).glow, 0.18);
      this.flashSkillSlot(1);
    } else {
      if (p.skill2Cd > 0) return;
      this.lastAttackSlot = "l";
      this.sfx.playSkill("secondary");
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
    const bonus = 1 + (this.combatFx().rangeBonus || 0);
    if (this.champion?.spaceType === "slash") {
      return MELEE_SLASH_RANGE * this.eventFog * bonus;
    }
    return (this.champion?.range ?? 60) * this.eventFog * bonus;
  }

  /** 플레이어·적 몸통 가장자리 간 거리 */
  meleeEdgeDist(e) {
    const p = this.player;
    if (!p) return Infinity;
    return Math.hypot(e.x - p.x, e.y - p.y) - p.radius - e.radius;
  }

  inMeleeReach(e, reach = this.basicRange()) {
    return this.meleeEdgeDist(e) <= reach + MELEE_REACH_LEEWAY;
  }

  slashVisualRadius() {
    return this.basicRange() + (this.player?.radius ?? 16);
  }

  attackRange() {
    const type = this.champion?.spaceType;
    if (type === "bolt" || type === "shot") {
      return this.basicRange() + RANGED_LEASH;
    }
    if (type === "zap") {
      return this.basicRange() + ZAP_REACH_BONUS;
    }
    return this.basicRange();
  }

  getBasicRangeVisual() {
    const range = this.basicRange();
    const type = this.champion?.spaceType ?? "slash";
    switch (type) {
      case "slash":
        return { kind: "circle", range: this.slashVisualRadius(), fullSpin: true };
      case "stab":
        return { kind: "circle", range: STAB_RANGE };
      case "bash":
        return { kind: "circle", range: BASH_RADIUS };
      case "bolt":
      case "shot":
        return {
          kind: "circle",
          range,
          sweetSpot: range * 0.88,
          extra: range + RANGED_LEASH,
        };
      case "zap":
        return { kind: "circle", range, extra: range + ZAP_REACH_BONUS };
      default:
        return { kind: "circle", range, sweetSpot: range * 0.88 };
    }
  }

  basicRangeLabel() {
    const v = this.getBasicRangeVisual();
    const r = Math.round(v.range);
    const type = this.champion?.spaceType;
    if (v.fullSpin) return `근접 360° · ${Math.round(this.basicRange())}px`;
    if (v.kind === "arc") return `근접 ${r}px`;
    if (v.extra && type === "zap") return `사거리 ${r} · 전격 ${Math.round(v.extra)}px`;
    if (v.extra) return `사거리 ${r} · 최대 ${Math.round(v.extra)}px`;
    if (v.sweetSpot) return `사거리 ${r}px (풀딜 ${Math.round(v.sweetSpot)}px)`;
    return `사거리 ${r}px`;
  }

  basicDamage(dist = 0) {
    let dmg =
      this.champion.damage *
      BASIC_DMG *
      this.eventSkill *
      (1 + (this.combatFx().skillBonus || 0) + (this.combatFx().basicBonus || 0));
    const type = this.champion.spaceType;
    if (type === "bolt" || type === "shot" || type === "zap") {
      dmg *= this.rangedFalloff(dist);
    }
    return dmg;
  }

  rangedFalloff(dist, range = this.basicRange()) {
    const sweet = range * 0.88;
    const outer = range + RANGED_LEASH;
    if (dist <= sweet) return 1;
    if (dist >= outer) return 0.76;
    const t = (dist - sweet) / (outer - sweet);
    return 1 - t * 0.24;
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
      maxTrackRange: this.attackRange() + 36,
      ...extra,
    };
  }

  castSpace() {
    const p = this.player;
    const c = this.champion;
    const th = themeFor(c);
    const maxR = this.basicRange();
    const acquireR = this.attackRange();
    const near = this.nearestEnemy(acquireR);
    const nearDist = near ? Math.hypot(near.x - p.x, near.y - p.y) : acquireR;
    const dmg = this.basicDamage(nearDist);
    const a = p.angle;
    this.lastZapTarget = null;

    switch (c.spaceType) {
      case "slash": {
        const reach = this.basicRange();
        let hit = 0;
        this.enemies.forEach((e) => {
          if (!this.inMeleeReach(e, reach)) return;
          const edge = this.meleeEdgeDist(e);
          const falloff = edge < reach * 0.42 ? (c.id === "blade" ? 1.12 : 1.05) : 1;
          this.damageEnemy(e, dmg * SLASH_AOE_DMG * falloff, true);
          hit += 1;
        });
        addRing(this, p.x, p.y, th.glow, this.slashVisualRadius() * 2.05);
        if (hit > 0) addShake(this, Math.min(4, 2 + hit));
        break;
      }
      case "bolt": {
        if (!near || nearDist > acquireR) break;
        p.angle = Math.atan2(near.y - p.y, near.x - p.x);
        const boltSpd = c.id === "mage" ? 680 : 640;
        const boltDmg = c.id === "mage" ? dmg * 1.08 : dmg;
        const boltLife = c.id === "mage" ? 0.68 : 0.62;
        this.pushFriendlyProjectile(
          p.x,
          p.y,
          p.angle,
          boltSpd,
          this.basicProjectileOpts({
            slot: "space",
            damage: boltDmg,
            life: boltLife,
            radius: c.id === "mage" ? 9 : 8,
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
        if (!near || nearDist > acquireR) break;
        p.angle = Math.atan2(near.y - p.y, near.x - p.x);
        this.pushFriendlyProjectile(
          p.x,
          p.y,
          p.angle,
          700,
          this.basicProjectileOpts({
            slot: "space",
            damage: dmg,
            life: 0.68,
            radius: 5,
            color: th.accent,
            homing: false,
            pierce: c.id !== "archer",
          })
        );
        break;
      }
      case "zap": {
        const t = this.pickZapTarget(maxR);
        this.lastZapTarget = t;
        if (!t) break;
        p.angle = Math.atan2(t.y - p.y, t.x - p.x);
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        this.damageEnemy(t, this.basicDamage(d) * (c.spaceZapMult ?? 1), true);
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
        const dashBase = c.id === "blade" ? 162 : 145;
        const dist = dashBase * this.eventFog;
        const nx = clamp(p.x + Math.cos(p.angle) * dist, PAD, W - PAD);
        const ny = clamp(p.y + Math.sin(p.angle) * dist, PAD, H - PAD);
        addTrail(this, p.x, p.y, nx, ny, th.slash, 8);
        this.enemies.forEach((e) => {
          if (distToSegment(e.x, e.y, p.x, p.y, nx, ny) < e.radius + 32) {
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
      case "nova": {
        const novaR = c.id === "mage" ? 148 : 132;
        const novaDmg = c.id === "mage" ? dmg * 1.1 : dmg;
        this.dealDamage(novaDmg, p.x, p.y, novaR * this.eventFog, 35);
        spawnBurst(this, p.x, p.y, th.glow, true);
        addShake(this, 6);
        addFlash(this, th.color, 0.28);
        playPrimaryVfx(this, c, p);
        break;
      }
      case "blink": {
        const t = this.nearestEnemy(360);
        if (t) {
          playPrimaryVfx(this, c, p);
          p.x = t.x + (p.x - t.x) * 0.2;
          p.y = t.y + (p.y - t.y) * 0.2;
          this.damageEnemy(t, dmg * 1.35, true);
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
      case "pierce": {
        const pierceSpd = c.id === "archer" ? 500 : 580;
        const pierceMult = c.id === "archer" ? 0.52 : 1;
        this.pushFriendlyProjectile(p.x, p.y, p.angle, pierceSpd, {
          slot: "primary",
          damage: dmg * pierceMult,
          life: c.id === "archer" ? 0.95 : 1.2,
          radius: c.id === "archer" ? 6 : 7,
          color: th.accent,
          pierce: true,
          pierceMax: c.id === "archer" ? 3 : null,
          pierceFalloff: c.id === "archer" ? 0.78 : 1,
          homing: false,
        });
        break;
      }
      case "chain": {
        let cur = this.nearestEnemy(9999);
        let lx = p.x,
          ly = p.y;
        for (let i = 0; i < 5 && cur; i++) {
          addFx(this, {
            kind: "lightning",
            x1: lx,
            y1: ly,
            x2: cur.x,
            y2: cur.y,
            jx: (Math.random() - 0.5) * 28,
            jy: (Math.random() - 0.5) * 28,
            jx2: (Math.random() - 0.5) * 18,
            jy2: (Math.random() - 0.5) * 18,
            color: th.glow,
            maxT: 0.35,
          });
          addFx(this, {
            kind: "ringBurst",
            x: cur.x,
            y: cur.y,
            r: 36,
            color: th.accent,
            core: "#fff",
            maxT: 0.2,
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
      case "arc": {
        const arcReach = (c.id === "blade" ? 98 : 90) + MELEE_REACH_LEEWAY;
        this.enemies.forEach((e) => {
          const ea = Math.atan2(e.y - p.y, e.x - p.x);
          const diff = Math.abs(normAngle(ea - a));
          if (diff < 0.92 && this.meleeEdgeDist(e) <= arcReach) {
            this.damageEnemy(e, dmg, true);
          }
        });
        this.burst(p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, th.slash);
        playSecondaryVfx(this, c, p, a);
        addShake(this, 5);
        break;
      }
      case "bolt": {
        const bolt2Spd = c.id === "mage" ? 660 : 620;
        const bolt2Mult = c.id === "mage" ? 1.35 : 1.2;
        this.pushFriendlyProjectile(p.x, p.y, a, bolt2Spd, {
          slot: "secondary",
          damage: dmg * bolt2Mult,
          life: c.id === "mage" ? 1.15 : 1,
          radius: c.id === "mage" ? 9 : 8,
          color: th.glow,
          pierce: c.id === "mage",
          homing: false,
        });
        break;
      }
      case "smoke":
        this.invuln = 0.75;
        this.smokeTimer = 0.85;
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
            e.stun = Math.max(e.stun, 0.45);
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
          t: 3.2,
          tick: 0.35,
          friendly: true,
          damage: dmg * 0.52,
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

    const fx = this.combatFx();
    if (source === "proj" && fx.projReduce) amount *= 1 - fx.projReduce;
    if (source === "zone" && fx.zoneReduce) amount *= 1 - fx.zoneReduce;
    if ((source === "charge" || source === "boss") && fx.chargeReduce) {
      amount *= 1 - fx.chargeReduce;
    }

    p.hp -= amount * this.eventDefense;
    this.invuln = Math.max(this.invuln, 0.46);
    this.sfx.playHurt();
    addShake(this, source === "boss" ? 10 : 6);
    addFlash(this, "#ff2d55", 0.45);
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
      if (e.stateT > 1.15 && Math.hypot(p.x - e.x, p.y - e.y) < 255) {
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
        this.hurtPlayer(e.damage * 1.02, "charge");
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
    if (d > 235) {
      e.x += Math.cos(a) * e.speed * slow * chase * dt;
      e.y += Math.sin(a) * e.speed * slow * chase * dt;
    } else if (d < 165) {
      e.x -= Math.cos(a) * e.speed * slow * chase * dt;
      e.y -= Math.sin(a) * e.speed * slow * chase * dt;
    }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 310) {
      e.shootCd = 1.65;
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      this.enemyProjectiles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(ang) * 280,
        vy: Math.sin(ang) * 280,
        damage: e.damage * 0.85,
        life: 2.4,
        radius: 11,
        color: "#ffb300",
        glow: "#ff5722",
        enemy: true,
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
      e.zoneCd = 2.65;
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
    if (e.state === "idle" && e.stateT > 2.1) {
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
        this.hurtPlayer(e.damage * 1.03, "boss");
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
    if (this.state !== "combat") return;
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
    if (this.enemies.length) this.aimAtNearestEnemy(this.attackRange() + 24);
    if (p.spaceSwing > 0) p.spaceSwing -= dt;
    if (this.keys.KeyJ && p.spaceSwing <= 0) this.useSkill(0);
    if (p.skillCd > 0) p.skillCd -= dt;
    if (p.skill2Cd > 0) p.skill2Cd -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.smokeTimer > 0) this.smokeTimer -= dt;

    this.timeLeft -= dt;
    tickCombo(this.scoreState, dt);
    if (this.scorePopTimer > 0) this.scorePopTimer -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endRun("time");
      return;
    }

    this.updatePickups(dt);

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
          if (pr.hitSet?.has(e)) continue;
          let hitDmg = pr.damage;
          if (pr.pierce && pr.hitSet) {
            const n = pr.hitSet.size;
            if (pr.pierceFalloff != null && pr.pierceFalloff !== 1) {
              hitDmg *= Math.pow(pr.pierceFalloff, n);
            }
            pr.hitSet.add(e);
            this.damageEnemy(e, hitDmg, pr.friendly);
            if (pr.pierceMax != null && pr.hitSet.size >= pr.pierceMax) return false;
            continue;
          }
          this.damageEnemy(e, hitDmg, pr.friendly);
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
        this.tryDropLoot(e);
        this.onEnemyKilled(e);
        this.enemies.splice(i, 1);
        continue;
      }
      updateEnemyFacing(e, p);
      this.updateEnemyAI(e, dt);
    }

    if (!this.spawnQueue.length && this.enemies.length === 0 && this.spawnTimer > 0.45) {
      this.startNextWave(true);
      return;
    }
  }

  loop(now) {
    if (!this.lastTime) this.lastTime = now;
    const frameDt = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;

    if (this.paused) {
      this.accumulator = 0;
      updateVfx(this, 0);
    } else if (this.state !== "combat") {
      this.accumulator = 0;
      updateVfx(this, frameDt);
    } else {
      this.accumulator = (this.accumulator || 0) + frameDt;
      let steps = 0;
      while (this.accumulator >= SIM_STEP && steps < MAX_SIM_STEPS) {
        if (this.paused || this.state !== "combat") break;
        updateVfx(this, SIM_STEP);
        this.updateCombat(SIM_STEP);
        this.accumulator -= SIM_STEP;
        steps += 1;
      }
    }

    if (this.state === "combat" && !this.paused) this.updateHud();
    try {
      this.draw();
    } catch (err) {
      console.error("render error", err);
      this.resetCanvas();
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  resetCanvas() {
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.setLineDash([]);
    ctx.filter = "none";
  }

  draw() {
    renderFrame(this, this.ctx);
  }

  updateHud() {
    const score = this.scoreState?.total ?? 0;
    const scoreLabel = formatScore(score);
    if (this.ui.scoreNum) {
      if (this.hudCache.score !== scoreLabel) {
        this.hudCache.score = scoreLabel;
        this.ui.scoreNum.textContent = scoreLabel;
      }
      this.ui.scoreNum.classList.toggle("score-pop", this.scorePopTimer > 0);
    }

    const timeLabel = formatTime(this.timeLeft ?? 0);
    if (this.ui.timeNum) {
      if (this.hudCache.time !== timeLabel) {
        this.hudCache.time = timeLabel;
        this.ui.timeNum.textContent = timeLabel;
      }
      const urgency = timeUrgency(this.timeLeft ?? 0);
      this.ui.timeNum.classList.toggle("time-warn", urgency === "warn");
      this.ui.timeNum.classList.toggle("time-critical", urgency === "critical");
    }

    const combo = this.scoreState?.combo ?? 0;
    const comboLabel = `×${combo}`;
    if (this.ui.comboNum) {
      if (this.hudCache.combo !== comboLabel) {
        this.hudCache.combo = comboLabel;
        this.ui.comboNum.textContent = comboLabel;
      }
      this.ui.comboNum.classList.toggle("combo-hot", combo >= COMBO_MILESTONE);
    }

    const parts = [];
    if (this.event) parts.push(this.event.name);
    if (this.champion && this.state === "combat") parts.push(this.champion.name);
    parts.push(`웨이브 ${Math.max(this.wave, 1)}`);
    if (this.runAugments.length) {
      parts.push(`증강 ${this.runAugments.length}`);
    }
    const tempLoot = formatTempBuffs(this.waveTempBuff);
    if (tempLoot) parts.push(`아이템 ${tempLoot}`);
    const waveInfo = parts.join(" · ") || "—";
    if (this.ui.waveInfo && this.hudCache.waveInfo !== waveInfo) {
      this.hudCache.waveInfo = waveInfo;
      this.ui.waveInfo.textContent = waveInfo;
    }

    if (this.state === "combat") {
      this.message = `${formatScore(score)} pt · ${formatTime(this.timeLeft ?? 0)} · W${Math.max(this.wave, 1)}`;
    }

    if (!this.player || this.state !== "combat") return;

    const p = this.player;
    const c = this.champion;
    const hpPct = Math.max(0, p.hp / p.maxHp);
    const hpBody = this.ui.combatUi?.querySelector(".combat-hp-body");
    const hpPctLabel = `${Math.round(hpPct * 100)}%`;
    const hpText = `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`;

    if (this.ui.combatHpFill && this.hudCache.hpFill !== hpPct) {
      this.hudCache.hpFill = hpPct;
      this.ui.combatHpFill.style.width = `${hpPct * 100}%`;
    }
    if (this.ui.combatHpTrail) {
      if (p.hpTrail == null) p.hpTrail = hpPct;
      p.hpTrail += (hpPct - p.hpTrail) * 0.2;
      if (this.hudCache.hpTrail !== p.hpTrail) {
        this.hudCache.hpTrail = p.hpTrail;
        this.ui.combatHpTrail.style.width = `${p.hpTrail * 100}%`;
      }
    }
    if (this.ui.combatHpText && this.hudCache.hpText !== hpText) {
      this.hudCache.hpText = hpText;
      this.ui.combatHpText.textContent = hpText;
    }
    if (this.ui.combatHpPct && this.hudCache.hpPct !== hpPctLabel) {
      this.hudCache.hpPct = hpPctLabel;
      this.ui.combatHpPct.textContent = hpPctLabel;
    }
    if (hpBody) {
      const danger = hpPct <= 0.25;
      const warn = hpPct > 0.25 && hpPct <= 0.5;
      const ok = hpPct > 0.5;
      if (this.hudCache.hpDanger !== danger) {
        this.hudCache.hpDanger = danger;
        hpBody.classList.toggle("hp-danger", danger);
      }
      if (this.hudCache.hpWarn !== warn) {
        this.hudCache.hpWarn = warn;
        hpBody.classList.toggle("hp-warn", warn);
      }
      if (this.hudCache.hpOk !== ok) {
        this.hudCache.hpOk = ok;
        hpBody.classList.toggle("hp-ok", ok);
      }
    }

    this.updateAugmentStrip();

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
    if (slot.range) {
      const label = this.basicRangeLabel();
      if (this.hudCache.basicRange !== label) {
        this.hudCache.basicRange = label;
        slot.range.textContent = label;
      }
    }
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

  updateAugmentStrip() {
    const strip = this.ui.augmentStrip;
    const chipsEl = this.ui.augmentChips;
    const countEl = this.ui.augmentCount;
    if (!strip || !chipsEl) return;

    const show = this.state === "combat" && this.runAugments.length > 0;
    strip.classList.toggle("hidden", !show);
    if (!show) return;

    if (countEl) {
      countEl.textContent = `증강 ${this.runAugments.length}`;
    }

    chipsEl.innerHTML = "";
    this.runAugments.forEach((aug) => {
      const chip = document.createElement("span");
      chip.className = `aug-chip-sm aug-tier-${aug.tier}`;
      chip.title = `${aug.name}\n${formatAugmentStats(aug.fx).join("\n")}`;
      chip.innerHTML = `<span>${aug.icon}</span> ${aug.name}`;
      chipsEl.appendChild(chip);
    });
  }

  makeAugmentCard(aug, fn, recommended = false) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `aug-card aug-tier-${aug.tier}`;
    const tierLabel = AUGMENT_TIER_LABEL[aug.tier] || aug.tier;
    const stats = formatAugmentStats(aug.fx)
      .map((s) => `<li>${s}</li>`)
      .join("");

    card.innerHTML = `
      <div class="aug-card-frame"></div>
      <span class="aug-tier-pill">${tierLabel}</span>
      ${recommended ? '<span class="aug-rec-pill">추천</span>' : ""}
      <div class="aug-card-icon">${aug.icon}</div>
      <strong class="aug-card-name">${aug.name}</strong>
      <p class="aug-card-desc">${aug.desc}</p>
      <ul class="aug-card-stats">${stats}</ul>
      <span class="aug-card-foot">런 내내 누적</span>
    `;
    card.onclick = fn;
    return card;
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
