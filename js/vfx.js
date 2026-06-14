import { ENEMIES } from "./data.js";
import {
  updateFx,
  drawFx,
  drawChampPlayer,
  drawChampProjectile,
  themeFor,
} from "./champ-vfx.js";

export const PAD = 40;
export const W = 960;
export const H = 560;

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
}

export function renderFrame(game, ctx) {
  ctx.clearRect(0, 0, W, H);

  const sx = game.shake ? (Math.random() - 0.5) * game.shake * 2.2 : 0;
  const sy = game.shake ? (Math.random() - 0.5) * game.shake * 2.2 : 0;

  ctx.save();
  ctx.translate(sx, sy);

  drawArenaBg(ctx, game.bgTime, game.event?.id);
  drawArenaFloor(ctx, game.bgTime);

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

  game.enemies.forEach((e) => drawEnemy(ctx, e, game.bgTime));

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
    drawHpBar(ctx, game.player.x, game.player.y - 32, 52, 6, game.player.hp / game.player.maxHp, th.accent, true);
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
  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, "#070a12");
  grd.addColorStop(0.5, eventId === "surge" ? "#120818" : "#0a0f18");
  grd.addColorStop(1, "#050810");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.07;
  const rg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 420);
  rg.addColorStop(0, eventId === "rage" ? "#ff3366" : "#00d4ff");
  rg.addColorStop(1, "transparent");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function drawArenaFloor(ctx, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD, PAD, W - PAD * 2, H - PAD * 2);
  ctx.clip();

  ctx.fillStyle = "#0c121c";
  ctx.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

  ctx.strokeStyle = "rgba(0, 212, 255, 0.06)";
  ctx.lineWidth = 1;
  const grid = 48;
  const off = (time * 12) % grid;
  for (let x = PAD - grid; x < W - PAD + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + off, PAD);
    ctx.lineTo(x + off, H - PAD);
    ctx.stroke();
  }
  for (let y = PAD - grid; y < H - PAD + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(PAD, y + off * 0.5);
    ctx.lineTo(W - PAD, y + off * 0.5);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, PAD);
  ctx.lineTo(W / 2, H - PAD);
  ctx.moveTo(PAD, H / 2);
  ctx.lineTo(W - PAD, H / 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawArenaBorder(ctx, time) {
  const pulse = 0.6 + Math.sin(time * 2) * 0.15;
  ctx.shadowColor = "#00d4ff";
  ctx.shadowBlur = 18 * pulse;
  ctx.strokeStyle = `rgba(0, 212, 255, ${0.45 + pulse * 0.2})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(PAD + 1, PAD + 1, W - PAD * 2 - 2, H - PAD * 2 - 2);
  ctx.shadowBlur = 0;

  [[PAD, PAD], [W - PAD, PAD], [PAD, H - PAD], [W - PAD, H - PAD]].forEach(([x, y]) => {
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 12;
    ctx.fillRect(x - 4, y - 4, 8, 8);
  });
  ctx.shadowBlur = 0;
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

function drawEnemy(ctx, e, time) {
  const def = ENEMIES[e.type] || {};
  const glow = def.glow || e.color;

  if (e.state === "windup") {
    const len = e.type === "boss" ? 120 : 90;
    ctx.strokeStyle = "rgba(255, 45, 85, 0.9)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff2d55";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + Math.cos(e.chargeAngle) * len, e.y + Math.sin(e.chargeAngle) * len);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.shadowColor = glow;
  ctx.shadowBlur = e.type === "boss" ? 28 : 14;
  ctx.fillStyle = e.color;
  drawEntityShape(ctx, e.x, e.y, e.radius, def.shape || "circle", e.pattern === "ranged" ? e.shootCd : 0);
  ctx.shadowBlur = 0;

  if (e.stun > 0) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawHpBar(ctx, e.x, e.y - e.radius - 14, 38, 5, e.hp / e.maxHp, "#ff2d55");
}

function drawProjectile(ctx, pr, friendly) {
  const tail = 14;
  const ang = Math.atan2(pr.vy, pr.vx);
  ctx.strokeStyle = friendly ? pr.color || "#00d4ff" : "#ffb74d";
  ctx.lineWidth = friendly ? 3 : 2;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(pr.x - Math.cos(ang) * tail, pr.y - Math.sin(ang) * tail);
  ctx.lineTo(pr.x, pr.y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, pr.radius + 1, 0, Math.PI * 2);
  ctx.fill();
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

function drawEntityShape(ctx, x, y, r, shape, cd = 0) {
  ctx.beginPath();
  switch (shape) {
    case "diamond":
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      break;
    case "hex":
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      break;
    case "square":
      ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      ctx.closePath();
      ctx.fill();
      if (cd > 0) {
        ctx.strokeStyle = "rgba(255, 200, 100, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2 * (1 - Math.min(1, cd / 1.8)));
        ctx.stroke();
      }
      return;
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fill();
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
