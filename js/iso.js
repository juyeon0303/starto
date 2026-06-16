/** 롤토체스식 아이소메트릭 투영 (게임 로직은 평면 x,y 유지) */
const W = 960;
const H = 560;
const PAD = 40;

export const ISO_SCALE = 0.62;
export const ISO_RATIO = 0.305;
export const ISO_ORIGIN_X = W / 2;
export const ISO_ORIGIN_Y = H / 2 + 8;
export const ENTITY_LIFT = 26;
export const PLATFORM_DEPTH = 36;

export function worldToScreen(wx, wy, lift = 0) {
  const cx = wx - W / 2;
  const cy = wy - H / 2;
  return {
    x: (cx - cy) * ISO_SCALE + ISO_ORIGIN_X,
    y: (cx + cy) * ISO_RATIO - lift + ISO_ORIGIN_Y,
    depth: cx + cy - lift * 0.04,
  };
}

export function screenToWorld(sx, sy, lift = 0) {
  const px = sx - ISO_ORIGIN_X;
  const py = sy - ISO_ORIGIN_Y + lift;
  const a = px / ISO_SCALE;
  const b = py / ISO_RATIO;
  return {
    x: (a + b) * 0.5 + W / 2,
    y: (b - a) * 0.5 + H / 2,
  };
}

export function arenaCornersWorld() {
  return [
    [PAD, PAD],
    [W - PAD, PAD],
    [W - PAD, H - PAD],
    [PAD, H - PAD],
  ];
}

export { PAD, W, H };

export function projectCorners(corners, lift = 0) {
  return corners.map(([x, y]) => worldToScreen(x, y, lift));
}

export function entityLift(radius = 16) {
  return ENTITY_LIFT + radius * 0.35;
}

export function drawGroundShadow(ctx, wx, wy, radius) {
  const g = worldToScreen(wx, wy, 0);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.scale(1.15, 0.42);
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * ISO_SCALE * 0.95, radius * ISO_SCALE * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawIsoLine(ctx, x1, y1, x2, y2, lift = 0) {
  const a = worldToScreen(x1, y1, lift);
  const b = worldToScreen(x2, y2, lift);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
}

export function beginIsoCircle(ctx, wx, wy, r, lift = 0) {
  const c = worldToScreen(wx, wy, lift);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(1, ISO_RATIO / ISO_SCALE);
  ctx.beginPath();
  ctx.arc(0, 0, r * ISO_SCALE, 0, Math.PI * 2);
  return c.depth;
}

export function endIsoCircle(ctx) {
  ctx.restore();
}

/** @deprecated use beginIsoCircle + fill/stroke + endIsoCircle */
export function drawIsoCircle(ctx, wx, wy, r, lift = 0) {
  beginIsoCircle(ctx, wx, wy, r, lift);
}
