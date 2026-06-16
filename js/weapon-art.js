/** 공유 무기 실루엣 — 챔프·적 모두 사용 */

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

export function weaponShine(ctx, width = 1.2) {
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = width;
  ctx.stroke();
}

export function drawSword(ctx, { glow = "#ffab91", accent = "#ff7043", scale = 1 } = {}) {
  const s = scale;
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(-5 * s, 2 * s, 10 * s, 13 * s);
  ctx.strokeStyle = "#3e2723";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-4 * s, (3 + i * 2.2) * s);
    ctx.lineTo(4 * s, (4 + i * 2.2) * s);
    ctx.stroke();
  }

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(4 * s, -7 * s);
  ctx.lineTo(10 * s, -8 * s);
  ctx.lineTo(10 * s, 8 * s);
  ctx.lineTo(4 * s, 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const blade = ctx.createLinearGradient(8 * s, -15 * s, 40 * s, 12 * s);
  blade.addColorStop(0, "#ffffff");
  blade.addColorStop(0.25, "#eceff1");
  blade.addColorStop(0.55, "#b0bec5");
  blade.addColorStop(1, "#607d8b");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(8 * s, -15 * s);
  ctx.lineTo(40 * s, -1 * s);
  ctx.lineTo(8 * s, 11 * s);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(96,125,139,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(11 * s, -9 * s);
  ctx.lineTo(34 * s, 0);
  ctx.lineTo(11 * s, 9 * s);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(8 * s, -15 * s);
  ctx.lineTo(40 * s, -1 * s);
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(2 * s, 15 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBow(ctx, { cx = 10, cy = 0, r = 22, glow = "#b9f6ca", wood = "#6d4c41", scale = 1, time = 0 } = {}) {
  const s = scale;
  cx *= s;
  cy *= s;
  r *= s;

  ctx.strokeStyle = shade(glow, -30);
  ctx.lineWidth = 2.8 * s;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -1.28, 1.28);
  weaponShine(ctx, 1.4 * s);

  ctx.strokeStyle = wood;
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.moveTo(cx + r * Math.cos(-1.28), cy + r * Math.sin(-1.28));
  ctx.lineTo(cx + r * Math.cos(1.28), cy + r * Math.sin(1.28));
  ctx.stroke();

  ctx.fillStyle = "#5d4037";
  ctx.fillRect((cx - 6 * s), (-3 * s + cy), 8 * s, 6 * s);

  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(cx + r * Math.cos(-1.28), cy + r * Math.sin(-1.28));
  ctx.lineTo(cx + r * 0.55, cy);
  ctx.lineTo(cx + r * Math.cos(1.28), cy + r * Math.sin(1.28));
  ctx.stroke();

  const tipX = cx + r * 0.92;
  ctx.fillStyle = wood;
  ctx.fillRect((tipX - 14 * s), (-1.2 * s + cy), 28 * s, 2.4 * s);
  const head = ctx.createLinearGradient(tipX, cy, tipX + 10 * s, cy);
  head.addColorStop(0, "#cfd8dc");
  head.addColorStop(1, glow);
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.moveTo(tipX + 10 * s, cy);
  ctx.lineTo(tipX + 2 * s, cy - 4 * s);
  ctx.lineTo(tipX + 2 * s, cy + 4 * s);
  ctx.closePath();
  ctx.fill();
  weaponShine(ctx, 1 * s);

  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.35 + Math.sin(time * 6) * 0.15;
  ctx.beginPath();
  ctx.moveTo(cx + r * Math.cos(-0.35), cy + r * Math.sin(-0.35));
  ctx.lineTo(cx + r * Math.cos(0.35), cy + r * Math.sin(0.35));
  ctx.lineTo(tipX, cy);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawQuiver(ctx, { x = -8, y = -14, color = "#558b2f", scale = 1 } = {}) {
  const s = scale;
  ctx.fillStyle = shade(color, -20);
  ctx.beginPath();
  ctx.moveTo(x * s, y * s);
  ctx.lineTo((x + 6) * s, (y + 10) * s);
  ctx.lineTo((x + 2) * s, (y + 12) * s);
  ctx.lineTo((x - 4) * s, (y + 2) * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(color, 30);
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo((x + 1) * s, (y + 1 + i * 2.5) * s);
    ctx.lineTo((x + 5) * s, (y + 4 + i * 2.5) * s);
    ctx.stroke();
  }
}

export function drawStaff(ctx, { x = -14, yTop = -30, yBot = 8, glow = "#b388ff", scale = 1 } = {}) {
  const s = scale;
  const shaft = ctx.createLinearGradient(x * s, yBot * s, (x + 6) * s, yTop * s);
  shaft.addColorStop(0, "#5d4037");
  shaft.addColorStop(0.5, "#8d6e63");
  shaft.addColorStop(1, "#6d4c41");
  ctx.strokeStyle = shaft;
  ctx.lineWidth = 3.8 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x * s, yBot * s);
  ctx.lineTo(x * s, yTop * s);
  ctx.stroke();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = "#a1887f";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((x - 2) * s, (yBot - 4 - i * 7) * s);
    ctx.lineTo((x + 2) * s, (yBot - 6 - i * 7) * s);
    ctx.stroke();
  }

  const orbR = 6.5 * s;
  const orb = ctx.createRadialGradient(x * s, yTop * s, 0, x * s, yTop * s, orbR);
  orb.addColorStop(0, "#ffffff");
  orb.addColorStop(0.35, glow);
  orb.addColorStop(1, shade(glow, -40));
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(x * s, yTop * s, orbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
}

export function drawMagicBolt(ctx, { x = 18, y = -4, glow = "#b388ff", scale = 1 } = {}) {
  const s = scale;
  const orb = ctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, 5.5 * s);
  orb.addColorStop(0, "#ffffff");
  orb.addColorStop(0.4, glow);
  orb.addColorStop(1, shade(glow, -35));
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(x * s, y * s, 5.5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = glow;
  ctx.lineWidth = 2 * s;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 8 * s;
  ctx.beginPath();
  ctx.moveTo(x * s, y * s);
  ctx.lineTo((x + 12) * s, (y - 12) * s);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo((x + 4) * s, (y - 4) * s);
  ctx.lineTo((x + 10) * s, (y - 10) * s);
  ctx.stroke();
}

export function drawTwinDaggers(ctx, { glow = "#64ffda", scale = 1, sway = 0 } = {}) {
  const s = scale;
  const drawOne = (ySign) => {
    const bx = (14 + sway * ySign * 6) * s;
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(bx - 2 * s, ySign * 2 * s, 8 * s, 4 * s);
    const blade = ctx.createLinearGradient(bx, ySign * 10 * s, bx + 16 * s, ySign * 2 * s);
    blade.addColorStop(0, "#eceff1");
    blade.addColorStop(0.5, "#b0bec5");
    blade.addColorStop(1, glow);
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(bx, ySign * 12 * s);
    ctx.lineTo(bx + 20 * s, ySign * 10 * s);
    ctx.lineTo(bx, ySign * 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(bx, ySign * 12 * s);
    ctx.lineTo(bx + 20 * s, ySign * 10 * s);
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(bx - 2 * s, ySign * 3 * s);
    ctx.lineTo(bx + 2 * s, ySign * 5 * s);
    ctx.lineTo(bx - 2 * s, ySign * 7 * s);
    ctx.closePath();
    ctx.fill();
  };
  drawOne(1);
  drawOne(-1);
}

export function drawTowerShield(ctx, { x = -28, y = -16, w = 14, h = 32, glow = "#cfd8dc", color = "#546e7a", scale = 1 } = {}) {
  const s = scale;
  const face = ctx.createLinearGradient(x * s, y * s, (x + w) * s, (y + h) * s);
  face.addColorStop(0, shade(color, 20));
  face.addColorStop(0.5, color);
  face.addColorStop(1, shade(color, -25));
  ctx.fillStyle = face;
  ctx.fillRect(x * s, y * s, w * s, h * s);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2.5 * s;
  ctx.strokeRect(x * s, y * s, w * s, h * s);
  weaponShine(ctx, 1.3 * s);

  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.8;
  ctx.fillRect((x + w * 0.35) * s, (y + h * 0.38) * s, w * 0.3 * s, h * 0.24 * s);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = shade(color, 40);
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo((x + 2) * s, (y + h * 0.5 + i * h * 0.12) * s);
    ctx.lineTo((x + w - 2) * s, (y + h * 0.5 + i * h * 0.12) * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo((x + w * 0.5) * s, (y + 4) * s);
  ctx.lineTo((x + w * 0.5) * s, (y + h - 4) * s);
  ctx.moveTo((x + 3) * s, (y + h * 0.5) * s);
  ctx.lineTo((x + w - 3) * s, (y + h * 0.5) * s);
  ctx.stroke();
}

export function drawWarMace(ctx, { glow = "#cfd8dc", accent = "#78909c", scale = 1 } = {}) {
  const s = scale;
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(8 * s, -12 * s, 6 * s, 22 * s);
  ctx.strokeStyle = "#4e342e";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(9 * s, (-8 + i * 5) * s);
    ctx.lineTo(13 * s, (-6 + i * 5) * s);
    ctx.stroke();
  }

  const head = ctx.createRadialGradient(18 * s, -2 * s, 0, 18 * s, -2 * s, 10 * s);
  head.addColorStop(0, glow);
  head.addColorStop(0.6, accent);
  head.addColorStop(1, shade(accent, -30));
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.moveTo(8 * s, -8 * s);
  ctx.lineTo(8 * s, 6 * s);
  ctx.lineTo(30 * s, 4 * s);
  ctx.lineTo(32 * s, -2 * s);
  ctx.lineTo(30 * s, -8 * s);
  ctx.closePath();
  ctx.fill();
  weaponShine(ctx, 1.4 * s);

  ctx.fillStyle = glow;
  for (const py of [-7, -2, 3]) {
    ctx.beginPath();
    ctx.moveTo(26 * s, py * s);
    ctx.lineTo(32 * s, (py + 2) * s);
    ctx.lineTo(26 * s, (py + 4) * s);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawSpear(ctx, { glow = "#ffe082", color = "#ff5252", scale = 1, time = 0, phase = 0 } = {}) {
  const s = scale;
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 3 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(2 * s, 6 * s);
  ctx.lineTo(2 * s, -22 * s);
  ctx.stroke();

  const blade = ctx.createLinearGradient(2 * s, -22 * s, 28 * s, 0);
  blade.addColorStop(0, "#ffffff");
  blade.addColorStop(0.4, "#cfd8dc");
  blade.addColorStop(1, shade(color, -10));
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(2 * s, -22 * s);
  ctx.lineTo(28 * s, -4 * s);
  ctx.lineTo(28 * s, 4 * s);
  ctx.lineTo(2 * s, 6 * s);
  ctx.closePath();
  ctx.fill();
  weaponShine(ctx, 1.2 * s);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(24 * s, -6 * s);
  ctx.lineTo(30 * s, 0);
  ctx.lineTo(24 * s, 6 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#5d4037";
  ctx.fillRect(-1 * s, -4 * s, 6 * s, 10 * s);

  ctx.globalAlpha = 0.35 + Math.sin(time * 8 + phase) * 0.15;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(28 * s, -8 * s);
  ctx.lineTo(34 * s, 0);
  ctx.lineTo(28 * s, 8 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawHalberd(ctx, { glow = "#ffd166", color = "#ff5252", scale = 1 } = {}) {
  const s = scale;
  ctx.strokeStyle = "#6d4c41";
  ctx.lineWidth = 3.2 * s;
  ctx.beginPath();
  ctx.moveTo(2 * s, 8 * s);
  ctx.lineTo(2 * s, -18 * s);
  ctx.stroke();

  const axe = ctx.createLinearGradient(2 * s, -10 * s, 30 * s, 6 * s);
  axe.addColorStop(0, "#eceff1");
  axe.addColorStop(0.45, "#90a4ae");
  axe.addColorStop(1, shade(color, -15));
  ctx.fillStyle = axe;
  ctx.beginPath();
  ctx.moveTo(2 * s, -12 * s);
  ctx.lineTo(2 * s, 8 * s);
  ctx.lineTo(30 * s, 5 * s);
  ctx.lineTo(32 * s, -2 * s);
  ctx.lineTo(26 * s, -10 * s);
  ctx.closePath();
  ctx.fill();
  weaponShine(ctx, 1.3 * s);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(26 * s, -12 * s);
  ctx.lineTo(34 * s, -4 * s);
  ctx.lineTo(26 * s, 4 * s);
  ctx.closePath();
  ctx.fill();
  weaponShine(ctx, 1);
}

export function drawLightningStaff(ctx, { glow = "#82b1ff", color = "#42a5f5", scale = 1, time = 0 } = {}) {
  const s = scale;
  const shaft = ctx.createLinearGradient(4 * s, 8 * s, 8 * s, -28 * s);
  shaft.addColorStop(0, "#5d4037");
  shaft.addColorStop(1, "#8d6e63");
  ctx.strokeStyle = shaft;
  ctx.lineWidth = 3.2 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6 * s, 8 * s);
  ctx.lineTo(6 * s, -28 * s);
  ctx.stroke();

  const orb = ctx.createRadialGradient(6 * s, -28 * s, 0, 6 * s, -28 * s, 6 * s);
  orb.addColorStop(0, "#ffffff");
  orb.addColorStop(0.4, glow);
  orb.addColorStop(1, shade(color, -20));
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(6 * s, -28 * s, 5.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.3 * s;
  ctx.stroke();

  ctx.strokeStyle = glow;
  ctx.lineWidth = 2.2 * s;
  ctx.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    const ox = 6 + (-7 + i * 7);
    ctx.globalAlpha = 0.55 + Math.sin(time * 5 + i) * 0.3;
    ctx.beginPath();
    ctx.moveTo(ox * s, -28 * s);
    ctx.lineTo((ox + 5) * s, -16 * s);
    ctx.lineTo((ox - 3) * s, -12 * s);
    ctx.lineTo((ox + 7) * s, -2 * s);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
