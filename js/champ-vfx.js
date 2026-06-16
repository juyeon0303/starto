/** 챔프별 테마 · 인게임 실루엣 · 스킬 연출 */
import { worldToScreen, entityLift } from "./iso.js";

export const CHAMP_THEMES = {
  blade: {
    color: "#ff7043",
    glow: "#ffab91",
    accent: "#ffd166",
    slash: "#ffab40",
    proj: "blade",
  },
  mage: {
    color: "#7e57c2",
    glow: "#b388ff",
    accent: "#ea80fc",
    slash: "#ce93d8",
    proj: "orb",
  },
  rogue: {
    color: "#26a69a",
    glow: "#64ffda",
    accent: "#1de9b6",
    slash: "#4db6ac",
    proj: "dagger",
  },
  guardian: {
    color: "#78909c",
    glow: "#cfd8dc",
    accent: "#eceff1",
    slash: "#90a4ae",
    proj: "shield",
  },
  archer: {
    color: "#66bb6a",
    glow: "#b9f6ca",
    accent: "#aed581",
    slash: "#81c784",
    proj: "arrow",
  },
  storm: {
    color: "#42a5f5",
    glow: "#82b1ff",
    accent: "#448aff",
    slash: "#64b5f6",
    proj: "bolt",
  },
};

export function themeFor(champ) {
  return CHAMP_THEMES[champ?.id] || CHAMP_THEMES.blade;
}

export function addFx(game, fx) {
  if (!game.fx) game.fx = [];
  game.fx.push({ ...fx, t: fx.t ?? fx.maxT ?? 0.4 });
}

export function updateFx(game, dt) {
  if (!game.fx) return;
  game.fx = game.fx.filter((f) => {
    f.t -= dt;
    return f.t > 0;
  });
}

