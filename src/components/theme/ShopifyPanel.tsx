// The "Shopify" menu in the theme editor header: connect a store, install the
// theme on it as an unpublished theme, push later edits, preview on the real
// store, and publish.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, Loader2, RefreshCw, Store, Unplug, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useThemeEditor } from '@/contexts/ThemeEditorContext';
import { useShopifyStores } from '@/hooks/useShopifyStores';
import { buildThemeFiles, exportThemeZip } from '@/lib/shopifyTheme/exportZip';
import {
  ShopifyRequestError,
  bytesToBase64,
  isSyncableThemeFile,
  shopifyApi,
  storeEditorUrl,
  storePreviewUrl,
  type LinkedTheme,
} from '@/lib/shopifyApi';
import { cn } from '@/lib/utils';

type Busy = 'connecting' | 'installing' | 'syncing' | 'publishing' | 'disconnecting' | null;

const RETURN_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Store connected.' },
  invalid: { ok: false, text: 'Shopify sent back a request we could not verify. Try connecting again.' },
  expired: { ok: false, text: 'That connection attempt expired. Try again.' },
  'missing-scopes': { ok: false, text: 'Shopiflow needs all the permissions it asked for to install themes.' },
  failed: { ok: false, text: 'Connecting to Shopify failed. Try again.' },
};

const POLL_MS = 3000;
const POLL_LIMIT = 60;

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');

