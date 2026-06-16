import {
  updateFx,
  drawFx,
  drawChampPlayer,
  drawChampProjectile,
  themeFor,
} from "./champ-vfx.js";
import { drawEnemyArt } from "./enemy-art.js";

export const PAD = 40;
export const W = 960;
export const H = 560;

const ARENA_IMG = new Image();
ARENA_IMG.src = "assets/images/sao-bg.jpg";
let arenaImgReady = false;
ARENA_IMG.onload = () => {
  arenaImgReady = true;
};

export function initVfx(game) {
  game.shake = 0;
  game.flash = 0;
  game.flashColor = "#fff";
  game.floatTexts = [];
  game.rings = [];
  game.sparks = [];
  game.trails = [];
  game.fx = [];
  game.bgTime = 0;
  game.ambientParticles = Array.from({ length: 28 }, () => ({
    x: PAD + Math.random() * (W - PAD * 2),
    y: PAD + Math.random() * (H - PAD * 2),
    r: 1 + Math.random() * 2.2,
    vy: -8 - Math.random() * 14,
    vx: (Math.random() - 0.5) * 6,
    hue: Math.random() > 0.5 ? 190 : 280,
    a: Math.random(),
  }));
}

export function addShake(game, amount) {
  game.shake = Math.min(12, game.shake + amount);
}

export function addFlash(game, color, amount = 0.35) {
  game.flash = Math.max(game.flash, amount);
  game.flashColor = color;
}

export function addFloatText(game, x, y, text, color = "#fff", size = 14) {
  game.floatTexts.push({ x, y: y - 8, text, color, size, t: 0.65, vy: -42 });
}

export function addRing(game, x, y, color, maxR = 60) {
  game.rings.push({ x, y, color, r: 8, maxR, t: 0.45 });
}

export function addSparks(game, x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 160;
    game.sparks.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color,
      t: 0.35 + Math.random() * 0.25,
      size: 2 + Math.random() * 2,
    });
  }
}

export function spawnBurst(game, x, y, color, big = false) {
  addSparks(game, x, y, color, big ? 18 : 10);
  if (big) addRing(game, x, y, color, 90);
  game.particles.push({ x, y, t: big ? 0.5 : 0.32, color, big });
}

export function updateVfx(game, dt) {
  game.bgTime += dt;
  game.shake *= 0.86;
  if (game.shake < 0.05) game.shake = 0;
  game.flash *= 0.9;

  game.floatTexts = game.floatTexts.filter((f) => {
    f.t -= dt;
    f.y += f.vy * dt;
    return f.t > 0;
  });

  game.rings = game.rings.filter((r) => {
    r.t -= dt;
    r.r += (r.maxR - r.r) * dt * 6;
    return r.t > 0;
  });

  game.sparks = game.sparks.filter((s) => {
    s.t -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.92;
    s.vy *= 0.92;
    return s.t > 0;
  });

  game.trails = game.trails.filter((t) => {
    t.life -= dt;
    return t.life > 0;
  });

  updateFx(game, dt);

  if (game.ambientParticles) {
    for (const p of game.ambientParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += dt * 0.4;
      if (p.y < PAD) {
        p.y = H - PAD;
        p.x = PAD + Math.random() * (W - PAD * 2);
      }
      if (p.x < PAD) p.x = W - PAD;
      if (p.x > W - PAD) p.x = PAD;
    }
  }
}

