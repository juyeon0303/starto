import { ENEMIES } from "./data.js";
import { worldToScreen } from "./iso.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function weaponEdge(ctx, width = 1.25) {
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawEnemyCore(ctx, r, color, glow) {
  ctx.fillStyle = shade(color, -35);
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.55);
  ctx.lineTo(r * 0.35, r * 0.55);
  ctx.lineTo(r * 0.28, -r * 0.15);
  ctx.lineTo(-r * 0.28, -r * 0.15);
  ctx.closePath();
  ctx.fill();

  const head = ctx.createRadialGradient(0, -r * 0.45, 0, 0, -r * 0.45, r * 0.38);
  head.addColorStop(0, shade(color, 40));
  head.addColorStop(0.6, color);
  head.addColorStop(1, shade(color, -35));
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.48, r * 0.07, 0, Math.PI * 2);
  ctx.arc(r * 0.12, -r * 0.48, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEnemyArt(ctx, e, time, opts = {}) {
  const atOrigin = opts.atOrigin ?? false;

  if (e.state === "windup") {
    const len = e.type === "boss" ? 120 : 90;
    const a = worldToScreen(e.x, e.y, 0);
    const b = worldToScreen(
      e.x + Math.cos(e.chargeAngle) * len,
      e.y + Math.sin(e.chargeAngle) * len,
      0
    );
    ctx.strokeStyle = "rgba(255, 45, 85, 0.9)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff2d55";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const def = ENEMIES[e.type] || {};
  const glow = def.glow || e.color;
  const phase = e.anim ?? 0;
  const bob = Math.sin(time * 4 + phase) * 1.5;
  const face = e.faceAngle ?? 0;

  ctx.save();
  if (!atOrigin) ctx.translate(e.x, e.y + bob);
  else ctx.translate(0, bob);
  ctx.rotate(face);

  if (e.state === "windup") {
    ctx.globalAlpha = 0.35 + Math.sin(time * 16) * 0.2;
    ctx.strokeStyle = "#ff2d55";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(-e.radius - 8, -e.radius - 8);
    ctx.lineTo(e.radius + 8, -e.radius - 8);
    ctx.lineTo(e.radius + 8, e.radius + 8);
    ctx.lineTo(-e.radius - 8, e.radius + 8);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.shadowColor = glow;
  ctx.shadowBlur = e.type === "boss" ? 22 : 10;

  switch (e.type) {
    case "charger":
      drawCharger(ctx, e, glow, time, phase);
      break;
    case "archer":
      drawArcher(ctx, e, glow, time);
      break;
    case "bulwark":
      drawBulwark(ctx, e, glow, time);
      break;
    case "skirmisher":
      drawSkirmisher(ctx, e, glow, time, phase);
      break;
    case "caster":
      drawCaster(ctx, e, glow, time, phase);
      break;
    case "boss":
      drawBoss(ctx, e, glow, time, phase);
      break;
    default:
      drawGeneric(ctx, e, glow);
  }

  ctx.shadowBlur = 0;

  if (e.stun > 0) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75 + Math.sin(time * 18) * 0.2;
    ctx.beginPath();
    ctx.rect(-e.radius - 4, -e.radius - 6, (e.radius + 4) * 2, (e.radius + 6) * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawCharger(ctx, e, glow, time, phase) {
  const r = e.radius;
  drawEnemyCore(ctx, r, e.color, glow);

  ctx.fillStyle = shade(e.color, -20);
  ctx.beginPath();
  ctx.moveTo(r * 0.15, -r * 0.2);
  ctx.lineTo(r * 1.55, -r * 0.08);
  ctx.lineTo(r * 1.65, r * 0.08);
  ctx.lineTo(r * 0.15, r * 0.2);
  ctx.closePath();
  ctx.fill();
  weaponEdge(ctx);

  ctx.fillStyle = "#cfd8dc";
  ctx.fillRect(r * 0.05, -r * 0.34, r * 0.14, r * 0.68);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r * 0.05, -r * 0.34, r * 0.14, r * 0.68);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(r * 1.55, -r * 0.22);
  ctx.lineTo(r * 1.85, 0);
  ctx.lineTo(r * 1.55, r * 0.22);
  ctx.closePath();
  ctx.fill();
  weaponEdge(ctx, 1);

  ctx.globalAlpha = 0.35 + Math.sin(time * 8 + phase) * 0.15;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 1.85, -r * 0.35);
  ctx.lineTo(r * 2.05, 0);
  ctx.lineTo(r * 1.85, r * 0.35);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawArcher(ctx, e, glow, time) {
  const r = e.radius;
  drawEnemyCore(ctx, r * 0.95, e.color, glow);

  ctx.fillStyle = shade(e.color, -45);
  ctx.fillRect(-r * 0.55, -r * 0.15, r * 0.35, r * 0.55);

  ctx.strokeStyle = glow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(r * 0.42, 0, r * 1.05, -1.25, 1.25);
  weaponEdge(ctx, 1.5);

  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, 0);
  ctx.lineTo(r * 1.35, 0);
  ctx.stroke();
  weaponEdge(ctx);

  ctx.fillStyle = "#eceff1";
  ctx.beginPath();
  ctx.moveTo(r * 1.28, 0);
  ctx.lineTo(r * 1.62, -r * 0.1);
  ctx.lineTo(r * 1.62, r * 0.1);
  ctx.closePath();
  ctx.fill();
  weaponEdge(ctx);

  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.5 + Math.sin(time * 6) * 0.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.42 + r * 1.05 * Math.cos(-0.4), r * 1.05 * Math.sin(-0.4));
  ctx.lineTo(r * 0.42 + r * 1.05 * Math.cos(0.4), r * 1.05 * Math.sin(0.4));
  ctx.lineTo(r * 1.35, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBulwark(ctx, e, glow) {
  const r = e.radius;
  drawEnemyCore(ctx, r * 0.85, e.color, glow);

  ctx.fillStyle = shade(e.color, -40);
  ctx.fillRect(-r * 1.35, -r * 1.05, r * 0.72, r * 2.1);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-r * 1.35, -r * 1.05, r * 0.72, r * 2.1);
  weaponEdge(ctx, 1.5);

  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(-r * 1.05, -r * 0.35, r * 0.38, r * 0.7);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = shade(e.color, 35);
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 1.22, i * r * 0.38);
    ctx.lineTo(-r * 0.72, i * r * 0.38);
    ctx.stroke();
  }

  ctx.fillStyle = "#b0bec5";
  ctx.beginPath();
  ctx.moveTo(r * 0.35, -r * 0.55);
  ctx.lineTo(r * 0.35, r * 0.55);
  ctx.lineTo(r * 1.15, r * 0.35);
  ctx.lineTo(r * 1.15, -r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  weaponEdge(ctx);

  ctx.fillStyle = glow;
  ctx.fillRect(r * 0.55, -r * 0.75, r * 0.12, r * 1.5);
}

function drawSkirmisher(ctx, e, glow, time, phase) {
  const r = e.radius;
  drawEnemyCore(ctx, r * 0.82, e.color, glow);

  ctx.fillStyle = shade(e.color, -55);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.75);
  ctx.lineTo(r * 0.35, -r * 0.1);
  ctx.lineTo(0, r * 0.2);
  ctx.lineTo(-r * 0.35, -r * 0.1);
  ctx.closePath();
  ctx.fill();

  const sway = Math.sin(time * 6 + phase) * 0.22;
  ctx.fillStyle = "#eceff1";
  ctx.beginPath();
  ctx.moveTo(r * (0.55 + sway), r * 0.05);
  ctx.lineTo(r * (1.45 + sway), r * 0.42);
  ctx.lineTo(r * (0.95 + sway), r * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  weaponEdge(ctx);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(r * (0.55 - sway), -r * 0.05);
  ctx.lineTo(r * (1.45 - sway), -r * 0.42);
  ctx.lineTo(r * (0.95 - sway), -r * 0.58);
  ctx.closePath();
  ctx.fill();
  weaponEdge(ctx);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r * (0.95 + sway), r * 0.58);
  ctx.lineTo(r * (1.45 + sway), r * 0.42);
  ctx.moveTo(r * (0.95 - sway), -r * 0.58);
  ctx.lineTo(r * (1.45 - sway), -r * 0.42);
  ctx.stroke();
}

function drawCaster(ctx, e, glow, time, phase) {
  const r = e.radius;
  drawEnemyCore(ctx, r, e.color, glow);

  ctx.fillStyle = shade(e.color, -35);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.25);
  ctx.lineTo(r * 0.55, r * 0.75);
  ctx.lineTo(-r * 0.55, r * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.35, r * 0.55);
  ctx.lineTo(r * 0.35, -r * 1.35);
  ctx.stroke();
  weaponEdge(ctx, 1.5);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 1.35, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const a = time * 2 + phase + (i * Math.PI * 2) / 3;
    const ox = r * 0.35 + Math.cos(a) * r * 0.55;
    const oy = -r * 1.35 + Math.sin(a) * r * 0.35;
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.55 + Math.sin(time * 5 + i) * 0.25;
    ctx.beginPath();
    ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBoss(ctx, e, glow, time, phase) {
  const r = e.radius;
  drawEnemyCore(ctx, r * 1.05, e.color, glow);

  ctx.fillStyle = shade(e.color, -30);
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.15);
  ctx.lineTo(r * 0.55, -r * 0.15);
  ctx.lineTo(r * 0.45, r * 0.85);
  ctx.lineTo(-r * 0.45, r * 0.85);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 1.05);
  ctx.lineTo(0, -r * 1.35);
  ctx.lineTo(r * 0.35, -r * 1.05);
  ctx.lineTo(r * 0.15, -r * 0.75);
  ctx.lineTo(-r * 0.15, -r * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#cfd8dc";
  ctx.beginPath();
  ctx.moveTo(r * 0.25, -r * 0.35);
  ctx.lineTo(r * 0.25, r * 0.45);
  ctx.lineTo(r * 1.65, r * 0.15);
  ctx.lineTo(r * 1.75, -r * 0.05);
  ctx.lineTo(r * 1.45, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  weaponEdge(ctx, 1.5);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(r * 1.65, -r * 0.55);
  ctx.lineTo(r * 2.05, -r * 0.15);
  ctx.lineTo(r * 1.65, r * 0.25);
  ctx.closePath();
  ctx.fill();
  weaponEdge(ctx);

  ctx.globalAlpha = 0.2 + Math.sin(time * 3 + phase) * 0.1;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 1.1, -r * 0.5);
  ctx.lineTo(r * 2.1, -r * 0.5);
  ctx.lineTo(r * 2.1, r * 0.5);
  ctx.lineTo(-r * 1.1, r * 0.5);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawGeneric(ctx, e, glow) {
  drawEnemyCore(ctx, e.radius, e.color, glow);
  ctx.fillStyle = glow;
  ctx.fillRect(e.radius * 0.2, -e.radius * 0.12, e.radius * 0.9, e.radius * 0.24);
  weaponEdge(ctx);
}

export function updateEnemyFacing(e, player) {
  if (!player) return;
  const target = Math.atan2(player.y - e.y, player.x - e.x);
  e.faceAngle = e.faceAngle == null ? target : lerpAngle(e.faceAngle, target, 0.12);
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}