export const ShopifyPanel: React.FC = () => {
  const { themeId, title, data, revision, flushSave } = useThemeEditor();
  const { stores, loading: storesLoading, error: storesError, refresh: refreshStores } = useShopifyStores();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [theme, setTheme] = useState<LinkedTheme | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [shopInput, setShopInput] = useState('');
  const [storeId, setStoreId] = useState<string>('');
  const [showConnect, setShowConnect] = useState(false);
  const [conflictFiles, setConflictFiles] = useState<string[] | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [syncedRevision, setSyncedRevision] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Back from Shopify's approval screen: say how it went, then tidy the URL.
  useEffect(() => {
    const result = searchParams.get('shopify');
    if (!result) return;
    const message = RETURN_MESSAGES[result] ?? RETURN_MESSAGES.failed;
    if (message.ok) toast.success(message.text);
    else toast.error(message.text);
    refreshStores();
    setOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('shopify');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, refreshStores]);

  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const stopPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  };

  const loadStatus = useCallback(
    async (attempt = 0) => {
      try {
        const result = await shopifyApi.status(themeId);
        setTheme(result.linked ? result.theme ?? null : null);
        if (!result.linked && result.reason === 'theme_deleted') {
          toast.message('The theme was deleted from your store, so it is no longer linked.');
        }
        // Shopify unpacks a new theme in the background; check again until done.
        if (result.theme?.processing && attempt < POLL_LIMIT) {
          pollRef.current = setTimeout(() => loadStatus(attempt + 1), POLL_MS);
        }
      } catch (err) {
        // The connection features are optional; a failure here stays quiet.
        console.warn('Shopify status unavailable:', err);
      } finally {
        setStatusLoaded(true);
      }
    },
    [themeId],
  );

  useEffect(() => {
    setTheme(null);
    setStatusLoaded(false);
    setSyncedRevision(null);
    stopPolling();
    if (stores.length > 0) loadStatus();
    else setStatusLoaded(true);
    return stopPolling;
  }, [themeId, stores.length, loadStatus]);

  const handleError = (err: unknown) => {
    if (err instanceof ShopifyRequestError && err.code === 'store_disconnected') {
      refreshStores();
      setTheme(null);
    }
    toast.error(errorText(err));
  };

  const connect = async () => {
    setBusy('connecting');
    try {
      await flushSave();
      const { url } = await shopifyApi.start(shopInput, window.location.href);
      window.location.assign(url);
    } catch (err) {
      handleError(err);
      setBusy(null);
    }
  };

  const install = async (targetStoreId: string) => {
    const result = exportThemeZip(data, title);
    if ('problems' in result) {
      toast.error('This theme cannot be installed yet', { description: result.problems.slice(0, 3).join('\n') });
      return;
    }
    setBusy('installing');
    try {
      await flushSave();
      const { theme: created } = await shopifyApi.install(themeId, targetStoreId, bytesToBase64(result.bytes), title);
      setTheme(created);
      setSyncedRevision(revision);
      toast.success(`Added to ${created.shopName ?? created.shop} as an unpublished theme.`);
      stopPolling();
      if (created.processing) pollRef.current = setTimeout(() => loadStatus(1), POLL_MS);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  const sync = async (force = false) => {
    setBusy('syncing');
    setConflictFiles(null);
    try {
      const files = Object.fromEntries(Object.entries(buildThemeFiles(data)).filter(([name]) => isSyncableThemeFile(name)));
      const result = await shopifyApi.sync(themeId, files, force);
      setTheme(result.theme);
      setSyncedRevision(revision);
      toast.success('Your store has the latest changes.');
    } catch (err) {
      if (err instanceof ShopifyRequestError && err.code === 'conflict') setConflictFiles(err.files ?? []);
      else handleError(err);
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    setConfirmPublish(false);
    setBusy('publishing');
    try {
      const result = await shopifyApi.publish(themeId);
      setTheme(result.theme);
      toast.success('Your theme is live.');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (id: string) => {
    setBusy('disconnecting');
    try {
      await shopifyApi.disconnect(id);
      if (theme?.storeId === id) setTheme(null);
      if (storeId === id) setStoreId('');
      await refreshStores();
      toast.success('Store disconnected. To remove the app fully, uninstall it in your Shopify admin.');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  const linkedStore = theme ? stores.find((store) => store.id === theme.storeId) : undefined;
  const live = theme?.role === 'MAIN';
  const unsynced = theme && syncedRevision !== null && revision !== syncedRevision;

  const connectForm = (
    <div className="space-y-2">
      <Label htmlFor="shopify-shop" className="text-xs font-medium">Your Shopify store address</Label>
      <Input
        id="shopify-shop"
        value={shopInput}
        onChange={(e) => setShopInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && shopInput.trim() && connect()}
        placeholder="your-store.myshopify.com"
        className="h-8 text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Shopify will ask you to approve Shopiflow, then bring you back here.
      </p>
      <Button size="sm" className="w-full" disabled={!shopInput.trim() || busy !== null} onClick={connect}>
        {busy === 'connecting' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Store className="mr-1.5 h-3.5 w-3.5" />}
        Connect store
      </Button>
    </div>
  );

  let body: React.ReactNode;
  if (storesLoading || !statusLoaded) {
    body = (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your store…
      </div>
    );
  } else if (storesError) {
    body = <p className="text-sm text-muted-foreground">Store connections are not available right now.</p>;
  } else if (theme) {
    body = (
      <div className="space-y-3">
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{theme.name}</p>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                live ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-secondary text-muted-foreground',
              )}
            >
              {live ? 'Live' : 'Unpublished'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{theme.shopName ?? theme.shop}</p>
          {theme.processing && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Shopify is setting up the theme…
            </p>
          )}
          {theme.processingFailed && (
            <p className="mt-2 text-xs text-destructive">Shopify could not set up this theme. Install it again.</p>
          )}
        </div>

        <Button size="sm" className="w-full" disabled={busy !== null || theme.processing} onClick={() => sync(false)}>
          {busy === 'syncing' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
          Update store
          {unsynced && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="Has changes not on the store" />}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild disabled={theme.processing}>
            <a href={storePreviewUrl(theme)} target="_blank" rel="noreferrer">
              Preview <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild disabled={theme.processing}>
            <a href={storeEditorUrl(theme)} target="_blank" rel="noreferrer" title="Add images and products in Shopify's editor">
              Customize <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>

        {!live && (
          <Button variant="secondary" size="sm" className="w-full" disabled={busy !== null || theme.processing} onClick={() => setConfirmPublish(true)}>
            {busy === 'publishing' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Publish to store
          </Button>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" disabled={busy !== null} onClick={() => install(theme.storeId)}>
            Install a fresh copy
          </button>
          {linkedStore && (
            <button type="button" className="text-muted-foreground underline-offset-2 hover:text-destructive hover:underline" disabled={busy !== null} onClick={() => disconnect(linkedStore.id)}>
              Disconnect store
            </button>
          )}
        </div>
      </div>
    );
  } else if (stores.length === 0 || showConnect) {
    body = (
      <div className="space-y-3">
        {connectForm}
        {stores.length > 0 && (
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setShowConnect(false)}>
            Back
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Store</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Choose a store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.shop_name ?? store.shop_domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="w-full" disabled={!storeId || busy !== null} onClick={() => install(storeId)}>
          {busy === 'installing' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
          Install on store
        </Button>
        <p className="text-xs text-muted-foreground">
          Adds this theme to the store as an unpublished theme. Your live store does not change until you publish.
        </p>
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <button type="button" className="text-muted-foreground hover:underline" onClick={() => setShowConnect(true)}>
            Connect another store
          </button>
          {storeId && (
            <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-destructive" disabled={busy !== null} onClick={() => disconnect(storeId)}>
              <Unplug className="h-3 w-3" /> Disconnect
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative h-8">
            <Store className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Shopify</span>
            {theme && (
              <span
                className={cn('absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card', live ? 'bg-green-500' : 'bg-blue-500')}
                aria-label={live ? 'Live on your store' : 'Installed on your store'}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <h3 className="mb-3 text-sm font-semibold">Shopify store</h3>
          {body}
        </PopoverContent>
      </Popover>

      <AlertDialog open={conflictFiles !== null} onOpenChange={(next) => !next && setConflictFiles(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changes were made in Shopify</AlertDialogTitle>
            <AlertDialogDescription>
              Someone edited this theme in Shopify's editor since your last update. Updating from here replaces those edits in:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-40 list-disc overflow-y-auto pl-5 font-mono text-xs text-muted-foreground">
            {(conflictFiles ?? []).map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Shopify's version</AlertDialogCancel>
            <AlertDialogAction onClick={() => sync(true)}>Replace with mine</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish “{theme?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Shoppers on {theme?.shopName ?? theme?.shop} will see this theme right away. Your current live theme stays in your
              Shopify theme library, so you can switch back from Shopify's admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={publish}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
