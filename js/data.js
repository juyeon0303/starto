export const WAVE_COUNT = 8;

export const CHAMPIONS = [
  {
    id: "blade",
    name: "검사",
    color: "#ff7043",
    glow: "#ffab91",
    hp: 130,
    speed: 215,
    damage: 9,
    range: 52,
    atkRate: 0.85,
    spaceName: "참격",
    spaceRate: 2.8,
    spaceType: "slash",
    skillName: "돌진 베기",
    skillCd: 3.2,
    skillDesc: "돌진 + 경로 적에게 큰 피해.",
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
    hp: 88,
    speed: 200,
    damage: 8,
    range: 165,
    atkRate: 0.7,
    spaceName: "마력탄",
    spaceRate: 2.5,
    spaceType: "bolt",
    skillName: "불꽃 폭발",
    skillCd: 4,
    skillDesc: "주변 전체 피해.",
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
    damage: 7,
    range: 48,
    atkRate: 1.1,
    spaceName: "급습",
    spaceRate: 3.1,
    spaceType: "stab",
    skillName: "그림자 일격",
    skillCd: 2.8,
    skillDesc: "가장 가까운 적 순간 접근.",
    skillType: "blink",
    skill2Name: "연막",
    skill2Cd: 4.5,
    skill2Desc: "0.6초 무적 + 앞으로 도약 (회피).",
    skill2Type: "smoke",
  },
  {
    id: "guardian",
    name: "수호자",
    color: "#78909c",
    glow: "#cfd8dc",
    hp: 175,
    speed: 180,
    damage: 8,
    range: 50,
    atkRate: 0.75,
    spaceName: "방패치기",
    spaceRate: 1.85,
    spaceType: "bash",
    skillName: "방패 강타",
    skillCd: 5,
    skillDesc: "주변 기절 + 무적 1.5초.",
    skillType: "slam",
    skill2Name: "도발",
    skill2Cd: 3.5,
    skill2Desc: "적을 자신 쪽으로 끌어당김.",
    skill2Type: "taunt",
  },
  {
    id: "archer",
    name: "궁수",
    color: "#66bb6a",
    glow: "#b9f6ca",
    hp: 92,
    speed: 225,
    damage: 7,
    range: 210,
    atkRate: 0.95,
    spaceName: "속사",
    spaceRate: 2.7,
    spaceType: "shot",
    skillName: "관통 사격",
    skillCd: 3.5,
    skillDesc: "관통 화살.",
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
    hp: 90,
    speed: 205,
    damage: 8,
    range: 150,
    atkRate: 0.8,
    spaceName: "전격",
    spaceRate: 2.5,
    spaceType: "zap",
    skillName: "연쇄 번개",
    skillCd: 4.2,
    skillDesc: "4명 연쇄.",
    skillType: "chain",
    skill2Name: "전기 장판",
    skill2Cd: 3,
    skill2Desc: "전방 전기 장판.",
    skill2Type: "field",
  },
];

/** 편성형 적 — 잡몹 떼 X */
export const ENEMIES = {
  charger: {
    name: "돌진병",
    role: "돌진",
    hint: "돌진 예고 후 직선 돌진",
    hp: 75,
    speed: 78,
    damage: 12,
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
    hp: 52,
    speed: 88,
    damage: 9,
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
    hp: 145,
    speed: 55,
    damage: 11,
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
    hp: 58,
    speed: 118,
    damage: 8,
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
    hp: 62,
    speed: 72,
    damage: 14,
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
    hp: 480,
    speed: 62,
    damage: 18,
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
  { id: "fog", name: "안개", desc: "스킬 사거리 -10%." },
  { id: "surge", name: "마력 surge", desc: "스킬 피해 +15%." },
  { id: "iron", name: "철의 밤", desc: "받는 피해 -12%." },
];

/** 웨이브별 편성 (고정 + 변수) */
export const WAVE_COMPOSITIONS = [
  [{ type: "skirmisher", count: 2 }, { type: "charger", count: 1 }],
  [{ type: "archer", count: 2 }, { type: "bulwark", count: 1 }],
  [{ type: "charger", count: 2 }, { type: "skirmisher", count: 1 }],
  [{ type: "boss", count: 1 }, { type: "archer", count: 1 }],
  [{ type: "bulwark", count: 1 }, { type: "caster", count: 1 }, { type: "skirmisher", count: 2 }],
  [{ type: "archer", count: 2 }, { type: "charger", count: 1 }, { type: "caster", count: 1 }],
  [{ type: "bulwark", count: 1 }, { type: "charger", count: 2 }, { type: "archer", count: 1 }, { type: "skirmisher", count: 1 }],
  [{ type: "boss", count: 1 }, { type: "charger", count: 1 }, { type: "caster", count: 1 }],
];

/** 스카웃 — 대응 카운터 */
export const COUNTERS = [
  {
    id: "brace",
    name: "방어 태세",
    desc: "돌진/보스 피해 35% 감소.",
    vs: ["charger", "boss"],
    fx: { chargeReduce: 0.35 },
  },
  {
    id: "pierce",
    name: "장갑 관통",
    desc: "중갑·보스에게 피해 +40%.",
    vs: ["bulwark", "boss"],
    fx: { armorBonus: 0.4 },
  },
  {
    id: "evade",
    name: "회피 집중",
    desc: "적 투사체 피해 55% 감소.",
    vs: ["archer"],
    fx: { projReduce: 0.55 },
  },
  {
    id: "purge",
    name: "정화의 손",
    desc: "장판 피해 60% 감소.",
    vs: ["caster", "boss"],
    fx: { zoneReduce: 0.6 },
  },
  {
    id: "hunt",
    name: "사냥 본능",
    desc: "기동대·사격수에게 피해 +30%.",
    vs: ["skirmisher", "archer"],
    fx: { huntBonus: 0.3 },
  },
  {
    id: "focus",
    name: "스킬 집중",
    desc: "이번 웨이브 스킬 피해 +25%.",
    vs: ["*"],
    fx: { skillBonus: 0.25 },
  },
  {
    id: "rush",
    name: "전술 가속",
    desc: "이동속도 +18%, 스킬 쿨 -12%.",
    vs: ["*"],
    fx: { speedBonus: 0.18, skillCdBonus: 0.12 },
  },
];

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
  const scale = 1 + (wave - 1) * 0.11;
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

export function getScoutCounters(groups) {
  const types = new Set(groups.map((g) => g.type));
  const matched = COUNTERS.filter(
    (c) => c.vs.includes("*") || c.vs.some((t) => types.has(t))
  );
  const picked = pickRandom(matched, Math.min(3, matched.length));
  while (picked.length < 3) {
    const extra = COUNTERS.find((c) => !picked.includes(c));
    if (!extra) break;
    picked.push(extra);
  }
  return picked.slice(0, 3);
}

export function compositionRoles(groups) {
  return groups.map((g) => {
    const d = ENEMIES[g.type];
    return { ...d, type: g.type, count: g.count };
  });
}
