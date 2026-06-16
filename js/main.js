import { Game } from "./game.js";

const RING_LEN = 226;

function skillSlot(id) {
  return {
    root: document.getElementById(`skill-slot-${id}`),
    icon: document.getElementById(`skill-icon-${id}`),
    sil: document.getElementById(`skill-sil-${id}`),
    sweep: document.getElementById(`skill-sweep-${id}`),
    ring: document.getElementById(`skill-ring-${id}`),
    num: document.getElementById(`skill-num-${id}`),
    name: document.getElementById(`skill-name-${id}`),
    range: document.getElementById(`skill-range-${id}`),
  };
}

const ui = {
  waveNum: document.getElementById("wave-num"),
  waveInfo: document.getElementById("wave-info"),
  combatUi: document.getElementById("combat-ui"),
  combatHpFill: document.getElementById("combat-hp-fill"),
  combatHpTrail: document.getElementById("combat-hp-trail"),
  combatHpText: document.getElementById("combat-hp-text"),
  combatHpPct: document.getElementById("combat-hp-pct"),
  augmentStrip: document.getElementById("augment-strip"),
  augmentChips: document.getElementById("augment-chips"),
  augmentCount: document.getElementById("aug-count"),
  champPortrait: document.getElementById("champ-portrait"),
  skillSlots: [skillSlot(0), skillSlot(1), skillSlot(2)],
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayDesc: document.getElementById("overlay-desc"),
  overlayContent: document.getElementById("overlay-content"),
  runControls: document.getElementById("run-controls"),
  btnPause: document.getElementById("btn-pause"),
  btnHome: document.getElementById("btn-home"),
};

ui.skillSlots.forEach((s) => {
  if (s.ring) {
    s.ring.style.strokeDasharray = String(RING_LEN);
    s.ring.style.strokeDashoffset = "0";
  }
});

ui.btnPause?.addEventListener("click", () => game.pauseGame());
ui.btnHome?.addEventListener("click", () => game.confirmExitToHome());

const game = new Game(document.getElementById("game"), ui);
