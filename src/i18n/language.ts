// The chosen dashboard language, without any messages, so code that loads on
// every page (auth) can follow it without pulling the dictionary into the
// bundle that quiz visitors download.

export type DashboardLanguage = 'en' | 'vi';

export const DASHBOARD_LANGUAGES: { value: DashboardLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
];

const STORAGE_KEY = 'shopiflow:dashboard-language';

export const isDashboardLanguage = (value: unknown): value is DashboardLanguage =>
  value === 'en' || value === 'vi';

const initialLanguage = (): DashboardLanguage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isDashboardLanguage(stored)) return stored;
  } catch {
    // Storage blocked: fall back to the browser.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
};

let current: DashboardLanguage = initialLanguage();
const listeners = new Set<() => void>();

export const getDashboardLanguage = () => current;

export const setDashboardLanguage = (language: DashboardLanguage) => {
  if (language === current) return;
  current = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not persisted, but still applied for this visit.
  }
  listeners.forEach((listener) => listener());
};

/** Takes the language saved on the account (user_metadata), if there is one. */
export const applySavedLanguage = (user: { user_metadata?: Record<string, unknown> } | null | undefined) => {
  const saved = user?.user_metadata?.dashboard_language;
  if (isDashboardLanguage(saved)) setDashboardLanguage(saved);
};

export const subscribeToLanguage = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
