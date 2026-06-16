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

export function clearTransientVfx(game) {
  game.fx = [];
  game.particles = [];
  game.rings = [];
  game.sparks = [];
  game.trails = [];
  game.floatTexts = [];
  game.flash = 0;
  game.shake = 0;
}

export function resetDrawState(ctx) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.setLineDash([]);
  ctx.filter = "none";
}

function shouldDrawPlayer(game) {
  return !!game.player && (game.state === "combat" || game.state === "scout");
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

  game.particles = (game.particles || []).filter((fx) => {
    fx.t -= dt;
    return fx.t > 0;
  });

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

function drawLayerList(ctx, layers) {
  layers.sort((a, b) => a.depth - b.depth);
  for (const l of layers) {
    ctx.save();
    try {
      resetDrawState(ctx);
      l.draw();
    } finally {
      ctx.restore();
      resetDrawState(ctx);
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
  darkenOutsideArena(ctx);
  drawAmbientParticlesIso(ctx, game);
  if (game.state === "combat" && game.player) {
    drawBasicRangeIndicator(ctx, game);
  }

  const groundLayers = [];
  const entityLayers = [];
  const pushGround = (wx, wy, lift, draw, bias = 0) => {
    groundLayers.push({ depth: worldToScreen(wx, wy, lift).depth + bias, draw });
  };
  const pushEntity = (wx, wy, lift, draw, bias = 0) => {
    entityLayers.push({ depth: worldToScreen(wx, wy, lift).depth + bias, draw });
  };

  game.traps.forEach((t) => pushGround(t.x, t.y, 0, () => drawTrapIso(ctx, t, game.bgTime), -0.5));
  game.zones.forEach((z) => pushGround(z.x, z.y, 0, () => drawZoneIso(ctx, z, game.bgTime), -0.4));

  if (game.pickups?.length) {
    game.pickups.forEach((pick) =>
      pushGround(pick.x, pick.y, 4, () => drawPickupIso(ctx, pick, game.bgTime), -0.2)
    );
  }

  game.rings.forEach((r) =>
    pushGround(r.x, r.y, 0, () => {
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
    pushGround(tr.x2, tr.y2, 2, () => {
      ctx.globalAlpha = tr.life * 0.5;
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = tr.width;
      drawIsoLine(ctx, tr.x1, tr.y1, tr.x2, tr.y2, 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    })
  );

  game.sparks.forEach((s) =>
    pushGround(s.x, s.y, 8, () => {
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
    pushGround(fx.x, fx.y, 6, () => drawParticleIso(ctx, fx))
  );

  game.enemies.forEach((e) => {
    const lift = entityLift(e.radius);
    pushEntity(e.x, e.y, lift, () => {
      drawGroundShadow(ctx, e.x, e.y, e.radius);
      const body = worldToScreen(e.x, e.y, lift);
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.scale(1.18, 1.18);
      drawEnemyArt(ctx, e, game.bgTime, { atOrigin: true });
      ctx.restore();
    });
    pushEntity(e.x, e.y, lift + 34, () => {
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

  if (shouldDrawPlayer(game)) {
    const p = game.player;
    const th = themeFor(game.champion);
    const lift = entityLift(p.radius);
    pushEntity(p.x, p.y, lift, () => {
      drawGroundShadow(ctx, p.x, p.y, p.radius);
      const body = worldToScreen(p.x, p.y, lift);
      ctx.save();
      ctx.translate(Math.round(body.x), Math.round(body.y));
      ctx.scale(1.14, 1.14);
      drawChampPlayer(ctx, { ...p, x: 0, y: 0 }, game.champion, game.bgTime, game.invuln, game.smokeTimer);
      ctx.restore();
    }, 0.015);
    if (game.state === "combat") {
      pushEntity(p.x, p.y, lift + 40, () => {
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
  }

  game.enemyProjectiles.forEach((pr) =>
    pushEntity(pr.x, pr.y, 14, () => drawProjectileIso(ctx, pr, false), 0.5)
  );

  game.projectiles.forEach((pr) =>
    pushEntity(pr.x, pr.y, 12, () => drawProjectileIso(ctx, pr, true))
  );

  drawLayerList(ctx, groundLayers);
  resetDrawState(ctx);
  if (game.state === "combat") {
    drawFx(ctx, game);
  }
  resetDrawState(ctx);
  drawLayerList(ctx, entityLayers);

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

function drawBasicRangeIndicator(ctx, game) {
  const p = game.player;
  const champ = game.champion;
  if (!p || !champ || typeof game.getBasicRangeVisual !== "function") return;

  const visual = game.getBasicRangeVisual();
  const th = themeFor(champ);
  const held = !!game.keys?.KeyJ;
  const pulse = 0.58 + Math.sin(game.bgTime * 3.2) * 0.14;
  const alpha = (held ? 0.62 : 0.34) * pulse;

  ctx.save();
  ctx.setLineDash([8, 7]);
  ctx.lineWidth = held ? 2.4 : 1.8;
  ctx.strokeStyle = th.glow;
  ctx.fillStyle = `${th.glow}22`;

  if (visual.kind === "arc") {
    ctx.globalAlpha = alpha;
    drawWorldArcZone(ctx, p.x, p.y, p.angle, visual.range, visual.arc, true);
  } else {
    strokeIsoRangeRing(ctx, p.x, p.y, visual.range, alpha);
    if (visual.sweetSpot) {
      ctx.globalAlpha = alpha * 0.45;
      ctx.setLineDash([4, 8]);
      strokeIsoRangeRing(ctx, p.x, p.y, visual.sweetSpot, alpha * 0.45);
      ctx.setLineDash([8, 7]);
    }
    if (visual.extra) {
      ctx.globalAlpha = alpha * 0.38;
      ctx.setLineDash([5, 9]);
      strokeIsoRangeRing(ctx, p.x, p.y, visual.extra, alpha * 0.38);
    }
  }

  ctx.globalAlpha = alpha * 0.85;
  ctx.setLineDash([]);
  ctx.lineWidth = held ? 2 : 1.5;
  const aimLift = entityLift(p.radius) * 0.35;
  const from = worldToScreen(p.x, p.y, aimLift);
  const tipR = visual.kind === "arc" ? visual.range * 0.82 : visual.range;
  const tip = worldToScreen(
    p.x + Math.cos(p.angle) * tipR,
    p.y + Math.sin(p.angle) * tipR,
    aimLift
  );
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  const label = game.basicRangeLabel?.() ?? "";
  if (label) {
    const tag = worldToScreen(
      p.x + Math.cos(p.angle) * visual.range * 0.62,
      p.y + Math.sin(p.angle) * visual.range * 0.62,
      aimLift + 8
    );
    ctx.font = "700 10px Syne, Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillText("J", tag.x + 1, tag.y + 1);
    ctx.fillStyle = held ? th.glow : "rgba(255, 255, 255, 0.88)";
    ctx.fillText("J", tag.x, tag.y);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

function strokeIsoRangeRing(ctx, wx, wy, radius, alpha) {
  ctx.globalAlpha = alpha;
  drawIsoCircle(ctx, wx, wy, radius, 0);
  ctx.stroke();
  endIsoCircle(ctx);
}

function drawWorldArcZone(ctx, wx, wy, angle, radius, span, fill = false) {
  const steps = 28;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = angle - span + ((span * 2) * i) / steps;
    const px = wx + Math.cos(t) * radius;
    const py = wy + Math.sin(t) * radius;
    const s = worldToScreen(px, py, 2);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
  const c = worldToScreen(wx, wy, 2);
  ctx.lineTo(c.x, c.y);
  ctx.closePath();
  if (fill) ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  const left = worldToScreen(wx + Math.cos(angle - span) * radius, wy + Math.sin(angle - span) * radius, 2);
  ctx.lineTo(left.x, left.y);
  ctx.moveTo(c.x, c.y);
  const right = worldToScreen(wx + Math.cos(angle + span) * radius, wy + Math.sin(angle + span) * radius, 2);
  ctx.lineTo(right.x, right.y);
  ctx.stroke();
}

function drawArenaBg(ctx, time, eventId) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, eventId === "surge" ? "#121028" : "#0a1420");
  sky.addColorStop(0.5, eventId === "rage" ? "#181018" : "#0c1522");
  sky.addColorStop(1, "#050810");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.5;
  const cy = H * 0.46;
  ctx.globalAlpha = 0.16;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
  glow.addColorStop(0, eventId === "surge" ? "rgba(192, 132, 252, 0.12)" : "rgba(56, 189, 248, 0.1)");
  glow.addColorStop(0.55, "rgba(8, 16, 28, 0.04)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 36; i++) {
    const sx = ((i * 137) % W) + Math.sin(time * 0.15 + i) * 2;
    const sy = ((i * 89) % (H - PAD * 2)) + PAD;
    const tw = 0.3 + Math.sin(time * 1.2 + i * 0.7) * 0.28;
    ctx.globalAlpha = tw * 0.55;
    ctx.fillStyle = i % 3 === 0 ? "#bae6fd" : "#e2e8f0";
    ctx.beginPath();
    ctx.arc(sx, sy, i % 5 === 0 ? 1.2 : 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.05;
  ctx.fillStyle = eventId === "rage" ? "#ff3366" : "#00d4ff";
  ctx.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);
  ctx.globalAlpha = 1;

  drawArenaPillarsIso(ctx, time);
}

/** 아레나 밖(캔버스 모서리) 밝기 편차 제거 */
function darkenOutsideArena(ctx) {
  const corners = arenaCornersWorld().map(([x, y]) => worldToScreen(x, y, 0));
  ctx.save();
  ctx.fillStyle = "rgba(4, 7, 14, 0.88)";
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fill("evenodd");
  ctx.restore();
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

function drawPickupIso(ctx, pick, time) {
  const bob = Math.sin(time * 3.5 + pick.bob) * 3;
  const pos = worldToScreen(pick.x, pick.y, 6 + bob);
  const pulse = 0.75 + Math.sin(time * 5 + pick.bob) * 0.2;
  const r = pick.radius * ISO_SCALE * (0.95 + pulse * 0.08);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.globalAlpha = 0.35 + pulse * 0.25;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
  g.addColorStop(0, pick.glow || pick.color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = pick.color;
  ctx.strokeStyle = pick.glow || "#fff";
  ctx.lineWidth = 2;
  ctx.shadowColor = pick.glow || pick.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = `${Math.round(r * 1.15)}px Syne, Malgun Gothic, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(pick.icon || "?", 0, 1);

  if (pick.kind === "heal" && pick.amount) {
    ctx.font = "bold 9px Syne, Malgun Gothic, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`+${pick.amount}`, 0, -r - 8);
  } else if (pick.kind === "buff") {
    ctx.font = "bold 8px Syne, Malgun Gothic, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(pick.name || "", 0, -r - 8);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.restore();
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
  const lift = friendly ? 14 : 12;
  const pos = worldToScreen(pr.x, pr.y, lift);
  drawGroundShadow(ctx, pr.x, pr.y, (pr.radius || 6) * 0.65);
  if (friendly) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    drawChampProjectile(ctx, { ...pr, x: 0, y: 0 });
    ctx.restore();
    return;
  }

  const ang = Math.atan2(pr.vy, pr.vx);
  const color = pr.color || "#ffb300";
  const glow = pr.glow || "#ff5722";
  const r = pr.radius || 11;
  const speed = Math.hypot(pr.vx, pr.vy) || 1;
  const tail = Math.min(28, 12 + speed * 0.04);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(ang);

  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 5;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(-tail, 0);
  ctx.lineTo(r * 0.4, 0);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(-tail * 0.45, 0, tail * 0.55, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 22;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#fff3e0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r + 4, 0);
  ctx.lineTo(-r * 0.35, r * 0.55);
  ctx.lineTo(-r * 0.15, 0);
  ctx.lineTo(-r * 0.35, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.15, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
  ctx.stroke();

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