export function drawFx(ctx, game) {
  if (!game.fx) return;
  const time = game.bgTime || 0;
  for (const f of game.fx) {
    const life = f.t / (f.maxT || 0.4);
    const lift = f.kind === "afterimage" ? entityLift(16) : 4;
    ctx.save();
    switch (f.kind) {
      case "slashArc": {
        const c = worldToScreen(f.x, f.y, lift);
        ctx.translate(c.x, c.y);
        ctx.rotate(f.angle);
        ctx.globalAlpha = life * 0.9;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 5 + (1 - life) * 10;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.62, -f.span, f.span);
        ctx.stroke();
        ctx.globalAlpha = life * 0.35;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.45, -f.span * 0.85, f.span * 0.85);
        ctx.stroke();
        break;
      }
      case "spinSlash": {
        const c = worldToScreen(f.x, f.y, lift);
        const spin = (1 - life) * Math.PI * 2.4;
        ctx.translate(c.x, c.y);
        ctx.rotate(spin);
        ctx.globalAlpha = life * 0.85;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 5 + (1 - life) * 6;
        ctx.shadowColor = f.glow || f.color;
        ctx.shadowBlur = 24;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, f.r * (0.5 + i * 0.08), (Math.PI / 2) * i, (Math.PI / 2) * i + 1.2);
          ctx.stroke();
        }
        ctx.globalAlpha = life * 0.25;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = f.glow || f.color;
        ctx.fill();
        break;
      }
      case "ringBurst": {
        const c = worldToScreen(f.x, f.y, lift);
        const rad = f.r * (0.35 + (1 - life) * 0.65) * 0.55;
        ctx.globalAlpha = life * 0.7;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad);
        g.addColorStop(0, f.core || "#fff");
        g.addColorStop(0.35, f.color);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = life * 0.85;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3 + (1 - life) * 4;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "starBurst": {
        const c = worldToScreen(f.x, f.y, lift);
        ctx.translate(c.x, c.y);
        ctx.rotate(f.angle || 0);
        ctx.globalAlpha = life * 0.75;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 16;
        const rays = f.rays || 8;
        const len = f.r * (0.4 + (1 - life) * 0.5) * 0.55;
        for (let i = 0; i < rays; i++) {
          const a = (Math.PI * 2 * i) / rays;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
          ctx.stroke();
        }
        break;
      }
      case "magicCone": {
        const c = worldToScreen(f.x, f.y, lift);
        ctx.translate(c.x, c.y);
        ctx.rotate(f.angle);
        ctx.globalAlpha = life * 0.55;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r * 0.55);
        g.addColorStop(0, f.core || "#fff");
        g.addColorStop(0.4, f.color);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, f.r * 0.55, -f.span, f.span);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = life * 0.9;
        ctx.strokeStyle = f.glow || f.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.stroke();
        break;
      }
      case "shockwave": {
        const c = worldToScreen(f.x, f.y, 2);
        const rad = f.r * (0.5 + (1 - life) * 0.55) * 0.55;
        ctx.globalAlpha = life * 0.75;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 4 + (1 - life) * 5;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = life * 0.35;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rad * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "nova": {
        const c = worldToScreen(f.x, f.y, 2);
        const rad = f.r * (0.55 + (1 - life) * 0.75) * 0.55;
        ctx.globalAlpha = life * 0.65;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad);
        g.addColorStop(0, f.core || "#fff");
        g.addColorStop(0.25, f.color);
        g.addColorStop(0.6, "transparent");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = life * 0.5;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 22;
        ctx.stroke();
        break;
      }
      case "lightning": {
        ctx.globalAlpha = life;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 22;
        const a = worldToScreen(f.x1, f.y1, lift);
        const b = worldToScreen(f.x2, f.y2, lift);
        const mx = (a.x + b.x) / 2 + (f.jx || 0);
        const my = (a.y + b.y) / 2 + (f.jy || 0);
        const jx2 = (a.x + mx) / 2 + (f.jx2 || 0);
        const jy2 = (a.y + my) / 2 + (f.jy2 || 0);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(jx2, jy2);
        ctx.lineTo(mx, my);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.lineWidth = 8;
        ctx.globalAlpha = life * 0.3;
        ctx.stroke();
        ctx.globalAlpha = life * 0.9;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4 + (1 - life) * 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "afterimage": {
        const c = worldToScreen(f.x, f.y, entityLift(16));
        ctx.translate(c.x, c.y);
        ctx.rotate(f.angle);
        ctx.globalAlpha = life * 0.45;
        drawChampBody(ctx, f.champId, time, true);
        break;
      }
      case "pull": {
        ctx.globalAlpha = life * 0.35;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        const a = worldToScreen(f.x1, f.y1, lift);
        const b = worldToScreen(f.x2, f.y2, lift);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case "trap": {
        const pulse = 0.7 + Math.sin(time * 5) * 0.2;
        ctx.globalAlpha = life * 0.35 * pulse;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        const c = worldToScreen(f.x, f.y, 0);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, f.r * 0.55, f.r * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = life * 0.15;
        ctx.fillStyle = f.color;
        ctx.fill();
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }
}

export function playSpaceVfx(game, champ, p, angle) {
  const t = themeFor(champ);
  switch (champ.spaceType) {
    case "slash":
      addFx(game, {
        kind: "spinSlash",
        x: p.x,
        y: p.y,
        r: 64,
        color: t.slash,
        glow: t.glow,
        maxT: 0.28,
      });
      addFx(game, {
        kind: "ringBurst",
        x: p.x,
        y: p.y,
        r: 72,
        color: t.slash,
        core: "#fff8e1",
        maxT: 0.24,
      });
      addFx(game, {
        kind: "starBurst",
        x: p.x,
        y: p.y,
        r: 58,
        color: t.accent,
        rays: 6,
        maxT: 0.2,
      });
      break;
    case "bash":
      addFx(game, {
        kind: "shockwave",
        x: p.x + Math.cos(angle) * 24,
        y: p.y + Math.sin(angle) * 24,
        r: 72,
        color: t.glow,
        maxT: 0.4,
      });
      addFx(game, {
        kind: "ringBurst",
        x: p.x,
        y: p.y,
        r: 68,
        color: t.color,
        core: "#eceff1",
        maxT: 0.32,
      });
      addFx(game, {
        kind: "starBurst",
        x: p.x + Math.cos(angle) * 20,
        y: p.y + Math.sin(angle) * 20,
        angle,
        r: 48,
        color: t.accent,
        rays: 5,
        maxT: 0.25,
      });
      break;
    case "stab":
      addFx(game, {
        kind: "afterimage",
        x: p.x - Math.cos(angle) * 20,
        y: p.y - Math.sin(angle) * 20,
        angle,
        champId: champ.id,
        maxT: 0.32,
      });
      addFx(game, {
        kind: "magicCone",
        x: p.x,
        y: p.y,
        angle,
        r: 88,
        span: 0.35,
        color: t.glow,
        core: t.accent,
        maxT: 0.22,
      });
      addFx(game, {
        kind: "starBurst",
        x: p.x + Math.cos(angle) * 36,
        y: p.y + Math.sin(angle) * 36,
        angle,
        r: 40,
        color: t.color,
        rays: 4,
        maxT: 0.18,
      });
      break;
    case "bolt":
      addFx(game, {
        kind: "ringBurst",
        x: p.x,
        y: p.y,
        r: 42,
        color: t.glow,
        core: "#fff",
        maxT: 0.2,
      });
      addFx(game, {
        kind: "magicCone",
        x: p.x,
        y: p.y,
        angle,
        r: 56,
        span: 0.25,
        color: t.color,
        glow: t.accent,
        maxT: 0.18,
      });
      break;
    case "shot":
      addFx(game, {
        kind: "starBurst",
        x: p.x,
        y: p.y,
        angle,
        r: 52,
        color: t.accent,
        rays: 5,
        maxT: 0.16,
      });
      addFx(game, {
        kind: "magicCone",
        x: p.x,
        y: p.y,
        angle,
        r: 64,
        span: 0.18,
        color: t.glow,
        core: "#e8f5e9",
        maxT: 0.14,
      });
      break;
    case "zap": {
      const target = game.lastZapTarget;
      if (target) {
        addFx(game, {
          kind: "lightning",
          x1: p.x,
          y1: p.y,
          x2: target.x,
          y2: target.y,
          jx: (Math.random() - 0.5) * 24,
          jy: (Math.random() - 0.5) * 24,
          jx2: (Math.random() - 0.5) * 16,
          jy2: (Math.random() - 0.5) * 16,
          color: t.glow,
          maxT: 0.28,
        });
        addFx(game, {
          kind: "ringBurst",
          x: target.x,
          y: target.y,
          r: 48,
          color: t.accent,
          core: "#fff",
          maxT: 0.22,
        });
        addFx(game, {
          kind: "shockwave",
          x: target.x,
          y: target.y,
          r: 40,
          color: t.color,
          maxT: 0.2,
        });
      }
      break;
    }
    default:
      break;
  }
}

export function playPrimaryVfx(game, champ, p, extra = {}) {
  const t = themeFor(champ);
  switch (champ.skillType) {
    case "dash": {
      const ang = Math.atan2((extra.ny ?? p.y) - p.y, (extra.nx ?? p.x) - p.x);
      addFx(game, {
        kind: "slashArc",
        x: p.x,
        y: p.y,
        angle: ang,
        r: 88,
        span: 0.65,
        color: t.slash,
        maxT: 0.3,
      });
      addFx(game, {
        kind: "ringBurst",
        x: extra.nx ?? p.x,
        y: extra.ny ?? p.y,
        r: 80,
        color: t.accent,
        core: "#fff3e0",
        maxT: 0.28,
      });
      addFx(game, {
        kind: "starBurst",
        x: extra.nx ?? p.x,
        y: extra.ny ?? p.y,
        angle: ang,
        r: 64,
        color: t.glow,
        rays: 7,
        maxT: 0.22,
      });
      break;
    }
    case "nova":
      addFx(game, { kind: "nova", x: p.x, y: p.y, r: 150, color: t.glow, core: "#fff", maxT: 0.52 });
      addFx(game, { kind: "ringBurst", x: p.x, y: p.y, r: 130, color: t.color, core: t.accent, maxT: 0.45 });
      addFx(game, { kind: "starBurst", x: p.x, y: p.y, r: 110, color: t.accent, rays: 10, maxT: 0.38 });
      break;
    case "blink":
      addFx(game, {
        kind: "afterimage",
        x: p.x,
        y: p.y,
        angle: p.angle,
        champId: champ.id,
        maxT: 0.4,
      });
      addFx(game, { kind: "ringBurst", x: p.x, y: p.y, r: 56, color: t.glow, core: t.accent, maxT: 0.32 });
      addFx(game, {
        kind: "starBurst",
        x: p.x,
        y: p.y,
        r: 48,
        color: t.color,
        rays: 6,
        maxT: 0.24,
      });
      break;
    case "slam":
      addFx(game, { kind: "shockwave", x: p.x, y: p.y, r: 120, color: t.glow, maxT: 0.55 });
      addFx(game, { kind: "ringBurst", x: p.x, y: p.y, r: 105, color: t.color, core: "#eceff1", maxT: 0.48 });
      addFx(game, { kind: "starBurst", x: p.x, y: p.y, r: 90, color: t.accent, rays: 8, maxT: 0.35 });
      break;
    case "pierce":
      addFx(game, {
        kind: "magicCone",
        x: p.x,
        y: p.y,
        angle: p.angle,
        r: 120,
        span: 0.12,
        color: t.accent,
        glow: t.glow,
        maxT: 0.35,
      });
      addFx(game, {
        kind: "starBurst",
        x: p.x + Math.cos(p.angle) * 40,
        y: p.y + Math.sin(p.angle) * 40,
        angle: p.angle,
        r: 70,
        color: t.glow,
        rays: 5,
        maxT: 0.28,
      });
      break;
    case "chain":
      addFx(game, { kind: "ringBurst", x: p.x, y: p.y, r: 64, color: t.glow, core: "#fff", maxT: 0.3 });
      addFx(game, { kind: "shockwave", x: p.x, y: p.y, r: 72, color: t.accent, maxT: 0.35 });
      break;
    default:
      break;
  }
}

export function playSecondaryVfx(game, champ, p, angle) {
  const t = themeFor(champ);
  switch (champ.skill2Type) {
    case "arc":
      addFx(game, {
        kind: "slashArc",
        x: p.x,
        y: p.y,
        angle,
        r: 108,
        span: 1.15,
        color: t.slash,
        maxT: 0.34,
      });
      addFx(game, {
        kind: "ringBurst",
        x: p.x + Math.cos(angle) * 50,
        y: p.y + Math.sin(angle) * 50,
        r: 80,
        color: t.accent,
        core: "#fff8e1",
        maxT: 0.28,
      });
      addFx(game, {
        kind: "starBurst",
        x: p.x,
        y: p.y,
        angle,
        r: 72,
        color: t.glow,
        rays: 6,
        maxT: 0.24,
      });
      break;
    case "smoke":
      addFx(game, { kind: "nova", x: p.x, y: p.y, r: 88, color: "#78909c", core: "#cfd8dc", maxT: 0.6 });
      addFx(game, { kind: "ringBurst", x: p.x, y: p.y, r: 76, color: t.glow, core: "#455a64", maxT: 0.5 });
      break;
    case "taunt":
      addFx(game, { kind: "shockwave", x: p.x, y: p.y, r: 95, color: t.glow, maxT: 0.45 });
      addFx(game, { kind: "ringBurst", x: p.x, y: p.y, r: 85, color: t.color, core: "#eceff1", maxT: 0.4 });
      game.enemies.forEach((e) => {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 200 && d > 1) {
          addFx(game, {
            kind: "pull",
            x1: e.x,
            y1: e.y,
            x2: p.x,
            y2: p.y,
            color: t.glow,
            maxT: 0.4,
          });
        }
      });
      break;
    case "trap":
      addFx(game, {
        kind: "trap",
        x: p.x,
        y: p.y,
        r: 78,
        color: t.accent,
        maxT: 0.65,
      });
      addFx(game, {
        kind: "ringBurst",
        x: p.x,
        y: p.y,
        r: 70,
        color: t.glow,
        core: "#33691e",
        maxT: 0.5,
      });
      break;
    case "field":
      addFx(game, {
        kind: "shockwave",
        x: p.x + Math.cos(angle) * 90,
        y: p.y + Math.sin(angle) * 90,
        r: 88,
        color: t.glow,
        maxT: 0.6,
      });
      addFx(game, {
        kind: "ringBurst",
        x: p.x + Math.cos(angle) * 90,
        y: p.y + Math.sin(angle) * 90,
        r: 80,
        color: t.accent,
        core: "#fff",
        maxT: 0.55,
      });
      addFx(game, {
        kind: "starBurst",
        x: p.x + Math.cos(angle) * 90,
        y: p.y + Math.sin(angle) * 90,
        r: 64,
        color: t.color,
        rays: 8,
        maxT: 0.4,
      });
      break;
    case "bolt":
      addFx(game, {
        kind: "magicCone",
        x: p.x,
        y: p.y,
        angle,
        r: 100,
        span: 0.2,
        color: t.glow,
        core: "#fff",
        maxT: 0.32,
      });
      addFx(game, {
        kind: "ringBurst",
        x: p.x + Math.cos(angle) * 60,
        y: p.y + Math.sin(angle) * 60,
        r: 72,
        color: t.accent,
        maxT: 0.28,
      });
      break;
    default:
      break;
  }
}

