import { describe, expect, it } from 'vitest';
import { labelOr, visitorText } from './visitorText';

describe('visitorText', () => {
  it('defaults to English', () => {
    expect(visitorText(undefined).next).toBe('Next');
  });

  it('has every key in Vietnamese', () => {
    const en = visitorText('en');
    const vi = visitorText('vi');
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
    Object.values(vi).forEach((s) => expect(s.trim()).not.toBe(''));
  });
});

describe('labelOr', () => {
  const vi = visitorText('vi');

  it('translates an empty or untouched default', () => {
    expect(labelOr('', 'next', vi)).toBe(vi.next);
    expect(labelOr('Next', 'next', vi)).toBe(vi.next);
    expect(labelOr(undefined, 'skip', vi)).toBe(vi.skip);
  });

  it('keeps text the merchant wrote', () => {
    expect(labelOr('Xem kết quả', 'next', vi)).toBe('Xem kết quả');
    expect(labelOr('Show me', 'next', visitorText('en'))).toBe('Show me');
  });
});
