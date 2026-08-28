// Access code rules, kept in one place so the signup form, the admin creator
// and the `access-code` edge function agree.
//
// The edge function validates against /^[A-Z0-9-]{4,32}$/ (see
// supabase/functions/access-code/index.ts). The inputs previously capped at 12
// characters, so a longer valid code was silently truncated by the browser and
// then rejected as invalid — with no indication that the field had altered it.

export const ACCESS_CODE_MIN_LENGTH = 4;
export const ACCESS_CODE_MAX_LENGTH = 32;
export const ACCESS_CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

/** Match the normalisation the edge function applies before validating. */
export const normalizeAccessCode = (raw: string): string => raw.toUpperCase().trim();

/**
 * Returns a human-readable problem with the code, or null when it is valid.
 * Callers should normalise first.
 */
export const describeAccessCodeProblem = (code: string): string | null => {
  if (!code) return 'Please enter an access code';

  if (code.length < ACCESS_CODE_MIN_LENGTH) {
    return `Access codes are at least ${ACCESS_CODE_MIN_LENGTH} characters`;
  }

  if (code.length > ACCESS_CODE_MAX_LENGTH) {
    return `Access codes are at most ${ACCESS_CODE_MAX_LENGTH} characters`;
  }

  if (!ACCESS_CODE_PATTERN.test(code)) {
    return 'Access codes use letters, numbers and hyphens only';
  }

  return null;
};
