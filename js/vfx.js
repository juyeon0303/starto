import {
  updateFx,
  drawFx,
  drawChampPlayer,
  drawChampProjectile,
  themeFor,
} from "./champ-vfx.js";
import { drawEnemyArt } from "./enemy-art.js";
import {
  worldToScreen,
  screenToWorld,
  arenaCornersWorld,
  entityLift,
  drawGroundShadow,
  drawIsoLine,
  drawIsoCircle,
  endIsoCircle,
  PLATFORM_DEPTH,
  ISO_SCALE,
} from "./iso.js";

export { screenToWorld };

export const PAD = 40;
export const W = 960;
export const H = 560;

const MAX_FLOAT_TEXTS = 18;
const MAX_RINGS = 12;
const MAX_SPARKS = 40;
const MAX_PARTICLES = 24;

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
  if (game.floatTexts.length > MAX_FLOAT_TEXTS) {
    game.floatTexts.splice(0, game.floatTexts.length - MAX_FLOAT_TEXTS);
  }
}

export function addRing(game, x, y, color, maxR = 60) {
  game.rings.push({ x, y, color, r: 8, maxR, t: 0.45 });
  if (game.rings.length > MAX_RINGS) {
    game.rings.splice(0, game.rings.length - MAX_RINGS);
  }
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
  if (game.sparks.length > MAX_SPARKS) {
    game.sparks.splice(0, game.sparks.length - MAX_SPARKS);
  }
}

