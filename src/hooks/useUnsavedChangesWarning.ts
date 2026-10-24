import { useEffect, useRef } from 'react';

/**
 * Ask before the tab closes or reloads while `hasUnsaved()` is true.
 *
 * Takes a function rather than a boolean so editors can answer from refs at
 * the moment of leaving, without re-rendering on every keystroke to keep a
 * flag current. Browsers show their own wording; the message is not used.
 */
export const useUnsavedChangesWarning = (hasUnsaved: () => boolean) => {
  const checkRef = useRef(hasUnsaved);
  checkRef.current = hasUnsaved;

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!checkRef.current()) return;
      event.preventDefault();
      // Older Chromium still needs returnValue set to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
};
