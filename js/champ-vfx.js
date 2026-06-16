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
        ctx.globalAlpha = life * 0.85;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 4 + (1 - life) * 8;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.62, -f.span, f.span);
        ctx.stroke();
        break;
      }
      case "shockwave": {
        const c = worldToScreen(f.x, f.y, 2);
        ctx.globalAlpha = life * 0.6;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(c.x, c.y, f.r * (1.1 - life * 0.3) * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "nova": {
        const c = worldToScreen(f.x, f.y, 2);
        ctx.globalAlpha = life * 0.5;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, f.r * (1.2 - life * 0.5) * 0.5);
        g.addColorStop(0, f.color);
        g.addColorStop(0.55, "transparent");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, f.r * (1.3 - life * 0.4) * 0.55, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "lightning": {
        ctx.globalAlpha = life;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 16;
        const a = worldToScreen(f.x1, f.y1, lift);
        const b = worldToScreen(f.x2, f.y2, lift);
        const mx = (a.x + b.x) / 2 + (f.jx || 0);
        const my = (a.y + b.y) / 2 + (f.jy || 0);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mx, my);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.globalAlpha = life * 0.25;
        ctx.stroke();
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
        kind: "shockwave",
        x: p.x,
        y: p.y,
        r: 64,
        color: t.slash,
        maxT: 0.22,
      });
      addFx(game, {
        kind: "shockwave",
        x: p.x,
        y: p.y,
        r: 44,
        color: t.glow,
        maxT: 0.16,
      });
      break;
    case "bash":
      addFx(game, {
        kind: "shockwave",
        x: p.x + Math.cos(angle) * 24,
        y: p.y + Math.sin(angle) * 24,
        r: 58,
        color: t.glow,
        maxT: 0.35,
      });
      break;
    case "stab":
      addFx(game, {
        kind: "afterimage",
        x: p.x - Math.cos(angle) * 20,
        y: p.y - Math.sin(angle) * 20,
        angle,
        champId: champ.id,
        maxT: 0.28,
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
          jx: (Math.random() - 0.5) * 18,
          jy: (Math.random() - 0.5) * 18,
          color: t.glow,
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
    case "dash":
      addFx(game, {
        kind: "slashArc",
        x: p.x,
        y: p.y,
        angle: Math.atan2((extra.ny ?? p.y) - p.y, (extra.nx ?? p.x) - p.x),
        r: 70,
        span: 0.55,
        color: t.slash,
        maxT: 0.25,
      });
      break;
    case "nova":
      addFx(game, { kind: "nova", x: p.x, y: p.y, r: 130, color: t.glow, maxT: 0.45 });
      break;
    case "blink":
      addFx(game, {
        kind: "afterimage",
        x: p.x,
        y: p.y,
        angle: p.angle,
        champId: champ.id,
        maxT: 0.35,
      });
      break;
    case "slam":
      addFx(game, { kind: "shockwave", x: p.x, y: p.y, r: 100, color: t.glow, maxT: 0.5 });
      break;
    case "chain":
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
        r: 92,
        span: 1.05,
        color: t.slash,
        maxT: 0.28,
      });
      break;
    case "smoke":
      addFx(game, { kind: "nova", x: p.x, y: p.y, r: 72, color: "#78909c", maxT: 0.55 });
      break;
    case "taunt":
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
            maxT: 0.35,
          });
        }
      });
      break;
    case "trap":
      addFx(game, {
        kind: "trap",
        x: p.x,
        y: p.y,
        r: 70,
        color: t.accent,
        maxT: 0.6,
      });
      break;
    case "field":
      addFx(game, {
        kind: "shockwave",
        x: p.x + Math.cos(angle) * 90,
        y: p.y + Math.sin(angle) * 90,
        r: 72,
        color: t.glow,
        maxT: 0.55,
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

function drawChampBody(ctx, champId, time, ghost = false) {
  const t = CHAMP_THEMES[champId] || CHAMP_THEMES.blade;
  const color = t.color;
  const glow = t.glow;
  const bob = ghost ? 0 : Math.sin(time * 8) * 1.2;

  if (!ghost) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 24;
  }

  ctx.translate(0, bob);

  if (!ghost) {
    ctx.globalAlpha = 0.35 + Math.sin(time * 3) * 0.08;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 10, 20, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const bodyGrad = ctx.createRadialGradient(0, -4, 0, 0, 0, 20);
  bodyGrad.addColorStop(0, glow);
  bodyGrad.addColorStop(0.45, color);
  bodyGrad.addColorStop(1, "#0a0e14");

  ctx.fillStyle = "#0a0e14";
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (champId) {
    case "blade":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(-4, 14);
      ctx.lineTo(0, 0);
      ctx.lineTo(-4, -14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = glow;
      ctx.fillRect(6, -16, 8, 10);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(10, -18);
      ctx.lineTo(20, -8);
      ctx.lineTo(10, 2);
      ctx.stroke();
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(-8, 8, 16, 8);
      break;
    case "mage":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 10);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(4, -10);
      ctx.lineTo(-4, -10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(16, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, -2);
      ctx.lineTo(26, -12);
      ctx.stroke();
      ctx.fillStyle = "rgba(179, 136, 255, 0.35)";
      ctx.beginPath();
      ctx.moveTo(-14, 4);
      ctx.lineTo(-22, 18);
      ctx.lineTo(-6, 12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, 4);
      ctx.lineTo(22, 18);
      ctx.lineTo(6, 12);
      ctx.closePath();
      ctx.fill();
      break;
    case "rogue":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#263238";
      ctx.beginPath();
      ctx.arc(0, -8, 9, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(18, 6);
      ctx.lineTo(26, 12);
      ctx.lineTo(16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, -6);
      ctx.lineTo(26, -12);
      ctx.lineTo(16, -10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -14);
      ctx.lineTo(12, -14);
      ctx.stroke();
      break;
    case "guardian":
      ctx.fillStyle = color;
      ctx.fillRect(-15, -14, 30, 28);
      ctx.fillStyle = "#546e7a";
      ctx.beginPath();
      ctx.arc(-14, 0, 15, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = glow;
      ctx.fillRect(2, -8, 12, 16);
      ctx.strokeStyle = "#eceff1";
      ctx.lineWidth = 1;
      ctx.strokeRect(2, -8, 12, 16);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -16, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.fillRect(-4, -20, 8, 6);
      break;
    case "archer":
      ctx.fillStyle = color;
      ctx.fillRect(-6, -12, 12, 22);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(8, 0, 18, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(28, -4);
      ctx.lineTo(28, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#558b2f";
      ctx.beginPath();
      ctx.arc(0, -14, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "storm":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(8, -2);
      ctx.lineTo(0, 10);
      ctx.lineTo(-8, -2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const ox = -10 + i * 10;
        ctx.globalAlpha = 0.45 + Math.sin(time * 5 + i) * 0.3;
        ctx.beginPath();
        ctx.moveTo(ox, -20);
        ctx.lineTo(ox + 4, -10);
        ctx.lineTo(ox - 2, -6);
        ctx.lineTo(ox + 6, 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-8, 12);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, -12);
      ctx.closePath();
      ctx.fill();
  }

  if (!ghost) {
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

export function drawChampPlayer(ctx, p, champ, time, invuln, smoke) {
  const id = champ?.id || "blade";
  const t = themeFor(champ);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  drawChampBody(ctx, id, time);

  if (invuln > 0) {
    ctx.strokeStyle = id === "guardian" ? t.glow : "#ffd166";
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.5 + Math.sin(time * 14) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
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
