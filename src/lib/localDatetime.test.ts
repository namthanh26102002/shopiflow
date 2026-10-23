import { describe, expect, it } from 'vitest';
import { toLocalDatetime } from './localDatetime';

describe('toLocalDatetime', () => {
  it('round-trips through a datetime-local value without drifting', () => {
    const iso = '2026-10-23T17:59:00.000Z';
    const value = toLocalDatetime(iso);
    // A datetime-local value is parsed as local time, which is what the form does on save.
    expect(new Date(value).toISOString()).toBe(iso);
  });

  it('is minute precision', () => {
    expect(toLocalDatetime(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
