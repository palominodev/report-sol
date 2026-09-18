/**
 * Shared history lookback window for assignment rules (26 weeks).
 *
 * Replaces the per-use-case `sixMonthsAgo()` helpers (calendar 6 months =
 * 181–184 days depending on the month) with a fixed 26·7 = 182-day window, so
 * the effective delta is at most ~3 days. One shared helper keeps the
 * repository query and the rule semantics on the same window definition.
 *
 * Delta note: the existing `*Within6mo` accessor names on HistoryView are kept
 * for continuity; they now read this 26-week window (a rename is deliberately
 * out of scope to avoid churning every rule and fake).
 */
export const HISTORY_WINDOW_WEEKS = 26;

/** ISO date (YYYY-MM-DD) exactly HISTORY_WINDOW_WEEKS · 7 days before today. */
export function historyWindowStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - HISTORY_WINDOW_WEEKS * 7);
  return d.toISOString().slice(0, 10);
}
