/** 챔프별 SVG 실루엣 — UI용 */
export const SILHOUETTES = {
  blade: `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 4 L36 18 L32 28 L44 76 L32 70 L20 76 L32 28 L28 18 Z"/><path fill="currentColor" opacity="0.85" d="M32 22 L52 8 L56 14 L38 30 Z"/><path fill="currentColor" opacity="0.7" d="M32 24 L14 38 L18 42 L32 32 Z"/></svg>`,
  mage: `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 6 L42 20 L40 36 L46 78 L32 74 L18 78 L24 36 L22 20 Z"/><path fill="currentColor" opacity="0.9" d="M32 8 L32 0 L36 12 Z"/><circle fill="currentColor" cx="48" cy="28" r="5"/><path fill="none" stroke="currentColor" stroke-width="2" d="M48 28 L58 18"/><path fill="currentColor" opacity="0.6" d="M14 34 L6 52 L12 54 L20 38 Z M50 34 L58 52 L52 54 L44 38 Z"/></svg>`,
  rogue: `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 14 L38 22 L36 42 L38 76 L26 76 L28 42 L26 22 Z"/><path fill="currentColor" d="M32 12 L40 6 L36 18 L28 18 Z"/><path fill="currentColor" opacity="0.9" d="M18 48 L4 58 L10 62 L22 52 Z M46 48 L60 58 L54 62 L42 52 Z"/><path fill="currentColor" opacity="0.85" d="M44 36 L56 30 L54 36 L44 40 Z M20 36 L8 30 L10 36 L20 40 Z"/></svg>`,
  guardian: `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 8 L44 18 L42 38 L48 78 L32 74 L16 78 L22 38 L20 18 Z"/><path fill="currentColor" opacity="0.75" d="M8 28 L4 54 L14 56 L18 32 Z"/><path fill="currentColor" opacity="0.95" d="M6 24 Q6 44 14 52 Q6 44 6 64 L14 58 Q22 48 14 28 Z"/><path fill="currentColor" opacity="0.75" d="M56 28 L60 54 L50 56 L46 32 Z"/></svg>`,
  archer: `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 10 L36 24 L34 38 L38 76 L32 72 L26 76 L30 38 L28 24 Z"/><path fill="none" stroke="currentColor" stroke-width="3" d="M8 38 Q32 26 56 38"/><path fill="currentColor" d="M52 34 L62 30 L58 36 L48 40 Z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M28 38 L48 38"/></svg>`,
  storm: `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 6 L38 20 L34 34 L40 42 L26 50 L32 58 L22 78 L32 46 L26 38 L32 30 L28 20 Z"/><path fill="currentColor" opacity="0.8" d="M16 22 L10 8 L14 6 L20 18 Z M48 22 L54 8 L50 6 L44 18 Z M32 2 L36 10 L28 10 Z"/></svg>`,
};

export function mountSilhouette(el, champId, color = "#fff") {
  if (!el) return;
  el.innerHTML = SILHOUETTES[champId] || SILHOUETTES.blade;
  el.style.color = color;
}
