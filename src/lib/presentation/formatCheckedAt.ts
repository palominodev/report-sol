const LIMA_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Formats an ISO timestamp as "18/10/2026 10:19 p.m." in Lima time.
 *
 * Server and browser must produce the identical string or React reports a
 * hydration mismatch. `toLocale*String()` cannot guarantee that: each side
 * uses its own locale and time zone, and "p. m." may contain a non-breaking
 * space on one side only. So only the numbers come from Intl; the layout and
 * the a.m./p.m. marker are written here.
 */
export function formatCheckedAt(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const parts = Object.fromEntries(LIMA_PARTS.formatToParts(date).map((p) => [p.type, p.value]));
  const hour24 = Number(parts.hour);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 < 12 ? 'a.m.' : 'p.m.';

  return `${parts.day}/${parts.month}/${parts.year} ${hour12}:${parts.minute} ${period}`;
}