export function projKindFor(champ, slot = "space") {
  const t = themeFor(champ);
  if (slot === "space" && champ.spaceType === "shot") return "arrow";
  if (slot === "primary" && champ.skillType === "pierce") return "arrow";
  if (slot === "secondary" && champ.skill2Type === "bolt") return "orb";
  return t.proj;
}

function drawChampTorso(ctx, color, glow) {
  ctx.fillStyle = shadeHex(color, -40);
  ctx.beginPath();
  ctx.moveTo(-9, 10);
  ctx.lineTo(9, 10);
  ctx.lineTo(7, -2);
  ctx.lineTo(-7, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawChampHead(ctx, champId, color, glow) {
  if (champId === "rogue") {
    ctx.fillStyle = "#263238";
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(10, -14);
    ctx.lineTo(12, -6);
    ctx.lineTo(-12, -6);
    ctx.closePath();
    ctx.fill();
  }

  const head = ctx.createRadialGradient(0, -10, 0, 0, -10, 9);
  head.addColorStop(0, glow);
  head.addColorStop(0.55, color);
  head.addColorStop(1, shadeHex(color, -35));
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(0, -10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = "#101820";
  ctx.beginPath();
  ctx.arc(-3, -11, 1.8, 0, Math.PI * 2);
  ctx.arc(3, -11, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawChampCore(ctx, champId, color, glow) {
  drawChampTorso(ctx, color, glow);
  drawChampHead(ctx, champId, color, glow);
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function weaponHighlight(ctx, width = 1.2) {
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawChampBody(ctx, champId, time, ghost = false) {
  const t = CHAMP_THEMES[champId] || CHAMP_THEMES.blade;
  const color = t.color;
  const glow = t.glow;
  const bob = ghost ? 0 : Math.sin(time * 8) * 1.2;

  if (!ghost) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;
  }

  ctx.translate(0, bob);

  if (!ghost) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 12, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawChampCore(ctx, champId, color, glow);
  ctx.shadowBlur = 0;
  drawChampWeapons(ctx, champId, time, color, glow);
}

function drawChampWeapons(ctx, champId, time, color, glow) {
  switch (champId) {
    case "blade":
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(-5, 2, 10, 12);
      ctx.fillStyle = "#eceff1";
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(42, 0);
      ctx.lineTo(8, 2);
      ctx.closePath();
      ctx.fill();
      weaponHighlight(ctx);
      ctx.fillStyle = glow;
      ctx.fillRect(6, -5, 4, 10);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(8, -14);
      ctx.lineTo(36, -2);
      ctx.lineTo(8, 10);
      ctx.closePath();
      ctx.fill();
      weaponHighlight(ctx, 1.5);
      break;
    case "mage":
      ctx.fillStyle = shadeHex(color, -25);
      ctx.beginPath();
      ctx.moveTo(-11, 2);
      ctx.lineTo(11, 2);
      ctx.lineTo(0, -6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6d4c41";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(-14, -28);
      ctx.stroke();
      weaponHighlight(ctx, 1.5);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(-14, -28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(18, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, -4);
      ctx.lineTo(30, -16);
      ctx.stroke();
      break;
    case "rogue":
      ctx.fillStyle = "#eceff1";
      ctx.beginPath();
      ctx.moveTo(14, 4);
      ctx.lineTo(34, 10);
      ctx.lineTo(18, 12);
      ctx.closePath();
      ctx.fill();
      weaponHighlight(ctx);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(14, -4);
      ctx.lineTo(34, -10);
      ctx.lineTo(18, -12);
      ctx.closePath();
      ctx.fill();
      weaponHighlight(ctx);
      break;
    case "guardian":
      ctx.fillStyle = shadeHex(color, -20);
      ctx.fillRect(-10, -4, 20, 18);
      ctx.fillStyle = "#546e7a";
      ctx.fillRect(-28, -16, 14, 32);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-28, -16, 14, 32);
      weaponHighlight(ctx, 1.5);
      ctx.fillStyle = glow;
      ctx.fillRect(-22, -6, 6, 12);
      ctx.fillStyle = "#cfd8dc";
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.lineTo(8, 10);
      ctx.lineTo(32, 6);
      ctx.lineTo(32, -2);
      ctx.closePath();
      ctx.fill();
      weaponHighlight(ctx);
      ctx.fillStyle = color;
      ctx.fillRect(10, -12, 6, 20);
      break;
    case "archer":
      ctx.fillStyle = color;
      ctx.fillRect(-5, -2, 10, 16);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(10, 0, 22, -1.25, 1.25);
      weaponHighlight(ctx, 1.5);
      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();
      weaponHighlight(ctx);
      ctx.fillStyle = "#eceff1";
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(36, -4);
      ctx.lineTo(36, 4);
      ctx.closePath();
      ctx.fill();
      weaponHighlight(ctx);
      ctx.fillStyle = shadeHex(color, -30);
      ctx.fillRect(-8, -14, 6, 10);
      break;
    case "storm":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(8, 2);
      ctx.lineTo(0, -8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6d4c41";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, 8);
      ctx.lineTo(6, -26);
      ctx.stroke();
      weaponHighlight(ctx, 1.5);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const ox = 6 + (-8 + i * 8);
        ctx.globalAlpha = 0.55 + Math.sin(time * 5 + i) * 0.3;
        ctx.beginPath();
        ctx.moveTo(ox, -26);
        ctx.lineTo(ox + 5, -14);
        ctx.lineTo(ox - 3, -10);
        ctx.lineTo(ox + 7, 0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(6, -26, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(36, 0);
      ctx.lineTo(8, 2);
      ctx.closePath();
      ctx.fill();
      weaponHighlight(ctx);
  }
}

export function drawChampPlayer(ctx, p, champ, time, invuln, smoke) {
  const id = champ?.id || "blade";
  const t = themeFor(champ);
  const bob = Math.sin(time * 8) * 1.2;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.translate(0, bob);

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 12, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.shadowColor = t.glow;
  ctx.shadowBlur = 14;
  ctx.rotate(p.angle);
  drawChampTorso(ctx, t.color, t.glow);
  drawChampWeapons(ctx, id, time, t.color, t.glow);
  ctx.shadowBlur = 0;
  ctx.restore();

  drawChampHead(ctx, id, t.color, t.glow);

  if (invuln > 0) {
    ctx.strokeStyle = id === "guardian" ? t.glow : "#ffd166";
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.5 + Math.sin(time * 14) * 0.3;
    ctx.beginPath();
    ctx.arc(0, -4, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (smoke > 0 && id === "rogue") {
    const smokeR = 38 + (1 - smoke / 0.75) * 28;
    ctx.globalAlpha = Math.min(0.55, smoke * 0.5);
    ctx.fillStyle = "#455a64";
    ctx.beginPath();
    ctx.arc(p.x, p.y, smokeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.min(0.35, smoke * 0.35);
    ctx.strokeStyle = t.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, smokeR + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (smoke > 0) {
    const smokeR = 38 + (1 - smoke / 0.75) * 28;
    ctx.globalAlpha = Math.min(0.45, smoke * 0.4);
    ctx.fillStyle = "#78909c";
    ctx.beginPath();
    ctx.arc(p.x, p.y, smokeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawChampProjectile(ctx, pr) {
  const ang = Math.atan2(pr.vy, pr.vx);
  const kind = pr.kind || "orb";
  const color = pr.color || "#00d4ff";
  const tail = 14;

  ctx.save();
  ctx.translate(pr.x, pr.y);
  ctx.rotate(ang);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;

  switch (kind) {
    case "arrow": {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-8, 5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-16, 0);
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-28, 0);
      ctx.stroke();
      break;
    }
    case "dagger": {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-4, 4);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "orb": {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, pr.radius + 6);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.35, color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-tail, 0);
      ctx.lineTo(-tail - 10, 0);
      ctx.stroke();
      break;
    }
    case "bolt": {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 3);
      ctx.lineTo(-4, -2);
      ctx.lineTo(2, 4);
      ctx.lineTo(10, -3);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius + 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "blade":
    default: {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-tail, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius + 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}
