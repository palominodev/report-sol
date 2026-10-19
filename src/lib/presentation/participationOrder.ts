import type { AssignmentHistoryEntry } from '@/core/domain/presentations/AssignmentHistory';

interface Candidate {
  id_usuario: number;
  nombre: string;
  apellido: string;
  assignmentHistory?: AssignmentHistoryEntry[];
}

export type WithParticipation<T> = T & { participationLabel: string };

const DAY_MS = 86_400_000;

function parseDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

function utcDay(y: number, m: number, d: number): number {
  return Date.UTC(y, m, d) / DAY_MS;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Human label for how long ago `lastDate` was, measured in calendar months and
 * remaining days (the day is clamped when the target month is shorter).
 * `null` means the person has no confirmed history.
 */
export function participationLabel(lastDate: string | null, today: string): string {
  if (lastDate === null) return 'Nunca participó';

  const from = parseDate(lastDate);
  const to = parseDate(today);
  if (utcDay(from.y, from.m, from.d) >= utcDay(to.y, to.m, to.d)) return 'Participó esta semana';

  let months = (to.y - from.y) * 12 + (to.m - from.m);
  if (to.d < from.d) months -= 1;

  const anchorMonth = from.m + months;
  const anchorYear = from.y + Math.floor(anchorMonth / 12);
  const anchorMonthIndex = ((anchorMonth % 12) + 12) % 12;
  const anchorDay = Math.min(from.d, daysInMonth(anchorYear, anchorMonthIndex));
  const days = utcDay(to.y, to.m, to.d) - utcDay(anchorYear, anchorMonthIndex, anchorDay);

  const parts: string[] = [];
  if (months > 0) parts.push(plural(months, 'mes', 'meses'));
  if (days > 0) parts.push(plural(days, 'día', 'días'));
  return `Hace ${parts.join(' y ')} que no participa`;
}

function lastParticipation(history: AssignmentHistoryEntry[] | undefined): string | null {
  if (!history || history.length === 0) return null;
  return history.reduce((latest, e) => (e.fecha_fin > latest ? e.fecha_fin : latest), history[0].fecha_fin);
}

/**
 * Orders candidates by who has waited longest: people who never participated
 * first, then the oldest last participation to the most recent. Ties are
 * alphabetical (apellido, nombre). Does not mutate the input.
 */
export function sortByParticipation<T extends Candidate>(people: T[], today: string): WithParticipation<T>[] {
  return people
    .map((person) => {
      const last = lastParticipation(person.assignmentHistory);
      return { person, last, label: participationLabel(last, today) };
    })
    .sort((a, b) => {
      if (a.last !== b.last) {
        if (a.last === null) return -1;
        if (b.last === null) return 1;
        return a.last < b.last ? -1 : 1;
      }
      return (
        a.person.apellido.localeCompare(b.person.apellido, 'es') ||
        a.person.nombre.localeCompare(b.person.nombre, 'es')
      );
    })
    .map(({ person, label }) => ({ ...person, participationLabel: label }));
}