export function spawnBurst(game, x, y, color, big = false) {
  addSparks(game, x, y, color, big ? 14 : 8);
  if (big) addRing(game, x, y, color, 90);
  game.particles.push({ x, y, t: big ? 0.5 : 0.32, color, big });
  if (game.particles.length > MAX_PARTICLES) {
    game.particles.splice(0, game.particles.length - MAX_PARTICLES);
  }
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
  const dpr = game.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.clearRect(0, 0, W, H);

  const shake = game.shake || 0;
  const sx = shake ? Math.sin(game.bgTime * 52) * shake * 1.15 : 0;
  const sy = shake ? Math.cos(game.bgTime * 47) * shake * 1.15 : 0;

  ctx.save();
  ctx.translate(sx, sy);

  drawArenaBg(ctx, game.bgTime, game.event?.id);
  drawIsoPlatform(ctx, game.bgTime);
  drawAmbientParticlesIso(ctx, game);

  const layers = [];
  const push = (wx, wy, lift, draw, bias = 0) => {
    layers.push({ depth: worldToScreen(wx, wy, lift).depth + bias, draw });
  };

  game.traps.forEach((t) => push(t.x, t.y, 0, () => drawTrapIso(ctx, t, game.bgTime), -0.5));
  game.zones.forEach((z) => push(z.x, z.y, 0, () => drawZoneIso(ctx, z, game.bgTime), -0.4));

  game.rings.forEach((r) =>
    push(r.x, r.y, 0, () => {
      ctx.globalAlpha = r.t * 0.7;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10;
      drawIsoCircle(ctx, r.x, r.y, r.r, 0);
      ctx.stroke();
      endIsoCircle(ctx);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    })
  );

  game.trails.forEach((tr) =>
    push(tr.x2, tr.y2, 2, () => {
      ctx.globalAlpha = tr.life * 0.5;
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = tr.width;
      drawIsoLine(ctx, tr.x1, tr.y1, tr.x2, tr.y2, 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    })
  );

  game.enemyProjectiles.forEach((pr) =>
    push(pr.x, pr.y, 10, () => drawProjectileIso(ctx, pr, false))
  );

  game.enemies.forEach((e) => {
    const lift = entityLift(e.radius);
    push(e.x, e.y, lift, () => {
      drawGroundShadow(ctx, e.x, e.y, e.radius);
      const body = worldToScreen(e.x, e.y, lift);
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.scale(1.06, 1.06);
      drawEnemyArt(ctx, e, game.bgTime, { atOrigin: true });
      ctx.restore();
    });
    push(e.x, e.y, lift + 34, () => {
      const hp = worldToScreen(e.x, e.y, lift + 36);
      const pct = e.hp / e.maxHp;
      if (e.hpTrail == null) e.hpTrail = pct;
      e.hpTrail += (pct - e.hpTrail) * 0.18;
      drawHpBar(ctx, hp.x, hp.y, 54, 8, pct, "#ff6b81", {
        autoColor: true,
        showText: true,
        hp: e.hp,
        maxHp: e.maxHp,
        trailPct: e.hpTrail,
      });
    }, 0.01);
  });

  if (game.player) {
    const p = game.player;
    const th = themeFor(game.champion);
    const lift = entityLift(p.radius);
    push(p.x, p.y, lift, () => {
      drawGroundShadow(ctx, p.x, p.y, p.radius);
      const body = worldToScreen(p.x, p.y, lift);
      ctx.save();
      ctx.translate(body.x, body.y);
      drawChampPlayer(ctx, { ...p, x: 0, y: 0 }, game.champion, game.bgTime, game.invuln, game.smokeTimer);
      ctx.restore();
    });
    push(p.x, p.y, lift + 40, () => {
      const hp = worldToScreen(p.x, p.y, lift + 42);
      const pct = p.hp / p.maxHp;
      if (p.hpTrail == null) p.hpTrail = pct;
      p.hpTrail += (pct - p.hpTrail) * 0.22;
      drawHpBar(ctx, hp.x, hp.y, 68, 9, pct, th.accent, {
        glow: true,
        autoColor: true,
        showText: true,
        hp: p.hp,
        maxHp: p.maxHp,
        trailPct: p.hpTrail,
      });
    }, 0.02);
  }

  game.sparks.forEach((s) =>
    push(s.x, s.y, 8, () => {
      const p = worldToScreen(s.x, s.y, 8);
      ctx.globalAlpha = s.t;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 5;
      ctx.fillRect(p.x, p.y, s.size, s.size);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    })
  );

  game.particles.forEach((fx) =>
    push(fx.x, fx.y, 6, () => drawParticleIso(ctx, fx))
  );

  game.projectiles.forEach((pr) =>
    push(pr.x, pr.y, 12, () => drawProjectileIso(ctx, pr, true))
  );

  layers.sort((a, b) => a.depth - b.depth);
  layers.forEach((l) => {
    ctx.save();
    try {
      l.draw();
    } finally {
      ctx.restore();
    }
  });
  drawFx(ctx, game);

  game.floatTexts.forEach((f) => {
    const p = worldToScreen(f.x, f.y, entityLift(16) + 20);
    ctx.globalAlpha = Math.min(1, f.t * 2);
    ctx.font = `bold ${f.size}px Syne, Malgun Gothic, sans-serif`;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 6;
    ctx.fillText(f.text, p.x, p.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });

  drawArenaBorderIso(ctx, game.bgTime);
  drawTopBannerIso(ctx, game);

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

  drawArenaPillarsIso(ctx, time);
}

function drawArenaPillarsIso(ctx, time) {
  arenaCornersWorld().forEach(([x, y], i) => {
    const base = worldToScreen(x, y, 0);
    const pulse = 0.65 + Math.sin(time * 1.8 + i) * 0.2;
    ctx.save();
    ctx.translate(base.x, base.y - 28);
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

function drawIsoPlatform(ctx, time) {
  const tl = worldToScreen(PAD, PAD, 0);
  const tr = worldToScreen(W - PAD, PAD, 0);
  const br = worldToScreen(W - PAD, H - PAD, 0);
  const bl = worldToScreen(PAD, H - PAD, 0);
  const d = PLATFORM_DEPTH;

  ctx.fillStyle = "#060910";
  ctx.beginPath();
  ctx.moveTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(br.x, br.y + d);
  ctx.lineTo(tr.x, tr.y + d);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0a1018";
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(br.x, br.y + d);
  ctx.lineTo(bl.x, bl.y + d);
  ctx.closePath();
  ctx.fill();

  const topGrad = ctx.createLinearGradient(tl.x, tl.y, br.x, br.y);
  topGrad.addColorStop(0, "#1e293b");
  topGrad.addColorStop(0.5, "#141c2b");
  topGrad.addColorStop(1, "#0f1724");
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();

  if (arenaImgReady) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(ARENA_IMG, tl.x, tl.y - 20, tr.x - tl.x + 40, br.y - tl.y + 40);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;
  const tile = 56;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const a = worldToScreen(PAD + (W - PAD * 2) * t, PAD, 0);
    const b = worldToScreen(PAD + (W - PAD * 2) * t, H - PAD, 0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const c = worldToScreen(PAD, PAD + (H - PAD * 2) * t, 0);
    const e = worldToScreen(W - PAD, PAD + (H - PAD * 2) * t, 0);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.35 + Math.sin(time * 2) * 0.08;
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawAmbientParticlesIso(ctx, game) {
  if (!game.ambientParticles) return;
  for (const p of game.ambientParticles) {
    const s = worldToScreen(p.x, p.y, 4 + Math.sin(p.a) * 3);
    ctx.globalAlpha = 0.25 + Math.sin(p.a) * 0.2;
    ctx.fillStyle = `hsla(${p.hue}, 90%, 72%, 0.9)`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawTrapIso(ctx, t, time) {
  const pulse = Math.sin(time * 4 + t.x) * 0.15 + 0.85;
  ctx.globalAlpha = 0.2 * pulse;
  ctx.fillStyle = "#69f0ae";
  drawIsoCircle(ctx, t.x, t.y, t.r, 0);
  ctx.fill();
  endIsoCircle(ctx);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#69f0ae";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  drawIsoCircle(ctx, t.x, t.y, t.r, 0);
  ctx.stroke();
  endIsoCircle(ctx);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawZoneIso(ctx, z, time) {
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
    drawIsoCircle(ctx, z.x, z.y, z.r * (0.85 + p * 0.15), 0);
    ctx.stroke();
    endIsoCircle(ctx);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  } else if (hostile) {
    ctx.globalAlpha = 0.35 + Math.sin(time * 8) * 0.08;
    ctx.fillStyle = "rgba(255, 45, 85, 0.35)";
    drawIsoCircle(ctx, z.x, z.y, z.r, 0);
    ctx.fill();
    endIsoCircle(ctx);
  } else {
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = base;
    ctx.lineWidth = 2;
    ctx.shadowColor = base;
    ctx.shadowBlur = 14;
    drawIsoCircle(ctx, z.x, z.y, z.r, 0);
    ctx.stroke();
    endIsoCircle(ctx);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawProjectileIso(ctx, pr, friendly) {
  const lift = friendly ? 14 : 10;
  const pos = worldToScreen(pr.x, pr.y, lift);
  drawGroundShadow(ctx, pr.x, pr.y, pr.radius * 0.55);
  if (friendly) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    drawChampProjectile(ctx, { ...pr, x: 0, y: 0 });
    ctx.restore();
    return;
  }
  const ang = Math.atan2(pr.vy, pr.vx);
  const color = "#ffb74d";
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, 4);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticleIso(ctx, fx) {
  ctx.globalAlpha = fx.big ? fx.t * 0.5 : fx.t;
  const r = fx.big ? 55 * (1 - fx.t) + 15 : 6;
  const p = worldToScreen(fx.x, fx.y, 8);
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * ISO_SCALE);
  g.addColorStop(0, fx.color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * ISO_SCALE, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawArenaBorderIso(ctx, time) {
  const pulse = 0.6 + Math.sin(time * 2.2) * 0.18;
  const corners = arenaCornersWorld();
  const pts = corners.map(([x, y]) => worldToScreen(x, y, 0));
  ctx.save();
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 18 * pulse;
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + pulse * 0.2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = "700 9px Syne, Malgun Gothic, sans-serif";
  ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
  ctx.fillText("ARENA", pts[0].x + 12, pts[0].y + 16);
  ctx.textAlign = "right";
  ctx.fillText("FLOOR", pts[2].x - 12, pts[2].y + 8);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawTopBannerIso(ctx, game) {
  const anchor = worldToScreen(PAD + 20, PAD + 12, 0);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(anchor.x, anchor.y, 340, 32);
  ctx.font = "600 13px Syne, Malgun Gothic, sans-serif";
  ctx.fillStyle = "#c8d6e5";
  ctx.fillText(game.message || "", anchor.x + 10, anchor.y + 21);

  if (game.runAugments?.length && game.state === "combat") {
    const right = worldToScreen(W - PAD - 20, PAD + 12, 0);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffd166";
    ctx.font = "600 12px Syne, Malgun Gothic, sans-serif";
    const last = game.runAugments[game.runAugments.length - 1];
    ctx.fillText(
      `◆ 증강 ${game.runAugments.length}/${8} · ${last.icon}${last.name}`,
      right.x,
      right.y + 21
    );
    ctx.textAlign = "left";
  }
}

function drawArenaPillars(ctx, time) {
  drawArenaPillarsIso(ctx, time);
}

function drawArenaFloor(ctx, time) {
  drawIsoPlatform(ctx, time);
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

  if (game.runAugments?.length && game.state === "combat") {
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffd166";
    ctx.font = "600 12px Syne, Malgun Gothic, sans-serif";
    const last = game.runAugments[game.runAugments.length - 1];
    ctx.fillText(
      `◆ 증강 ${game.runAugments.length}/8 · ${last.icon}${last.name}`,
      W - PAD - 12,
      PAD + 29
    );
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

function formatHpLabel(hp, maxHp) {
  const cur = Math.max(0, Math.ceil(hp));
  const max = Math.max(1, Math.round(maxHp));
  return max > 999 ? `${cur}` : `${cur}/${max}`;
}

function drawHpBar(ctx, x, y, w, h, pct, color, opts = {}) {
  const glow = opts.glow ?? false;
  const showText = opts.showText ?? false;
  const hp = opts.hp;
  const maxHp = opts.maxHp;
  const trail = opts.trailPct;

  const barW = w;
  const barH = h;
  const left = x - barW / 2;
  const top = y;

  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(left - 3, top - 3, barW + 6, barH + 6);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(left - 1, top - 1, barW + 2, barH + 2);

  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(left, top, barW, barH);

  if (trail != null && trail > pct) {
    ctx.fillStyle = "rgba(255, 80, 100, 0.55)";
    ctx.fillRect(left, top, barW * Math.max(0, trail), barH);
  }

  let fill = color;
  if (opts.autoColor) {
    if (pct <= 0.25) fill = "#ff1744";
    else if (pct <= 0.5) fill = "#ff9100";
    else if (pct <= 0.75) fill = "#ffca28";
    else fill = glow ? color : "#69f0ae";
  }

  if (glow) {
    ctx.shadowColor = fill;
    ctx.shadowBlur = 12;
  }

  const grad = ctx.createLinearGradient(left, top, left + barW, top);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, glow ? fill : shadeHex(fill, 30));
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, barW * Math.max(0, pct), barH);
  ctx.shadowBlur = 0;

  if (showText && hp != null && maxHp != null) {
    const label = formatHpLabel(hp, maxHp);
    ctx.font = `bold ${barH >= 7 ? 11 : 10}px Syne, Malgun Gothic, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillText(label, x + 1, top - 4);
    ctx.fillStyle = pct <= 0.3 ? "#ffcdd2" : "#fff";
    ctx.fillText(label, x, top - 5);
    ctx.textAlign = "left";
  }
}

function shadeHex(hex, amt) {
  if (!hex.startsWith("#")) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

export function addTrail(game, x1, y1, x2, y2, color, width = 3) {
  game.trails.push({ x1, y1, x2, y2, color, width, life: 0.2 });
}