export function renderFrame(game, ctx) {
  ctx.clearRect(0, 0, W, H);

  const sx = game.shake ? (Math.random() - 0.5) * game.shake * 2.2 : 0;
  const sy = game.shake ? (Math.random() - 0.5) * game.shake * 2.2 : 0;

  ctx.save();
  ctx.translate(sx, sy);

  drawArenaBg(ctx, game.bgTime, game.event?.id);
  drawArenaFloor(ctx, game.bgTime);
  drawAmbientParticles(ctx, game);

  game.traps.forEach((t) => drawTrap(ctx, t, game.bgTime));
  game.zones.forEach((z) => drawZone(ctx, z, game.bgTime));

  game.rings.forEach((r) => {
    ctx.globalAlpha = r.t * 0.7;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });

  game.enemies.forEach((e) => {
    drawEnemyArt(ctx, e, game.bgTime);
    drawHpBar(ctx, e.x, e.y - e.radius - 16, 42, 5, e.hp / e.maxHp, "#ff6b81");
  });

  game.trails.forEach((tr) => {
    ctx.globalAlpha = tr.life * 0.5;
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = tr.width;
    ctx.beginPath();
    ctx.moveTo(tr.x1, tr.y1);
    ctx.lineTo(tr.x2, tr.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  game.enemyProjectiles.forEach((pr) => drawProjectile(ctx, pr, false));

  drawFx(ctx, game);

  game.projectiles.forEach((pr) => drawChampProjectile(ctx, pr));

  if (game.player) {
    const th = themeFor(game.champion);
    drawChampPlayer(ctx, game.player, game.champion, game.bgTime, game.invuln, game.smokeTimer);
    drawHpBar(ctx, game.player.x, game.player.y - 38, 56, 6, game.player.hp / game.player.maxHp, th.accent, true);
  }

  game.sparks.forEach((s) => {
    ctx.globalAlpha = s.t;
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(s.x, s.y, s.size, s.size);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });

  game.particles.forEach((fx) => drawParticle(ctx, fx));

  game.floatTexts.forEach((f) => {
    ctx.globalAlpha = Math.min(1, f.t * 2);
    ctx.font = `bold ${f.size}px Syne, Malgun Gothic, sans-serif`;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 10;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });

  drawArenaBorder(ctx, game.bgTime);
  drawTopBanner(ctx, game);

  ctx.restore();

  if (game.flash > 0.02) {
    ctx.fillStyle = game.flashColor;
    ctx.globalAlpha = game.flash * 0.35;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function drawArenaBg(ctx, time, eventId) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, eventId === "surge" ? "#1a1030" : "#0d1a2e");
  sky.addColorStop(0.35, eventId === "rage" ? "#241018" : "#122038");
  sky.addColorStop(0.72, "#0a1420");
  sky.addColorStop(1, "#050810");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.35;
  const sun = ctx.createRadialGradient(W * 0.72, H * 0.08, 0, W * 0.72, H * 0.08, 220);
  sun.addColorStop(0, eventId === "surge" ? "#c084fc" : "#7dd3fc");
  sun.addColorStop(0.4, "rgba(125, 211, 252, 0.08)");
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137) % W) + Math.sin(time * 0.15 + i) * 2;
    const sy = ((i * 89) % (H * 0.55)) + 12;
    const tw = 0.35 + Math.sin(time * 1.2 + i * 0.7) * 0.35;
    ctx.globalAlpha = tw * 0.7;
    ctx.fillStyle = i % 3 === 0 ? "#e0f2fe" : "#fff";
    ctx.beginPath();
    ctx.arc(sx, sy, i % 5 === 0 ? 1.4 : 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = eventId === "rage" ? "#ff3366" : "#00d4ff";
  ctx.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);
  ctx.globalAlpha = 1;

  drawArenaPillars(ctx, time);
}

function drawArenaPillars(ctx, time) {
  const corners = [
    [PAD + 6, PAD + 6],
    [W - PAD - 6, PAD + 6],
    [PAD + 6, H - PAD - 6],
    [W - PAD - 6, H - PAD - 6],
  ];
  corners.forEach(([x, y], i) => {
    const pulse = 0.65 + Math.sin(time * 1.8 + i) * 0.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.35 * pulse;
    const g = ctx.createLinearGradient(0, -28, 0, 28);
    g.addColorStop(0, "#7dd3fc");
    g.addColorStop(0.5, "#38bdf8");
    g.addColorStop(1, "rgba(14, 165, 233, 0.1)");
    ctx.fillStyle = g;
    ctx.fillRect(-3, -32, 6, 64);
    ctx.globalAlpha = 0.5 * pulse;
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -34, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawArenaFloor(ctx, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD, PAD, W - PAD * 2, H - PAD * 2);
  ctx.clip();

  const floor = ctx.createLinearGradient(PAD, PAD, PAD, H - PAD);
  floor.addColorStop(0, "#1a2438");
  floor.addColorStop(0.45, "#121a28");
  floor.addColorStop(1, "#0a1018");
  ctx.fillStyle = floor;
  ctx.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

  if (arenaImgReady) {
    ctx.globalAlpha = 0.22;
    ctx.drawImage(ARENA_IMG, PAD, PAD, W - PAD * 2, H - PAD * 2);
    ctx.globalAlpha = 1;
  }

  const tile = 64;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.07)";
  ctx.lineWidth = 1;
  for (let x = PAD; x < W - PAD; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, PAD);
    ctx.lineTo(x, H - PAD);
    ctx.stroke();
  }
  for (let y = PAD; y < H - PAD; y += tile) {
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 1.5;
  const grid = 48;
  const off = (time * 10) % grid;
  for (let x = PAD - grid; x < W - PAD + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + off, PAD);
    ctx.lineTo(x + off, H - PAD);
    ctx.stroke();
  }
  for (let y = PAD - grid; y < H - PAD + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(PAD, y + off * 0.35);
    ctx.lineTo(W - PAD, y + off * 0.35);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.18;
  const centerGlow = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 340);
  centerGlow.addColorStop(0, "rgba(56, 189, 248, 0.25)");
  centerGlow.addColorStop(0.55, "rgba(14, 165, 233, 0.06)");
  centerGlow.addColorStop(1, "transparent");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, PAD);
  ctx.lineTo(W / 2, H - PAD);
  ctx.moveTo(PAD, H / 2);
  ctx.lineTo(W - PAD, H / 2);
  ctx.stroke();

  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 6; i++) {
    const cx = PAD + 80 + ((i * 173) % (W - PAD * 2 - 160));
    const cy = PAD + 60 + ((i * 97) % (H - PAD * 2 - 120));
    ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy);
    ctx.lineTo(cx + 22, cy + 8);
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 6, cy + 16);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawAmbientParticles(ctx, game) {
  if (!game.ambientParticles) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD, PAD, W - PAD * 2, H - PAD * 2);
  ctx.clip();
  for (const p of game.ambientParticles) {
    ctx.globalAlpha = 0.25 + Math.sin(p.a) * 0.2;
    ctx.fillStyle = `hsla(${p.hue}, 90%, 72%, 0.9)`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawArenaBorder(ctx, time) {
  const pulse = 0.6 + Math.sin(time * 2.2) * 0.18;
  const inner = PAD + 3;
  const w = W - PAD * 2 - 6;
  const h = H - PAD * 2 - 6;

  ctx.save();
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 22 * pulse;
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(inner, inner, w, h);

  ctx.shadowColor = "#c084fc";
  ctx.shadowBlur = 14 * pulse;
  ctx.strokeStyle = `rgba(192, 132, 252, ${0.2 + pulse * 0.15})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(inner + 4, inner + 4, w - 8, h - 8);
  ctx.shadowBlur = 0;

  const corners = [
    [PAD, PAD],
    [W - PAD, PAD],
    [PAD, H - PAD],
    [W - PAD, H - PAD],
  ];
  corners.forEach(([x, y], i) => {
    ctx.fillStyle = i % 2 === 0 ? "#38bdf8" : "#c084fc";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 5, y - 5, 10, 10);
  });
  ctx.shadowBlur = 0;

  ctx.font = "700 9px Syne, Malgun Gothic, sans-serif";
  ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
  ctx.fillText("ARENA", PAD + 14, PAD + 22);
  ctx.textAlign = "right";
  ctx.fillText("FLOOR", W - PAD - 14, H - PAD - 10);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawTopBanner(ctx, game) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(PAD + 8, PAD + 8, 340, 32);
  ctx.font = "600 13px Syne, Malgun Gothic, sans-serif";
  ctx.fillStyle = "#c8d6e5";
  ctx.fillText(game.message || "", PAD + 18, PAD + 29);

  if (game.scoutCounter && game.state === "combat") {
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffd166";
    ctx.font = "600 12px Syne, Malgun Gothic, sans-serif";
    ctx.fillText(`◆ ${game.scoutCounter.name}`, W - PAD - 12, PAD + 29);
    ctx.textAlign = "left";
  }
}

function drawTrap(ctx, t, time) {
  const pulse = Math.sin(time * 4 + t.x) * 0.15 + 0.85;
  ctx.globalAlpha = 0.2 * pulse;
  const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
  g.addColorStop(0, "#69f0ae");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#69f0ae";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawZone(ctx, z, time) {
  const hostile = !z.friendly;
  const base = hostile ? "#ff2d55" : "#00d4ff";
  const tele = z.telegraph > 0;

  if (tele) {
    const p = 1 - z.telegraph / 1.2;
    ctx.globalAlpha = 0.25 + p * 0.35;
    ctx.strokeStyle = base;
    ctx.lineWidth = 2 + p * 2;
    ctx.shadowColor = base;
    ctx.shadowBlur = 20;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r * (0.85 + p * 0.15), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  } else if (hostile) {
    ctx.globalAlpha = 0.35 + Math.sin(time * 8) * 0.08;
    const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
    g.addColorStop(0, "rgba(255, 45, 85, 0.55)");
    g.addColorStop(0.7, "rgba(255, 45, 85, 0.15)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = base;
    ctx.lineWidth = 2;
    ctx.shadowColor = base;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawProjectile(ctx, pr, friendly) {
  const tail = friendly ? 16 : 12;
  const ang = Math.atan2(pr.vy, pr.vx);
  const color = friendly ? pr.color || "#00d4ff" : "#ffb74d";

  ctx.save();
  ctx.translate(pr.x, pr.y);
  ctx.rotate(ang);
  ctx.shadowColor = color;
  ctx.shadowBlur = friendly ? 14 : 10;

  if (friendly) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, pr.radius + 1, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 4);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#fff3e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(-4, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticle(ctx, fx) {
  ctx.globalAlpha = fx.big ? fx.t * 0.5 : fx.t;
  const r = fx.big ? 55 * (1 - fx.t) + 15 : 6;
  const g = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, r);
  g.addColorStop(0, fx.color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHpBar(ctx, x, y, w, h, pct, color, glow = false) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x - w / 2, y, w, h);
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, pct), h);
  ctx.shadowBlur = 0;
}

export function addTrail(game, x1, y1, x2, y2, color, width = 3) {
  game.trails.push({ x1, y1, x2, y2, color, width, life: 0.2 });
}
