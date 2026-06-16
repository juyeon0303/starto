export const WAVE_COUNT = 8;

export const CHAMPIONS = [
  {
    id: "blade",
    name: "검사",
    color: "#ff7043",
    glow: "#ffab91",
    hp: 130,
    speed: 215,
    damage: 10,
    range: 58,
    atkRate: 0.85,
    spaceName: "참격",
    spaceRate: 3.05,
    spaceType: "slash",
    skillName: "돌진 베기",
    skillCd: 3.2,
    skillDesc: "돌진 + 경로 적에게 큰 피해. (거리 145)",
    skillType: "dash",
    skill2Name: "제압",
    skill2Cd: 5,
    skill2Desc: "전방 부채꼴 범위 강타.",
    skill2Type: "arc",
  },
  {
    id: "mage",
    name: "마법사",
    color: "#7e57c2",
    glow: "#b388ff",
    hp: 96,
    speed: 196,
    damage: 7,
    range: 178,
    atkRate: 0.7,
    spaceName: "마력탄",
    spaceRate: 2.1,
    spaceType: "bolt",
    spaceHoming: true,
    spaceHomingTurn: 11,
    skillName: "불꽃 폭발",
    skillCd: 3.8,
    skillDesc: "주변 광역 폭발. (범위 넓음)",
    skillType: "nova",
    skill2Name: "관통 화염",
    skill2Cd: 2.2,
    skill2Desc: "조준 방향 관통 화염.",
    skill2Type: "bolt",
  },
  {
    id: "rogue",
    name: "도적",
    color: "#26a69a",
    glow: "#64ffda",
    hp: 98,
    speed: 270,
    damage: 8,
    range: 52,
    atkRate: 1.1,
    spaceName: "급습",
    spaceRate: 3.25,
    spaceType: "stab",
    skillName: "그림자 일격",
    skillCd: 2.8,
    skillDesc: "가장 가까운 적에게 순간 접근 + 급소.",
    skillType: "blink",
    skill2Name: "연막",
    skill2Cd: 4.5,
    skill2Desc: "0.75초 무적 + 앞으로 도약 (회피).",
    skill2Type: "smoke",
  },
  {
    id: "guardian",
    name: "수호자",
    color: "#78909c",
    glow: "#cfd8dc",
    hp: 175,
    speed: 180,
    damage: 9,
    range: 54,
    atkRate: 0.75,
    spaceName: "방패치기",
    spaceRate: 2.15,
    spaceType: "bash",
    skillName: "방패 강타",
    skillCd: 5,
    skillDesc: "주변 기절 + 무적 1.5초.",
    skillType: "slam",
    skill2Name: "도발",
    skill2Cd: 3.5,
    skill2Desc: "적 끌어당김 + 짧은 기절.",
    skill2Type: "taunt",
  },
  {
    id: "archer",
    name: "궁수",
    color: "#66bb6a",
    glow: "#b9f6ca",
    hp: 98,
    speed: 204,
    damage: 6.5,
    range: 210,
    atkRate: 0.95,
    spaceName: "속사",
    spaceRate: 2.2,
    spaceType: "shot",
    spaceHoming: false,
    skillName: "관통 사격",
    skillCd: 3.2,
    skillDesc: "관통 화살. (속도↑)",
    skillType: "pierce",
    skill2Name: "속박 덫",
    skill2Cd: 4,
    skill2Desc: "발 밑 늪 — 적 감속.",
    skill2Type: "trap",
  },
  {
    id: "storm",
    name: "뇌술사",
    color: "#42a5f5",
    glow: "#82b1ff",
    hp: 96,
    speed: 194,
    damage: 7,
    range: 172,
    atkRate: 0.82,
    spaceName: "전격",
    spaceRate: 2.25,
    spaceType: "zap",
    spaceZapMult: 1.22,
    skillName: "연쇄 번개",
    skillCd: 4,
    skillDesc: "5명 연쇄 번개.",
    skillType: "chain",
    skill2Name: "전기 장판",
    skill2Cd: 3,
    skill2Desc: "전방 전기 장판. (지속↑)",
    skill2Type: "field",
  },
];

