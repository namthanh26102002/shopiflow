// State for the Shopify theme editor: the project's ThemeData, what is
// selected, which template is on screen, and autosave.
//
// Edits carry a hint saying which section they touched, so the preview can
// re-render that one section in place instead of the whole page.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { baseThemeData, THEME_VERSION } from '@/lib/shopifyTheme/themeSource';
import type { SectionRef, Selection, ThemeData } from '@/lib/shopifyTheme/types';

/** What an edit changed, so the preview can do the least work. */
export type RenderHint = { kind: 'section'; ref: SectionRef } | { kind: 'full' };

export type PreviewDevice = 'desktop' | 'mobile';

interface ThemeEditorContextValue {
  themeId: string;
  title: string;
  setTitle: (title: string) => void;
  data: ThemeData;
  /** Bumped on every edit; the preview watches it alongside the hint. */
  revision: number;
  lastHint: RenderHint;
  edit: (update: (data: ThemeData) => ThemeData, hint?: RenderHint) => void;
  template: string;
  setTemplate: (template: string) => void;
  selection: Selection | null;
  select: (selection: Selection | null, options?: { fromPreview?: boolean }) => void;
  /** Set when the selection came from a click in the preview (no scrolling it). */
  selectionFromPreview: boolean;
  device: PreviewDevice;
  setDevice: (device: PreviewDevice) => void;
  loading: boolean;
  notFound: boolean;
  saving: boolean;
  saveFailed: boolean;
  retrySave: () => void;
  /** Saves now instead of waiting for the debounce (before leaving for Shopify). */
  flushSave: () => Promise<void>;
}

const ThemeEditorContext = createContext<ThemeEditorContextValue | undefined>(undefined);

const SAVE_DELAY_MS = 1500;

interface PendingSave {
  data: ThemeData;
  title: string;
}

export const ThemeEditorProvider: React.FC<{ themeId: string; children: React.ReactNode }> = ({ themeId, children }) => {
  const { user } = useAuth();
  const [data, setData] = useState<ThemeData>(() => baseThemeData());
  const [title, setTitleState] = useState('Untitled theme');
  const [revision, setRevision] = useState(0);
  const [lastHint, setLastHint] = useState<RenderHint>({ kind: 'full' });
  const [template, setTemplate] = useState('index');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectionFromPreview, setSelectionFromPreview] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const loadedRef = useRef(false);
  const savingRef = useRef(false);
  const saveFailedRef = useRef(false);
  const pendingRef = useRef<PendingSave | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<PendingSave>({ data, title });
  latestRef.current = { data, title };

  // Keyed on the id: a refreshed session hands out a new user object, which
  // must not reload the theme over unsaved edits.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadedRef.current = false;
    setLoading(true);
    setNotFound(false);
    setSelection(null);
    setTemplate('index');

    (async () => {
      try {
        const { data: row, error } = await supabase
          .from('shopify_themes')
          .select('id, title, theme_data')
          .eq('id', themeId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        // NULL theme_data is the untouched base theme (see the migration).
        const stored = row.theme_data as unknown as ThemeData | null;
        setData(stored && stored.version === 1 ? stored : baseThemeData());
        setTitleState(row.title);
        setRevision((r) => r + 1);
        setLastHint({ kind: 'full' });
        loadedRef.current = true;
      } catch (err) {
        console.error('Error loading theme:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [themeId, userId]);

  const save = useCallback(
    async (pending: PendingSave) => {
      if (!loadedRef.current) return;
      setSaving(true);
      savingRef.current = true;
      try {
        const { error } = await supabase
          .from('shopify_themes')
          .update({
            title: pending.title.trim() || 'Untitled theme',
            theme_data: pending.data as unknown as Json,
            base_version: pending.data.baseVersion ?? THEME_VERSION,
          })
          .eq('id', themeId);
        if (error) throw error;
        saveFailedRef.current = false;
        setSaveFailed(false);
      } catch (err) {
        console.error('Error saving theme:', err);
        saveFailedRef.current = true;
        setSaveFailed(true);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [themeId],
  );

  const scheduleSave = useCallback(
    (pending: PendingSave) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = pending;
      timerRef.current = setTimeout(() => {
        pendingRef.current = null;
        save(pending);
      }, SAVE_DELAY_MS);
    },
    [save],
  );

  const retrySave = useCallback(() => save(latestRef.current), [save]);

  const flushSave = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) await save(pending);
  }, [save]);

  // A failed save retries every 10s; Retry in the header does it sooner.
  useEffect(() => {
    if (!saveFailed) return;
    const retry = setTimeout(retrySave, 10000);
    return () => clearTimeout(retry);
  }, [saveFailed, retrySave]);

  useUnsavedChangesWarning(() => pendingRef.current !== null || savingRef.current || saveFailedRef.current);

  // Leaving or switching theme flushes an edit still waiting on the debounce.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) saveRef.current(pending);
    },
    [themeId],
  );

  const edit = useCallback(
    (update: (current: ThemeData) => ThemeData, hint: RenderHint = { kind: 'full' }) => {
      setData((current) => {
        const next = update(current);
        if (next === current) return current;
        scheduleSave({ data: next, title: latestRef.current.title });
        return next;
      });
      setLastHint(hint);
      setRevision((r) => r + 1);
    },
    [scheduleSave],
  );

  const setTitle = useCallback(
    (next: string) => {
      setTitleState(next);
      scheduleSave({ data: latestRef.current.data, title: next });
    },
    [scheduleSave],
  );

  const select = useCallback((next: Selection | null, options?: { fromPreview?: boolean }) => {
    setSelection(next);
    setSelectionFromPreview(!!options?.fromPreview);
  }, []);

  const changeTemplate = useCallback((next: string) => {
    setTemplate(next);
    // Group and theme selections still make sense on another template.
    setSelection((current) =>
      current && current.kind !== 'theme-settings' && current.ref.scope === 'template' ? null : current,
    );
    setLastHint({ kind: 'full' });
  }, []);

  const value = useMemo<ThemeEditorContextValue>(
    () => ({
      themeId,
      title,
      setTitle,
      data,
      revision,
      lastHint,
      edit,
      template,
      setTemplate: changeTemplate,
      selection,
      select,
      selectionFromPreview,
      device,
      setDevice,
      loading,
      notFound,
      saving,
      saveFailed,
      retrySave,
      flushSave,
    }),
    [themeId, title, setTitle, data, revision, lastHint, edit, template, changeTemplate, selection, select, selectionFromPreview, device, loading, notFound, saving, saveFailed, retrySave, flushSave],
  );

  return <ThemeEditorContext.Provider value={value}>{children}</ThemeEditorContext.Provider>;
};

export const useThemeEditor = () => {
  const context = useContext(ThemeEditorContext);
  if (!context) throw new Error('useThemeEditor must be used inside ThemeEditorProvider');
  return context;
};
