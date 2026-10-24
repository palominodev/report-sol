import { describe, it, expect } from 'vitest';
import { DEFAULT_AFTER_LOGIN_PATH, safeRedirectPath } from '../safe-redirect';

describe('safeRedirectPath', () => {
  it('keeps an internal path, with its query string', () => {
    expect(safeRedirectPath('/dashboard/publicadores')).toBe('/dashboard/publicadores');
    expect(safeRedirectPath('/asignaciones/3?sala=B')).toBe('/asignaciones/3?sala=B');
  });

  it('falls back to the dashboard when there is nothing to go back to', () => {
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_AFTER_LOGIN_PATH);
    expect(safeRedirectPath(null)).toBe(DEFAULT_AFTER_LOGIN_PATH);
    expect(safeRedirectPath('')).toBe(DEFAULT_AFTER_LOGIN_PATH);
  });

  it('refuses addresses that leave the site', () => {
    for (const evil of [
      'https://evil.example/phish',
      'http://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      'dashboard',
    ]) {
      expect(safeRedirectPath(evil), evil).toBe(DEFAULT_AFTER_LOGIN_PATH);
    }
  });

  it('never sends the person back to the login screen itself', () => {
    expect(safeRedirectPath('/login')).toBe(DEFAULT_AFTER_LOGIN_PATH);
    expect(safeRedirectPath('/login?next=/dashboard')).toBe(DEFAULT_AFTER_LOGIN_PATH);
  });

  it('refuses control characters that browsers strip before navigating', () => {
    expect(safeRedirectPath('/\t/evil.example')).toBe(DEFAULT_AFTER_LOGIN_PATH);
    expect(safeRedirectPath('/ok\nSet-Cookie: x=1')).toBe(DEFAULT_AFTER_LOGIN_PATH);
  });
});