/** 편성형 적 — 잡몹 떼 X */
export const ENEMIES = {
  charger: {
    name: "돌진병",
    role: "돌진",
    hint: "돌진 예고 후 직선 돌진",
    hp: 70,
    speed: 82,
    damage: 11,
    radius: 15,
    color: "#ff5252",
    glow: "#ff867c",
    shape: "diamond",
    pattern: "charge",
  },
  archer: {
    name: "사격수",
    role: "원거리",
    hint: "거리 유지 + 투사체",
    hp: 48,
    speed: 84,
    damage: 8,
    radius: 13,
    color: "#ffb74d",
    glow: "#ffe082",
    shape: "square",
    pattern: "ranged",
  },
  bulwark: {
    name: "중갑대",
    role: "탱커",
    hint: "느리지만 단단함",
    hp: 128,
    speed: 54,
    damage: 10,
    radius: 19,
    color: "#8d6e63",
    glow: "#bcaaa4",
    shape: "hex",
    pattern: "tank",
    armor: 0.25,
  },
  skirmisher: {
    name: "기동대",
    role: "암살",
    hint: "측면 우회 후 급접",
    hp: 52,
    speed: 118,
    damage: 7,
    radius: 12,
    color: "#aed581",
    glow: "#ccff90",
    shape: "diamond",
    pattern: "flank",
  },
  caster: {
    name: "술사",
    role: "장판",
    hint: "바닥 마법 예고 후 폭발",
    hp: 56,
    speed: 70,
    damage: 12,
    radius: 14,
    color: "#ba68c8",
    glow: "#ea80fc",
    shape: "hex",
    pattern: "zone",
  },
  boss: {
    name: "군단장",
    role: "보스",
    hint: "돌진 + 광역 장판",
    hp: 440,
    speed: 60,
    damage: 16,
    radius: 24,
    color: "#ce93d8",
    glow: "#f48fb1",
    shape: "hex",
    pattern: "boss",
    armor: 0.15,
  },
};

export const WAVE_EVENTS = [
  { id: "calm", name: "평온", desc: "특수 규칙 없음." },
  { id: "rage", name: "분노", desc: "적 이동 +10%." },
  { id: "fog", name: "안개", desc: "J 사거리 -6%." },
  { id: "surge", name: "마력 surge", desc: "스킬 피해 +15%." },
  { id: "iron", name: "철의 밤", desc: "받는 피해 -12%." },
];

/** 웨이브별 편성 (고정 + 변수) */
export const WAVE_COMPOSITIONS = [
  [{ type: "skirmisher", count: 2 }, { type: "charger", count: 1 }],
  [{ type: "archer", count: 1 }, { type: "skirmisher", count: 1 }, { type: "bulwark", count: 1 }],
  [{ type: "charger", count: 1 }, { type: "skirmisher", count: 2 }],
  [{ type: "boss", count: 1 }],
  [{ type: "bulwark", count: 1 }, { type: "caster", count: 1 }, { type: "skirmisher", count: 2 }],
  [{ type: "archer", count: 2 }, { type: "charger", count: 1 }, { type: "caster", count: 1 }],
  [{ type: "bulwark", count: 1 }, { type: "charger", count: 2 }, { type: "archer", count: 1 }, { type: "skirmisher", count: 1 }],
  [{ type: "boss", count: 1 }, { type: "charger", count: 1 }, { type: "caster", count: 1 }],
];

