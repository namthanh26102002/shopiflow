// Resolves a quiz's theme into concrete CSS values.
//
// Quizzes created before themes existed only carry backgroundColor, fontColor
// and primaryColor. Every role falls back through those to a hard default, so
// an untouched quiz renders exactly as it did before.
import { QuizSettings } from '@/types/quiz';
import { QuizThemeColors } from '@/types/quizTheme';

export interface ResolvedQuizTheme {
  /** Ready for a CSS `background` — a gradient when the theme sets one. */
  background: string;
  panelBg: string;
  panelBorder: string;
  accent: string;
  heading: string;
  muted: string;
  optionBg: string;
  optionBorder: string;
  optionText: string;
  buttonBg: string;
  buttonText: string;
  headingFont: string;
  bodyFont: string;
  /** Families needing a webfont load, empty when the quiz uses system fonts. */
  webFonts: string[];
}

const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Mix a hex colour with transparency, for subtle borders and tints. */
export const withAlpha = (color: string, alpha: string): string =>
  color.startsWith('#') && color.length === 7 ? `${color}${alpha}` : color;

const fontStack = (family?: string): string =>
  family ? `'${family}', ${SYSTEM_STACK}` : SYSTEM_STACK;

export const resolveQuizTheme = (settings: QuizSettings): ResolvedQuizTheme => {
  const t = (settings.theme ?? {}) as Partial<QuizThemeColors>;

  const legacyBg = settings.backgroundColor || '#FFFFFF';
  const legacyText = settings.fontColor || '#1A1A1A';
  const accent = t.accent || settings.primaryColor || '#0066FF';

  // Only treat it as a gradient when the theme actually supplies stops.
  const background = t.bgFrom
    ? `linear-gradient(180deg, ${t.bgFrom} 0%, ${t.bgVia ?? t.bgFrom} 55%, ${t.bgTo ?? t.bgFrom} 100%)`
    : legacyBg;

  const heading = t.heading || legacyText;

  return {
    background,
    panelBg: t.panelBg || 'transparent',
    panelBorder: t.panelBorder || 'transparent',
    accent,
    heading,
    muted: t.muted || withAlpha(legacyText, 'B3'),
    optionBg: t.optionBg || 'transparent',
    optionBorder: t.optionBorder || withAlpha(legacyText, '20'),
    optionText: t.optionText || legacyText,
    buttonBg: settings.nextButtonColor || accent,
    buttonText: '#FFFFFF',
    headingFont: fontStack(t.headingFont),
    bodyFont: fontStack(t.bodyFont),
    webFonts: [t.headingFont, t.bodyFont].filter(
      (f, i, a): f is string => !!f && a.indexOf(f) === i,
    ),
  };
};
