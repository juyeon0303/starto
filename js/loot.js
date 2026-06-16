/** 맵 드롭 — 웨이브 난이도에 맞춰 회복·일시 버프 */
export const LOOT_BUFFS = [
  {
    id: "fury",
    name: "분노",
    icon: "⚔",
    color: "#ff7043",
    glow: "#ffab91",
    desc: "스킬·J 피해 증가 (이번 웨이브)",
    fx: { skillBonus: 0.1, basicBonus: 0.06 },
  },
  {
    id: "swift",
    name: "가속",
    icon: "⚡",
    color: "#ffd166",
    glow: "#ffe082",
    desc: "이동·스킬 쿨 (이번 웨이브)",
    fx: { speedBonus: 0.08, skillCdBonus: 0.06 },
  },
  {
    id: "guard",
    name: "수호",
    icon: "🛡",
    color: "#64b5f6",
    glow: "#90caf9",
    desc: "받는 피해 감소 (이번 웨이브)",
    fx: { chargeReduce: 0.1, projReduce: 0.12, zoneReduce: 0.1 },
  },
  {
    id: "focus",
    name: "집중",
    icon: "🎯",
    color: "#ba68c8",
    glow: "#ea80fc",
    desc: "J 피해·사거리 (이번 웨이브)",
    fx: { basicBonus: 0.12, rangeBonus: 0.06 },
  },
];

const TEMP_FX_CAPS = {
  skillBonus: 0.32,
  basicBonus: 0.28,
  speedBonus: 0.22,
  skillCdBonus: 0.18,
  chargeReduce: 0.28,
  projReduce: 0.32,
  zoneReduce: 0.28,
  rangeBonus: 0.14,
};

export function mergeTempFx(current, add) {
  const fx = { ...current };
  for (const [k, v] of Object.entries(add || {})) {
    const cap = TEMP_FX_CAPS[k] ?? 0.5;
    fx[k] = Math.min(cap, (fx[k] || 0) + v);
  }
  return fx;
}

export function mergeCombatFx(augFx, tempFx) {
  const fx = { ...(augFx || {}) };
  for (const [k, v] of Object.entries(tempFx || {})) {
    fx[k] = (fx[k] || 0) + v;
  }
  const caps = {
    chargeReduce: 0.72,
    armorBonus: 1,
    projReduce: 0.78,
    zoneReduce: 0.78,
    huntBonus: 0.85,
    skillBonus: 0.9,
    speedBonus: 0.45,
    skillCdBonus: 0.38,
    basicBonus: 0.55,
    rangeBonus: 0.35,
    lifesteal: 0.25,
  };
  for (const [k, cap] of Object.entries(caps)) {
    if (fx[k] != null) fx[k] = Math.min(cap, fx[k]);
  }
  return fx;
}

/** 웨이브별 회복량 (% + 고정) */
export function healAmountForWave(wave, maxHp) {
  const pct = 0.14 + wave * 0.018;
  const flat = 10 + wave * 3;
  const raw = maxHp * Math.min(0.38, pct) + flat;
  return Math.max(12, Math.round(Math.min(maxHp * 0.45, raw)));
}

export function lootDropChance(wave, enemyType) {
  if (enemyType === "boss") return 1;
  let base = 0.1 + wave * 0.012;
  if (enemyType === "bulwark") base += 0.05;
  if (wave <= 4) base += 0.06;
  if (wave >= 7) base += 0.02;
  return Math.min(0.34, base);
}

export function rollLootKind(wave, enemyType) {
  if (enemyType === "boss") {
    return Math.random() < 0.45 ? "heal" : "buff";
  }
  const healBias = wave <= 3 ? 0.62 : wave <= 6 ? 0.48 : 0.38;
  return Math.random() < healBias ? "heal" : "buff";
}

export function pickLootBuff(wave) {
  const pool = [...LOOT_BUFFS];
  if (wave >= 5) {
    pool.push({
      ...LOOT_BUFFS[0],
      id: "fury_plus",
      name: "강화 분노",
      fx: { skillBonus: 0.14, basicBonus: 0.1 },
    });
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function formatTempBuffs(tempFx) {
  if (!tempFx || !Object.keys(tempFx).length) return "";
  const labels = [];
  if (tempFx.skillBonus) labels.push(`피해+${Math.round(tempFx.skillBonus * 100)}%`);
  if (tempFx.basicBonus) labels.push(`J+${Math.round(tempFx.basicBonus * 100)}%`);
  if (tempFx.speedBonus) labels.push(`이속+${Math.round(tempFx.speedBonus * 100)}%`);
  if (tempFx.skillCdBonus) labels.push(`쿨-${Math.round(tempFx.skillCdBonus * 100)}%`);
  if (tempFx.chargeReduce || tempFx.projReduce) labels.push("방어↑");
  if (tempFx.rangeBonus) labels.push(`사거리+${Math.round(tempFx.rangeBonus * 100)}%`);
  return labels.join(" · ");
}

export function createHealPickup(wave, maxHp) {
  const amount = healAmountForWave(wave, maxHp || 100);
  return {
    kind: "heal",
    name: "회복",
    icon: "❤",
    color: "#69f0ae",
    glow: "#b9f6ca",
    amount,
  };
}

export function createBuffPickup(wave) {
  const def = pickLootBuff(wave);
  return {
    kind: "buff",
    name: def.name,
    icon: def.icon,
    color: def.color,
    glow: def.glow,
    buffId: def.id,
    fx: { ...def.fx },
  };
}

export function ambientPickupCount(wave) {
  if (wave <= 2) return 2;
  if (wave <= 5) return 2;
  if (wave <= 7) return 1;
  return 0;
}
