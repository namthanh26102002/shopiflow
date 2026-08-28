import { useEffect } from 'react';

/**
 * Load the webfonts a theme needs, and only then.
 *
 * Quizzes on system fonts pay nothing: the stylesheet is injected on demand
 * rather than sitting in index.html, which matters most on the public quiz
 * page a respondent is waiting on.
 */
export const useWebFonts = (families: string[]) => {
  const key = families.join(',');

  useEffect(() => {
    if (!key) return;
    const id = `quiz-fonts-${key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?' +
      key.split(',')
        .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;700;800;900`)
        .join('&') +
      '&display=swap';
    document.head.appendChild(link);
    // Left in place deliberately: the same fonts are usually wanted again on
    // the next render, and removing it would re-flash unstyled text.
  }, [key]);
};
