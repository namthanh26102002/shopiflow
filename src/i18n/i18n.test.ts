import { describe, expect, it } from 'vitest';
import { vi as messages } from './vi';
import { getDashboardLanguage, setDashboardLanguage, tr, trKnown } from './index';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe('dashboard messages', () => {
  it('keeps every placeholder in the Vietnamese text', () => {
    for (const [english, vietnamese] of Object.entries(messages)) {
      expect(placeholders(vietnamese), english).toEqual(placeholders(english));
    }
  });

  it('has no empty translations', () => {
    for (const [english, vietnamese] of Object.entries(messages)) {
      expect(vietnamese.trim(), english).not.toBe('');
    }
  });
});

describe('tr', () => {
  it('follows the chosen language and fills values', () => {
    const before = getDashboardLanguage();
    setDashboardLanguage('en');
    expect(tr('Edited {time}', { time: '5 minutes ago' })).toBe('Edited 5 minutes ago');
    setDashboardLanguage('vi');
    expect(tr('Save')).toBe('Lưu');
    expect(tr('{count} questions', { count: 3 })).toBe('3 câu hỏi');
    expect(trKnown('Invalid login credentials')).toBe('Email hoặc mật khẩu không đúng');
    expect(trKnown('Some server message')).toBe('Some server message');
    setDashboardLanguage(before);
  });
});