/** 칼바람식 증강 — 웨이브마다 1개 선택, 런 내내 누적 (중복 불가) */
export const AUGMENTS = [
  {
    id: "brace",
    tier: "gold",
    icon: "🛡",
    name: "방어 태세",
    desc: "돌진·보스 피격 시 받는 피해 감소.",
    vs: ["charger", "boss"],
    fx: { chargeReduce: 0.22 },
  },
  {
    id: "pierce",
    tier: "gold",
    icon: "⚔",
    name: "장갑 관통",
    desc: "중갑·보스에게 가하는 피해 증가.",
    vs: ["bulwark", "boss"],
    fx: { armorBonus: 0.28 },
  },
  {
    id: "evade",
    tier: "silver",
    icon: "🏹",
    name: "회피 집중",
    desc: "적 투사체 피해 감소.",
    vs: ["archer"],
    fx: { projReduce: 0.32 },
  },
  {
    id: "purge",
    tier: "gold",
    icon: "✨",
    name: "정화의 손",
    desc: "장판·폭발 피해 감소.",
    vs: ["caster", "boss"],
    fx: { zoneReduce: 0.35 },
  },
  {
    id: "hunt",
    tier: "gold",
    icon: "🎯",
    name: "사냥 본능",
    desc: "기동대·사격수 처치 속도 UP.",
    vs: ["skirmisher", "archer"],
    fx: { huntBonus: 0.22 },
  },
  {
    id: "focus",
    tier: "gold",
    icon: "🔮",
    name: "스킬 집중",
    desc: "K/L 스킬 피해 증가.",
    vs: ["*"],
    fx: { skillBonus: 0.16 },
  },
  {
    id: "rush",
    tier: "prismatic",
    icon: "⚡",
    name: "전술 가속",
    desc: "이동 + 스킬 쿨 단축.",
    vs: ["*"],
    fx: { speedBonus: 0.1, skillCdBonus: 0.07 },
  },
  {
    id: "vitality",
    tier: "silver",
    icon: "❤",
    name: "생명력 강화",
    desc: "최대 체력 즉시 증가 (누적).",
    vs: ["*"],
    fx: { hpBonus: 22 },
  },
  {
    id: "scope",
    tier: "silver",
    icon: "👁",
    name: "사거리 확장",
    desc: "J 평타·조준 사거리 증가.",
    vs: ["archer", "caster"],
    fx: { rangeBonus: 0.14 },
  },
  {
    id: "vamp",
    tier: "gold",
    icon: "🩸",
    name: "흡혈",
    desc: "가한 피해의 일부 회복.",
    vs: ["*"],
    fx: { lifesteal: 0.06 },
  },
  {
    id: "edge",
    tier: "gold",
    icon: "🗡",
    name: "날카로운 J",
    desc: "J 연타 피해 증가.",
    vs: ["*"],
    fx: { basicBonus: 0.14 },
  },
  {
    id: "prism",
    tier: "prismatic",
    icon: "💎",
    name: "프리즘 폭발",
    desc: "스킬 + J 피해 대폭 증가.",
    vs: ["*"],
    fx: { skillBonus: 0.2, basicBonus: 0.1 },
  },
  {
    id: "bulwark",
    tier: "gold",
    icon: "🔰",
    name: "철벽",
    desc: "돌진·투사체 피해 동시 감소.",
    vs: ["charger", "archer", "boss"],
    fx: { chargeReduce: 0.12, projReduce: 0.18 },
  },
];

/** @deprecated — use AUGMENTS */
export const COUNTERS = AUGMENTS;

export const AUGMENT_TIER_LABEL = {
  silver: "실버",
  gold: "골드",
  prismatic: "프리즘",
};

