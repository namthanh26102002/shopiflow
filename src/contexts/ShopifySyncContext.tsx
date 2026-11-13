// Live two-way sync between the theme editor and the theme on the merchant's
// Shopify store, plus install / publish / disconnect.
//
// A sync round: pull the store's JSON files, compare each with the project
// and with the last agreed version (storeSync.ts), take Shopify's changes into
// the editor, send ours to the store, and stop for a choice when both sides
// changed the same file. Rounds run every 15 s while the tab is visible, when
// the tab regains focus, and a few seconds after each edit.
//
// A theme that is live on the store is never written automatically: shoppers
// would see half-made edits. Its changes still come in; going out waits for
// "Update store".
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useThemeEditor } from '@/contexts/ThemeEditorContext';
import { useShopifyStores, type ShopifyStore } from '@/hooks/useShopifyStores';
import { exportThemeZip } from '@/lib/shopifyTheme/exportZip';
import {
  applyRemoteFiles,
  canonical,
  localSyncFiles,
  planSync,
  type RemoteFile,
  type StoreSyncState,
} from '@/lib/shopifyTheme/storeSync';
import { ShopifyRequestError, bytesToBase64, shopifyApi, type LinkedTheme } from '@/lib/shopifyApi';

const POLL_MS = 15_000;
const PUSH_DELAY_MS = 2_500;
const PROCESSING_POLL_MS = 3_000;
const LIVE_SYNC_KEY = 'shopiflow:theme-live-sync';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'conflict' | 'error' | 'off';

interface Conflict {
  files: string[];
  remote: Record<string, RemoteFile>;
}

interface ShopifySyncValue {
  stores: ShopifyStore[];
  storesLoading: boolean;
  storesError: boolean;
  refreshStores: () => Promise<void>;
  theme: LinkedTheme | null;
  statusLoaded: boolean;
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error: string | null;
  conflict: Conflict | null;
  liveSync: boolean;
  setLiveSync: (on: boolean) => void;
  /** Pushes automatically (false for a live theme, or with live sync off). */
  autoPush: boolean;
  busy: boolean;
  install: (storeId: string) => Promise<void>;
  /** A full round now, sending our changes even to a live theme. */
  updateStore: () => Promise<void>;
  resolveConflict: (keep: 'mine' | 'theirs') => Promise<void>;
  publish: () => Promise<void>;
  disconnect: (storeId: string) => Promise<void>;
}

const ShopifySyncContext = createContext<ShopifySyncValue | undefined>(undefined);

const readLiveSync = () => {
  try {
    return localStorage.getItem(LIVE_SYNC_KEY) !== 'off';
  } catch {
    return true;
  }
};

const pick = <T,>(source: Record<string, T>, keys: string[]) =>
  Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]])) as Record<string, T>;

