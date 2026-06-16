/** 평타 DPS·사거리 대략 비교 */
import { CHAMPIONS, ENEMIES, getWaveComposition } from "../js/data.js";

const BASIC = 1.05;

for (const c of CHAMPIONS) {
  const hit = c.damage * BASIC;
  const dps = hit * c.spaceRate;
  const ranged = ["bolt", "shot", "zap"].includes(c.spaceType);
  console.log(
    `${c.name.padEnd(5)} hit=${hit.toFixed(2)} dps=${dps.toFixed(1)} range=${c.range} type=${c.spaceType} spd=${c.speed}${ranged ? " [RANGED]" : ""}`
  );
}

console.log("\nWave 4 sample (boss wave):");
const w4 = getWaveComposition(4);
for (const g of w4) {
  const e = ENEMIES[g.type];
  const hp = e.hp * g.scale;
  console.log(`  ${e.name} x${g.count} hp=${hp.toFixed(0)} spd=${e.speed}`);
}
