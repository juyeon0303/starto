/** 10분 아케이드 점수 규칙 */
export const ARCADE_DURATION = 600;

export const ENEMY_SCORE = {
  skirmisher: 120,
  archer: 150,
  charger: 180,
  caster: 200,
  bulwark: 240,
  boss: 1200,
};

export const COMBO_WINDOW = 2.35;
export const WAVE_CLEAR_BASE = 350;
export const COMBO_MILESTONE = 5;

export function createScoreState() {
  return {
    total: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    lastKillAt: 0,
  };
}

export function tickCombo(state, dt) {
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.comboTimer = 0;
      state.combo = 0;
    }
  }
}

export function registerKill(state, enemyType, wasSkill = false) {
  const now = performance.now() / 1000;
  if (now - state.lastKillAt <= COMBO_WINDOW) {
    state.combo += 1;
  } else {
    state.combo = 1;
  }
  state.lastKillAt = now;
  state.comboTimer = COMBO_WINDOW;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.kills += 1;

  const base = ENEMY_SCORE[enemyType] || 100;
  const comboMult = 1 + (state.combo - 1) * 0.14;
  const skillMult = wasSkill ? 1.2 : 1;
  const points = Math.round(base * comboMult * skillMult);
  state.total += points;

  return {
    points,
    combo: state.combo,
    milestone: state.combo >= COMBO_MILESTONE && state.combo % COMBO_MILESTONE === 0,
  };
}

export function registerWaveClear(state, wave) {
  const points = WAVE_CLEAR_BASE + wave * 150;
  state.total += points;
  return points;
}

export function formatScore(n) {
  return Math.max(0, Math.round(n)).toLocaleString("ko-KR");
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function timeUrgency(seconds) {
  if (seconds <= 30) return "critical";
  if (seconds <= 60) return "warn";
  return "ok";
}