const FX_CAPS = {
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

const FX_STAT_LABEL = {
  chargeReduce: (v) => `돌진·보스 피해 −${Math.round(v * 100)}%`,
  armorBonus: (v) => `중갑·보스 피해 +${Math.round(v * 100)}%`,
  projReduce: (v) => `투사체 피해 −${Math.round(v * 100)}%`,
  zoneReduce: (v) => `장판 피해 −${Math.round(v * 100)}%`,
  huntBonus: (v) => `기동·원거리 피해 +${Math.round(v * 100)}%`,
  skillBonus: (v) => `스킬 피해 +${Math.round(v * 100)}%`,
  speedBonus: (v) => `이동속도 +${Math.round(v * 100)}%`,
  skillCdBonus: (v) => `스킬 쿨 −${Math.round(v * 100)}%`,
  basicBonus: (v) => `J 피해 +${Math.round(v * 100)}%`,
  rangeBonus: (v) => `사거리 +${Math.round(v * 100)}%`,
  lifesteal: (v) => `흡혈 ${Math.round(v * 100)}%`,
  hpBonus: (v) => `최대 HP +${Math.round(v)}`,
};

export function mergeAugmentFx(augments) {
  const fx = {};
  for (const aug of augments) {
    for (const [k, v] of Object.entries(aug.fx || {})) {
      if (k === "hpBonus") continue;
      fx[k] = (fx[k] || 0) + v;
    }
  }
  for (const [k, cap] of Object.entries(FX_CAPS)) {
    if (fx[k] != null) fx[k] = Math.min(cap, fx[k]);
  }
  return fx;
}

export function formatAugmentStats(fx) {
  return Object.entries(fx || {})
    .map(([k, v]) => FX_STAT_LABEL[k]?.(v))
    .filter(Boolean);
}

export function isAugmentRecommended(aug, enemyTypes) {
  if (aug.vs.includes("*")) return false;
  return aug.vs.some((t) => enemyTypes.has(t));
}

export function augmentMatchesWave(aug, enemyTypes) {
  return aug.vs.includes("*") || aug.vs.some((t) => enemyTypes.has(t));
}

export function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

export function getWaveComposition(wave) {
  const base = WAVE_COMPOSITIONS[wave - 1] || WAVE_COMPOSITIONS[WAVE_COMPOSITIONS.length - 1];
  /** J 연타 기준 — 웨이브별 체력 스케일 */
  const scale = 1 + (wave - 1) * 0.08;
  return base.map((g) => ({
    type: g.type,
    count: g.count,
    scale,
  }));
}

export function summarizeComposition(groups) {
  const parts = [];
  groups.forEach((g) => {
    const def = ENEMIES[g.type];
    parts.push(`${def.name} ×${g.count}`);
  });
  return parts.join(" · ");
}

export function getScoutAugments(groups, pickedIds = [], wave = 1) {
  const types = new Set(groups.map((g) => g.type));
  const taken = new Set(pickedIds);
  let pool = AUGMENTS.filter((c) => !taken.has(c.id) && augmentMatchesWave(c, types));
  if (pool.length < 3) {
    pool = AUGMENTS.filter((c) => !taken.has(c.id));
  }

  const tierWeight = (aug) => {
    let w = 1;
    if (aug.tier === "prismatic" && wave >= 5) w += 1.4;
    if (aug.tier === "prismatic" && wave < 4) w *= 0.35;
    if (aug.tier === "silver" && wave <= 2) w += 0.8;
    if (isAugmentRecommended(aug, types)) w += 1.2;
    return w;
  };

  const weighted = [];
  pool.forEach((aug) => {
    const n = Math.max(1, Math.round(tierWeight(aug) * 2));
    for (let i = 0; i < n; i++) weighted.push(aug);
  });

  const out = [];
  const used = new Set();
  while (out.length < 3 && weighted.length) {
    const i = Math.floor(Math.random() * weighted.length);
    const cand = weighted[i];
    weighted.splice(i, 1);
    if (used.has(cand.id)) continue;
    used.add(cand.id);
    out.push(cand);
  }
  return out;
}

/** @deprecated */
export function getScoutCounters(groups) {
  return getScoutAugments(groups, [], 1);
}

export function compositionRoles(groups) {
  return groups.map((g) => {
    const d = ENEMIES[g.type];
    return { ...d, type: g.type, count: g.count };
  });
}