export const ShopifySyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { themeId, title, revision, edit, updateMeta, dataRef, flushSave, loading } = useThemeEditor();
  const { stores, loading: storesLoading, error: storesError, refresh: refreshStores } = useShopifyStores();
  const [theme, setTheme] = useState<LinkedTheme | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [liveSync, setLiveSyncState] = useState(readLiveSync);
  const [busy, setBusy] = useState(false);

  const themeRef = useRef(theme);
  themeRef.current = theme;
  const runningRef = useRef<Promise<void> | null>(null);
  const rerunRef = useRef<{ push: boolean } | null>(null);
  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Revisions caused by applying Shopify's changes, which need no push.
  const ownRevisionRef = useRef(-1);

  const autoPush = liveSync && !!theme && theme.role !== 'MAIN';

  const setLiveSync = useCallback((on: boolean) => {
    setLiveSyncState(on);
    try {
      localStorage.setItem(LIVE_SYNC_KEY, on ? 'on' : 'off');
    } catch {
      // Not remembered; still applies now.
    }
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      const code = err instanceof ShopifyRequestError ? err.code : undefined;
      if (code === 'store_disconnected' || code === 'theme_deleted' || code === 'not_installed') {
        setTheme(null);
        refreshStores();
      }
      const message = err instanceof Error ? err.message : 'Could not reach Shopify';
      setError(message);
      setStatus('error');
      return message;
    },
    [refreshStores],
  );

  /** One sync round. Rounds never overlap; a request during one queues another. */
  const runRound = useCallback(
    (options: { push: boolean }): Promise<void> => {
      if (runningRef.current) {
        rerunRef.current = { push: options.push || !!rerunRef.current?.push };
        return runningRef.current;
      }
      const linked = themeRef.current;
      if (!linked || linked.processing) return Promise.resolve();

      const round = (async () => {
        setStatus('syncing');
        try {
          const pulled = await shopifyApi.pull(themeId);
          setTheme(pulled.theme);
          if (!pulled.files) return; // Still processing.
          const remote = pulled.files;
          const checksums = Object.fromEntries(Object.entries(remote).map(([name, file]) => [name, file.checksum]));

          const data = dataRef.current;
          const saved = data.storeSync?.themeId === pulled.theme.id ? data.storeSync : undefined;
          // No agreement yet (first sync): treat the store's copy as agreed, so
          // only edits made here since count as ours.
          const base = saved?.base ?? Object.fromEntries(Object.entries(remote).map(([name, file]) => [name, canonical(file.content)]));
          const local = localSyncFiles(data);
          const plan = planSync(local, remote, base);

          if (Object.keys(plan.pull).length > 0) {
            ownRevisionRef.current = -2; // Mark: the next revision is Shopify's.
            const { skipped } = applyRemoteFiles(data, plan.pull);
            edit((current) => applyRemoteFiles(current, plan.pull).data);
            for (const name of skipped) delete plan.nextBase[name];
            toast.message('Changes made in Shopify were brought in.', { id: 'shopify-pulled' });
          }

          let finalChecksums = { ...checksums };
          const pushNames = Object.keys(plan.push);
          let pushed = false;
          if (pushNames.length > 0 && options.push) {
            try {
              const result = await shopifyApi.sync(themeId, plan.push, { baseChecksums: pick(checksums, pushNames) });
              finalChecksums = { ...finalChecksums, ...pick(result.checksums, pushNames) };
              pushed = true;
            } catch (err) {
              if (err instanceof ShopifyRequestError && err.code === 'conflict') {
                // Shopify changed in between: merge on the next round.
                rerunRef.current = { push: true };
              } else {
                throw err;
              }
            }
          }
          if (!pushed) {
            // Unsent files keep the old agreement, so they still count as ours next time.
            for (const name of pushNames) {
              if (name in base) plan.nextBase[name] = base[name];
              else delete plan.nextBase[name];
            }
          }

          const next: StoreSyncState = { themeId: pulled.theme.id, base: plan.nextBase, checksums: finalChecksums };
          updateMeta((current) => ({ ...current, storeSync: next }));

          if (plan.conflicts.length > 0) {
            setConflict({ files: plan.conflicts, remote: pick(remote, plan.conflicts) });
            setStatus('conflict');
          } else {
            setConflict(null);
            setStatus(pushNames.length > 0 && !pushed ? 'pending' : 'synced');
          }
          setError(null);
          setLastSyncedAt(new Date());
        } catch (err) {
          handleError(err);
        }
      })();

      runningRef.current = round.finally(() => {
        runningRef.current = null;
        const again = rerunRef.current;
        rerunRef.current = null;
        if (again) void runRound(again);
      });
      return runningRef.current;
    },
    [themeId, dataRef, edit, updateMeta, handleError],
  );

  // ---- Status and processing --------------------------------------------------

  const loadStatus = useCallback(async () => {
    try {
      const result = await shopifyApi.status(themeId);
      const linked = result.linked ? result.theme ?? null : null;
      setTheme(linked);
      if (!result.linked && result.reason === 'theme_deleted') {
        toast.message('The theme was deleted from your store, so it is no longer linked.');
      }
      return linked;
    } catch (err) {
      console.warn('Shopify status unavailable:', err);
      return null;
    } finally {
      setStatusLoaded(true);
    }
  }, [themeId]);

  const waitForProcessing = useCallback(
    (attempt = 0) => {
      if (processingTimer.current) clearTimeout(processingTimer.current);
      processingTimer.current = setTimeout(async () => {
        const linked = await loadStatus();
        if (linked?.processing && attempt < 60) waitForProcessing(attempt + 1);
        else if (linked && !linked.processing) void runRound({ push: false });
      }, PROCESSING_POLL_MS);
    },
    [loadStatus, runRound],
  );

  useEffect(() => {
    if (loading) return;
    setTheme(null);
    setStatusLoaded(false);
    setConflict(null);
    setStatus('idle');
    if (stores.length === 0) {
      setStatusLoaded(!storesLoading);
      return;
    }
    let cancelled = false;
    loadStatus().then((linked) => {
      if (cancelled || !linked) return;
      if (linked.processing) waitForProcessing();
      else void runRound({ push: false });
    });
    return () => {
      cancelled = true;
      if (processingTimer.current) clearTimeout(processingTimer.current);
    };
    // Runs per project and when stores appear; not on every round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, loading, stores.length, storesLoading]);

  // ---- Triggers -----------------------------------------------------------------

  const linkedId = theme?.id;
  const processing = !!theme?.processing;

  // Poll while visible, and catch up when the tab comes back.
  useEffect(() => {
    if (!linkedId || processing || !liveSync) {
      if (linkedId && !liveSync) setStatus('off');
      return;
    }
    const tick = () => {
      if (document.visibilityState === 'visible') void runRound({ push: autoPush });
    };
    const timer = setInterval(tick, POLL_MS);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [linkedId, processing, liveSync, autoPush, runRound]);

  // Send edits a moment after the merchant pauses.
  useEffect(() => {
    if (!linkedId || processing) return;
    if (ownRevisionRef.current === -2) {
      // This revision is Shopify's own changes arriving; nothing to send back.
      ownRevisionRef.current = revision;
      return;
    }
    if (revision === ownRevisionRef.current) return;
    if (!autoPush) {
      if (liveSync) setStatus((current) => (current === 'conflict' ? current : 'pending'));
      return;
    }
    setStatus((current) => (current === 'conflict' ? current : 'pending'));
    const timer = setTimeout(() => void runRound({ push: true }), PUSH_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  // ---- Actions --------------------------------------------------------------------

  const install = useCallback(
    async (storeId: string) => {
      const data = dataRef.current;
      const result = exportThemeZip(data, title);
      if ('problems' in result) {
        toast.error('This theme cannot be installed yet', { description: result.problems.slice(0, 3).join('\n') });
        return;
      }
      setBusy(true);
      try {
        await flushSave();
        const { theme: created } = await shopifyApi.install(themeId, storeId, bytesToBase64(result.bytes), title);
        // What we just uploaded is the agreement both sides start from.
        const base = Object.fromEntries(Object.entries(localSyncFiles(data)).map(([name, content]) => [name, canonical(content)]));
        updateMeta((current) => ({ ...current, storeSync: { themeId: created.id, base, checksums: {} } }));
        setTheme(created);
        setConflict(null);
        toast.success(`Added to ${created.shopName ?? created.shop} as an unpublished theme.`);
        if (created.processing) waitForProcessing();
        else void runRound({ push: false });
      } catch (err) {
        toast.error(handleError(err));
      } finally {
        setBusy(false);
      }
    },
    [dataRef, title, flushSave, themeId, updateMeta, waitForProcessing, runRound, handleError],
  );

  const updateStore = useCallback(async () => {
    setBusy(true);
    try {
      await runRound({ push: true });
    } finally {
      setBusy(false);
    }
  }, [runRound]);

  const resolveConflict = useCallback(
    async (keep: 'mine' | 'theirs') => {
      const current = conflict;
      if (!current) return;
      setBusy(true);
      try {
        const data = dataRef.current;
        const state = data.storeSync;
        if (keep === 'theirs') {
          const contents = Object.fromEntries(Object.entries(current.remote).map(([name, file]) => [name, file.content]));
          ownRevisionRef.current = -2;
          edit((d) => applyRemoteFiles(d, contents).data);
          updateMeta((d) => ({
            ...d,
            storeSync: {
              themeId: state?.themeId ?? themeRef.current?.id ?? '',
              base: { ...state?.base, ...Object.fromEntries(Object.entries(contents).map(([n, c]) => [n, canonical(c)])) },
              checksums: { ...state?.checksums, ...Object.fromEntries(Object.entries(current.remote).map(([n, f]) => [n, f.checksum])) },
            },
          }));
        } else {
          const local = pick(localSyncFiles(data), current.files);
          const baseChecksums = Object.fromEntries(Object.entries(current.remote).map(([n, f]) => [n, f.checksum]));
          const result = await shopifyApi.sync(themeId, local, { baseChecksums });
          updateMeta((d) => ({
            ...d,
            storeSync: {
              themeId: state?.themeId ?? themeRef.current?.id ?? '',
              base: { ...state?.base, ...Object.fromEntries(Object.entries(local).map(([n, c]) => [n, canonical(c)])) },
              checksums: { ...state?.checksums, ...pick(result.checksums, Object.keys(local)) },
            },
          }));
        }
        setConflict(null);
        setStatus('synced');
        setLastSyncedAt(new Date());
      } catch (err) {
        if (err instanceof ShopifyRequestError && err.code === 'conflict') {
          // Changed again while deciding: look again.
          void runRound({ push: false });
        } else {
          toast.error(handleError(err));
        }
      } finally {
        setBusy(false);
      }
    },
    [conflict, dataRef, edit, updateMeta, themeId, runRound, handleError],
  );

  const publish = useCallback(async () => {
    setBusy(true);
    try {
      // Publish what the editor shows, not an older copy.
      await runRound({ push: true });
      const result = await shopifyApi.publish(themeId);
      setTheme(result.theme);
      toast.success('Your theme is live.');
    } catch (err) {
      toast.error(handleError(err));
    } finally {
      setBusy(false);
    }
  }, [runRound, themeId, handleError]);

  const disconnect = useCallback(
    async (storeId: string) => {
      setBusy(true);
      try {
        await shopifyApi.disconnect(storeId);
        if (themeRef.current?.storeId === storeId) setTheme(null);
        await refreshStores();
        toast.success('Store disconnected. To remove the app fully, uninstall it in your Shopify admin.');
      } catch (err) {
        toast.error(handleError(err));
      } finally {
        setBusy(false);
      }
    },
    [refreshStores, handleError],
  );

  const value = useMemo<ShopifySyncValue>(
    () => ({
      stores,
      storesLoading,
      storesError,
      refreshStores,
      theme,
      statusLoaded,
      status,
      lastSyncedAt,
      error,
      conflict,
      liveSync,
      setLiveSync,
      autoPush,
      busy,
      install,
      updateStore,
      resolveConflict,
      publish,
      disconnect,
    }),
    [stores, storesLoading, storesError, refreshStores, theme, statusLoaded, status, lastSyncedAt, error, conflict, liveSync, setLiveSync, autoPush, busy, install, updateStore, resolveConflict, publish, disconnect],
  );

  return <ShopifySyncContext.Provider value={value}>{children}</ShopifySyncContext.Provider>;
};

export const useShopifySync = () => {
  const context = useContext(ShopifySyncContext);
  if (!context) throw new Error('useShopifySync must be used inside ShopifySyncProvider');
  return context;
};
