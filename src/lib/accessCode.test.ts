import { describe, it, expect } from 'vitest';
import {
  ACCESS_CODE_MAX_LENGTH,
  normalizeAccessCode,
  describeAccessCodeProblem,
} from './accessCode';

describe('normalizeAccessCode', () => {
  it('upper-cases and trims, matching the edge function', () => {
    expect(normalizeAccessCode('  dev-local  ')).toBe('DEV-LOCAL');
  });
});

describe('describeAccessCodeProblem', () => {
  it('accepts a valid code', () => {
    expect(describeAccessCodeProblem('DEV-LOCAL')).toBeNull();
  });

  it('accepts a code at the edge function limit', () => {
    expect(describeAccessCodeProblem('A'.repeat(ACCESS_CODE_MAX_LENGTH))).toBeNull();
  });

  it('rejects a code past the limit rather than truncating it', () => {
    expect(describeAccessCodeProblem('A'.repeat(ACCESS_CODE_MAX_LENGTH + 1)))
      .toMatch(/at most/);
  });

  // The original bug: this is 14 characters, the input capped at 12, so it was
  // silently cut to DEV-LOCAL-00 and rejected as invalid.
  it('accepts codes longer than the old 12-character cap', () => {
    expect(describeAccessCodeProblem('DEV-LOCAL-0001')).toBeNull();
  });

  it('rejects empty, short, and illegal characters', () => {
    expect(describeAccessCodeProblem('')).toMatch(/enter an access code/);
    expect(describeAccessCodeProblem('AB')).toMatch(/at least/);
    expect(describeAccessCodeProblem('DEV_LOCAL')).toMatch(/letters, numbers/);
  });
});
