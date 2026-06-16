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
    ctx.arc(0, 0, e.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.shadowColor = glow;
  ctx.shadowBlur = e.type === "boss" ? 26 : 14;

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
    ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawBodyBase(ctx, r, color, glow) {
  const g = ctx.createRadialGradient(0, -r * 0.2, 0, 0, 0, r * 1.2);
  g.addColorStop(0, shade(color, 35));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCharger(ctx, e, glow, time, phase) {
  const r = e.radius;
  drawBodyBase(ctx, r, e.color, glow);
  ctx.fillStyle = shade(e.color, -30);
  ctx.beginPath();
  ctx.moveTo(r * 0.2, -r * 0.55);
  ctx.lineTo(r * 1.15, -r * 0.15);
  ctx.lineTo(r * 0.95, r * 0.35);
  ctx.lineTo(r * 0.1, r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(r * 0.95, -r * 0.35);
  ctx.lineTo(r * 1.45, -r * 0.05);
  ctx.lineTo(r * 1.05, r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.75);
  ctx.lineTo(-r * 0.05, -r * 1.05);
  ctx.lineTo(r * 0.15, -r * 0.7);
  ctx.stroke();
  ctx.globalAlpha = 0.25 + Math.sin(time * 8 + phase) * 0.15;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(r * 1.1, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawArcher(ctx, e, glow) {
  const r = e.radius;
  drawBodyBase(ctx, r * 0.9, e.color, glow);
  ctx.fillStyle = shade(e.color, -40);
  ctx.beginPath();
  ctx.arc(0, -r * 0.15, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(r * 0.35, 0, r * 0.95, -1.15, 1.15);
  ctx.stroke();
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, 0);
  ctx.lineTo(r * 1.1, 0);
  ctx.stroke();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(r * 0.95, 0);
  ctx.lineTo(r * 1.35, -r * 0.12);
  ctx.lineTo(r * 1.35, r * 0.12);
  ctx.closePath();
  ctx.fill();
}

function drawBulwark(ctx, e, glow) {
  const r = e.radius;
  ctx.fillStyle = shade(e.color, -25);
  ctx.fillRect(-r * 0.55, -r * 0.95, r * 1.1, r * 1.9);
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.arc(0, -r * 0.35, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(e.color, -35);
  ctx.beginPath();
  ctx.arc(-r * 0.95, 0, r * 0.75, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(-r * 0.15, -r * 0.25, r * 0.55, r * 0.5);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = shade(e.color, 30);
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, i * r * 0.35);
    ctx.lineTo(r * 0.35, i * r * 0.35);
    ctx.stroke();
  }
}

function drawSkirmisher(ctx, e, glow, time, phase) {
  const r = e.radius;
  drawBodyBase(ctx, r * 0.85, e.color, glow);
  ctx.fillStyle = shade(e.color, -50);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.75);
  ctx.lineTo(r * 0.45, -r * 0.15);
  ctx.lineTo(0, r * 0.15);
  ctx.lineTo(-r * 0.45, -r * 0.15);
  ctx.closePath();
  ctx.fill();
  const sway = Math.sin(time * 6 + phase) * 0.25;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(r * (0.7 + sway), r * 0.1);
  ctx.lineTo(r * (1.35 + sway), r * 0.45);
  ctx.lineTo(r * (0.85 + sway), r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * (0.7 - sway), -r * 0.1);
  ctx.lineTo(r * (1.35 - sway), -r * 0.45);
  ctx.lineTo(r * (0.85 - sway), -r * 0.55);
  ctx.closePath();
  ctx.fill();
}

function drawCaster(ctx, e, glow, time, phase) {
  const r = e.radius;
  drawBodyBase(ctx, r, e.color, glow);
  ctx.fillStyle = shade(e.color, -35);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.05);
  ctx.lineTo(r * 0.75, r * 0.85);
  ctx.lineTo(-r * 0.75, r * 0.85);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = time * 2 + phase + (i * Math.PI * 2) / 3;
    const ox = Math.cos(a) * r * 0.95;
    const oy = Math.sin(a) * r * 0.55 - r * 0.1;
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.55 + Math.sin(time * 5 + i) * 0.25;
    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBoss(ctx, e, glow, time, phase) {
  const r = e.radius;
  ctx.fillStyle = shade(e.color, -30);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.15);
  ctx.lineTo(r * 0.95, -r * 0.35);
  ctx.lineTo(r * 0.75, r * 1.05);
  ctx.lineTo(-r * 0.75, r * 1.05);
  ctx.lineTo(-r * 0.95, -r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 1.25);
  ctx.lineTo(0, -r * 1.55);
  ctx.lineTo(r * 0.35, -r * 1.25);
  ctx.lineTo(r * 0.15, -r * 0.95);
  ctx.lineTo(-r * 0.15, -r * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.2 + Math.sin(time * 3 + phase) * 0.1;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.45, 2.5, 0, Math.PI * 2);
  ctx.arc(r * 0.22, -r * 0.45, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawGeneric(ctx, e, glow) {
  drawBodyBase(ctx, e.radius, e.color, glow);
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
