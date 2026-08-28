import { describe, it, expect } from 'vitest';
import { resolveQuizTheme, withAlpha } from './quizTheme';
import { QUIZ_THEMES, findTheme } from '@/types/quizTheme';
import { QuizSettings } from '@/types/quiz';

const base = (over: Partial<QuizSettings> = {}): QuizSettings => ({
  title: 'Q',
  welcomeText: '',
  welcomeButtonText: 'Start',
  primaryColor: '#0066FF',
  backgroundColor: '#FFFFFF',
  fontColor: '#1A1A1A',
  nextButtonText: 'Next',
  nextButtonSize: 'medium',
  nextButtonRadius: 'large',
  ...over,
} as QuizSettings);

describe('resolveQuizTheme', () => {
  // The compatibility guarantee: quizzes made before themes existed must look
  // exactly as they did, so every role has to fall back through the old fields.
  it('leaves an un-themed quiz on its original colours', () => {
    const r = resolveQuizTheme(base());
    expect(r.background).toBe('#FFFFFF');
    expect(r.heading).toBe('#1A1A1A');
    expect(r.optionText).toBe('#1A1A1A');
    expect(r.accent).toBe('#0066FF');
  });

  it('uses a solid background when no gradient stops are set', () => {
    expect(resolveQuizTheme(base({ backgroundColor: '#EEE' })).background).toBe('#EEE');
  });

  it('builds a gradient when the theme supplies stops', () => {
    const r = resolveQuizTheme(base({ theme: { bgFrom: '#000', bgVia: '#111', bgTo: '#222' } }));
    expect(r.background).toBe('linear-gradient(180deg, #000 0%, #111 55%, #222 100%)');
  });

  it('falls back to bgFrom when the middle and end stops are missing', () => {
    const r = resolveQuizTheme(base({ theme: { bgFrom: '#000' } }));
    expect(r.background).toBe('linear-gradient(180deg, #000 0%, #000 55%, #000 100%)');
  });

  it('lets an explicit button colour win over the accent', () => {
    const r = resolveQuizTheme(base({ nextButtonColor: '#FF0000', theme: { accent: '#00FF00' } }));
    expect(r.buttonBg).toBe('#FF0000');
  });

  it('falls back to the accent when no button colour is set', () => {
    expect(resolveQuizTheme(base({ theme: { accent: '#00FF00' } })).buttonBg).toBe('#00FF00');
  });

  it('reports only real webfonts, de-duplicated', () => {
    expect(resolveQuizTheme(base()).webFonts).toEqual([]);
    expect(resolveQuizTheme(base({ theme: { headingFont: 'Nunito', bodyFont: 'DM Sans' } })).webFonts)
      .toEqual(['Nunito', 'DM Sans']);
    expect(resolveQuizTheme(base({ theme: { headingFont: 'Nunito', bodyFont: 'Nunito' } })).webFonts)
      .toEqual(['Nunito']);
  });
});

describe('withAlpha', () => {
  it('appends to a 6-digit hex and leaves anything else alone', () => {
    expect(withAlpha('#1A1A1A', '20')).toBe('#1A1A1A20');
    expect(withAlpha('rgba(0,0,0,.5)', '20')).toBe('rgba(0,0,0,.5)');
  });
});

describe('QUIZ_THEMES', () => {
  it('carries all ten palettes with unique ids', () => {
    expect(QUIZ_THEMES).toHaveLength(10);
    expect(new Set(QUIZ_THEMES.map(t => t.id)).size).toBe(10);
  });

  it('gives every theme a full set of roles', () => {
    for (const t of QUIZ_THEMES) {
      for (const k of ['bgFrom','bgVia','bgTo','panelBg','panelBorder','accent',
                       'heading','muted','optionBg','optionBorder','optionText'] as const) {
        expect(t[k], `${t.id}.${k}`).toBeTruthy();
      }
    }
  });

  it('applies cleanly through the resolver', () => {
    const forest = findTheme('forest-mint')!;
    const r = resolveQuizTheme(base({ theme: { ...forest } }));
    expect(r.accent).toBe('#5bf2a5');
    expect(r.background).toContain('linear-gradient');
    expect(r.headingFont).toContain('Nunito');
  });
});
