// Dashboard language: the words of Shopiflow's own screens, for the signed-in
// seller. Quiz visitors' text is separate and set per quiz (lib/visitorText.ts).
//
// Messages are keyed by their English text, so English needs no dictionary and
// a missing Vietnamese entry is a type error rather than a blank label.
import { createContext, createElement, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { vi as viLocale } from 'date-fns/locale/vi';
import { vi, type MessageKey } from './vi';
import { getDashboardLanguage, subscribeToLanguage, type DashboardLanguage } from './language';

export {
  DASHBOARD_LANGUAGES,
  applySavedLanguage,
  getDashboardLanguage,
  isDashboardLanguage,
  setDashboardLanguage,
  type DashboardLanguage,
} from './language';
export type { MessageKey };

export type MessageVars = Record<string, string | number>;

const translate = (language: DashboardLanguage, key: MessageKey, vars?: MessageVars): string => {
  const text: string = language === 'vi' ? vi[key] : key;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text;
};

export type Translate = (key: MessageKey, vars?: MessageVars) => string;

/** For code outside React (toasts fired from hooks' callbacks). Read at call time. */
export const tr: Translate = (key, vars) => translate(getDashboardLanguage(), key, vars);

/** Translates text from elsewhere (a server error) when it is a known message. */
export const trKnown = (text: string): string => (text in vi ? tr(text as MessageKey) : text);

/** Marks a string kept in a constant as a message, translated later with t(). */
export const msg = <K extends MessageKey>(key: K): K => key;

// Pages that visitors see reuse a few dashboard components; they pin the
// language so those pieces match the rest of the page.
const PinnedLanguage = createContext<DashboardLanguage | null>(null);

export const PinLanguage = ({ language, children }: { language: DashboardLanguage; children: ReactNode }) =>
  createElement(PinnedLanguage.Provider, { value: language }, children);

export const useDashboardLanguage = () => {
  const pinned = useContext(PinnedLanguage);
  const chosen = useSyncExternalStore(subscribeToLanguage, getDashboardLanguage);
  return pinned ?? chosen;
};

export const useT = (): Translate => {
  const language = useDashboardLanguage();
  return useMemo<Translate>(() => (key, vars) => translate(language, key, vars), [language]);
};

/** date-fns locale for the dashboard language; undefined means English. */
export const useDateLocale = () => (useDashboardLanguage() === 'vi' ? viLocale : undefined);
