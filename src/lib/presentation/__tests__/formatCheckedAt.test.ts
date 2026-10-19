import { describe, expect, it } from 'vitest';
import { formatCheckedAt } from '../formatCheckedAt';

describe('formatCheckedAt', () => {
  it('formats date and 12-hour time in Lima time, independent of the runtime locale', () => {
    // 03:19 UTC is 22:19 the previous day in Lima (UTC-5).
    expect(formatCheckedAt('2026-10-19T03:19:00.000Z')).toBe('18/10/2026 10:19 p.m.');
  });

  it('writes the day period with a plain space and no locale-specific characters', () => {
    const text = formatCheckedAt('2026-10-19T03:19:00.000Z');
    expect(text).not.toMatch(/[\u00a0\u202f]/);
    expect(text).toBe(text?.normalize('NFKC'));
  });

  it('handles midnight and noon as 12 a.m. and 12 p.m.', () => {
    expect(formatCheckedAt('2026-10-19T05:05:00.000Z')).toBe('19/10/2026 12:05 a.m.');
    expect(formatCheckedAt('2026-10-19T17:00:00.000Z')).toBe('19/10/2026 12:00 p.m.');
  });

  it('pads day, month and minutes to two digits', () => {
    expect(formatCheckedAt('2026-01-05T14:07:00.000Z')).toBe('05/01/2026 9:07 a.m.');
  });

  it('returns null for an unreadable date instead of throwing', () => {
    expect(formatCheckedAt('not a date')).toBeNull();
    expect(formatCheckedAt('')).toBeNull();
  });
});
