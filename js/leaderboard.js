import { formatScore } from "./score.js";

const KEY = "sigil-arcade-scores-v1";
const MAX_ENTRIES = 10;

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScore(entry) {
  const board = loadLeaderboard();
  const stamped = { ...entry, date: entry.date ?? Date.now() };
  board.push(stamped);
  board.sort((a, b) => b.score - a.score || (b.date || 0) - (a.date || 0));
  const trimmed = board.slice(0, MAX_ENTRIES);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  const rank = trimmed.findIndex((e) => e.date === stamped.date) + 1;
  return {
    board: trimmed,
    rank: rank > 0 ? rank : trimmed.length,
    isNewBest: rank === 1,
    entry: stamped,
  };
}

export function getBestScore() {
  return loadLeaderboard()[0]?.score ?? 0;
}

export function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function buildLeaderboardRows(board, limit = MAX_ENTRIES) {
  return board.slice(0, limit).map((row, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
    return {
      rank,
      medal,
      score: formatScore(row.score),
      champ: row.champName || "—",
      kills: row.kills ?? 0,
      waves: row.waves ?? 0,
      combo: row.maxCombo ?? 0,
      date: formatDate(row.date),
    };
  });
}

export function renderLeaderboardTable(board, { limit = 5, emptyText = "아직 기록 없음" } = {}) {
  const rows = buildLeaderboardRows(board, limit);
  if (!rows.length) {
    return `<p class="lb-empty">${emptyText}</p>`;
  }
  return `
    <table class="lb-table">
      <thead>
        <tr><th>#</th><th>점수</th><th>챔프</th><th>처치</th><th>웨이브</th></tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr class="lb-row${r.rank === 1 ? " lb-best" : ""}">
                <td>${r.medal}</td>
                <td class="lb-score">${r.score}</td>
                <td>${r.champ}</td>
                <td>${r.kills}</td>
                <td>${r.waves}</td>
              </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}
