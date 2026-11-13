// The "Shopify" menu in the theme editor header: connect a store, install the
// theme on it, keep it in live two-way sync, preview on the real store, and
// publish. The sync itself runs in ShopifySyncContext.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, CheckCircle2, CloudOff, ExternalLink, Loader2, RefreshCw, Store, Unplug, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { useShopifySync, type SyncStatus } from '@/contexts/ShopifySyncContext';
import { shopifyApi, storeEditorUrl, storePreviewUrl } from '@/lib/shopifyApi';
import { cn } from '@/lib/utils';

const RETURN_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Store connected.' },
  invalid: { ok: false, text: 'Shopify sent back a request we could not verify. Try connecting again.' },
  expired: { ok: false, text: 'That connection attempt expired. Try again.' },
  'missing-scopes': { ok: false, text: 'Shopiflow needs all the permissions it asked for to install themes.' },
  failed: { ok: false, text: 'Connecting to Shopify failed. Try again.' },
};

const STATUS_DOT: Record<SyncStatus, string> = {
  idle: 'bg-muted-foreground',
  syncing: 'bg-blue-500 animate-pulse',
  synced: 'bg-green-500',
  pending: 'bg-amber-400',
  conflict: 'bg-red-500',
  error: 'bg-red-500',
  off: 'bg-muted-foreground',
};

const SyncLine: React.FC = () => {
  const { status, lastSyncedAt, error, autoPush, liveSync, theme } = useShopifySync();
  const ago = lastSyncedAt ? formatDistanceToNowStrict(lastSyncedAt, { addSuffix: true }) : null;
  let icon = <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
  let text: string;
  switch (status) {
    case 'syncing':
      icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      text = 'Syncing with your store…';
      break;
    case 'pending':
      icon = <RefreshCw className="h-3.5 w-3.5 text-amber-500" />;
      text = autoPush ? 'Sending your changes…' : theme?.role === 'MAIN' ? 'Your changes are not live yet. Update store to publish them.' : 'Your changes are not on the store yet.';
      break;
    case 'conflict':
      icon = <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      text = 'Changed here and in Shopify. Choose which to keep.';
      break;
    case 'error':
      icon = <CloudOff className="h-3.5 w-3.5 text-destructive" />;
      text = error ?? 'Could not reach your store.';
      break;
    case 'off':
      icon = <CloudOff className="h-3.5 w-3.5" />;
      text = 'Live sync is off.';
      break;
    default:
      text = ago ? `In sync with your store · ${ago}` : liveSync ? 'In sync with your store' : 'Live sync is off.';
  }
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground" role="status">
      <span className="mt-px shrink-0">{icon}</span>
      <span>{text}</span>
    </p>
  );
};

export const ShopifyPanel: React.FC = () => {
  const { flushSave } = useThemeEditor();
  const sync = useShopifySync();
  const { stores, storesLoading, storesError, theme, statusLoaded, busy, status, liveSync, autoPush, conflict } = sync;
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [shopInput, setShopInput] = useState('');
  const [storeId, setStoreId] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  // Back from Shopify's approval screen: say how it went, then tidy the URL.
  useEffect(() => {
    const result = searchParams.get('shopify');
    if (!result) return;
    const message = RETURN_MESSAGES[result] ?? RETURN_MESSAGES.failed;
    if (message.ok) toast.success(message.text);
    else toast.error(message.text);
    sync.refreshStores();
    setOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('shopify');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const connect = async () => {
    setConnecting(true);
    try {
      await flushSave();
      const { url } = await shopifyApi.start(shopInput, window.location.href);
      window.location.assign(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach Shopify');
      setConnecting(false);
    }
  };

  const live = theme?.role === 'MAIN';
  const linkedStore = theme ? stores.find((store) => store.id === theme.storeId) : undefined;

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
      <p className="text-xs text-muted-foreground">Shopify will ask you to approve Shopiflow, then bring you back here.</p>
      <Button size="sm" className="w-full" disabled={!shopInput.trim() || connecting} onClick={connect}>
        {connecting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Store className="mr-1.5 h-3.5 w-3.5" />}
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
          {theme.processing ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Shopify is setting up the theme…
            </p>
          ) : theme.processingFailed ? (
            <p className="mt-2 text-xs text-destructive">Shopify could not set up this theme. Install it again.</p>
          ) : (
            <div className="mt-2">
              <SyncLine />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="shopify-live-sync" className="text-xs font-medium">Live sync</Label>
            <p className="text-[11px] text-muted-foreground">
              {live ? 'Brings in Shopify edits. Your edits wait for Update store.' : 'Edits flow both ways as you work.'}
            </p>
          </div>
          <Switch id="shopify-live-sync" checked={liveSync} onCheckedChange={sync.setLiveSync} />
        </div>

        {(!autoPush || status === 'error') && (
          <Button size="sm" className="w-full" disabled={busy || theme.processing} onClick={sync.updateStore}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            {status === 'error' ? 'Try again' : 'Update store'}
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={storePreviewUrl(theme)} target="_blank" rel="noreferrer">
              Preview <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={storeEditorUrl(theme)} target="_blank" rel="noreferrer" title="Add images and products in Shopify's editor">
              Customize <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>

        {!live && (
          <Button variant="secondary" size="sm" className="w-full" disabled={busy || theme.processing} onClick={() => setConfirmPublish(true)}>
            Publish to store
          </Button>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" disabled={busy} onClick={() => sync.install(theme.storeId)}>
            Install a fresh copy
          </button>
          {linkedStore && (
            <button type="button" className="text-muted-foreground underline-offset-2 hover:text-destructive hover:underline" disabled={busy} onClick={() => sync.disconnect(linkedStore.id)}>
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
        <Button size="sm" className="w-full" disabled={!storeId || busy} onClick={() => sync.install(storeId)}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
          Install on store
        </Button>
        <p className="text-xs text-muted-foreground">
          Adds this theme to the store as an unpublished theme and keeps the two in sync. Your live store does not change until you publish.
        </p>
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <button type="button" className="text-muted-foreground hover:underline" onClick={() => setShowConnect(true)}>
            Connect another store
          </button>
          {storeId && (
            <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => sync.disconnect(storeId)}>
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
                className={cn('absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card', STATUS_DOT[status])}
                aria-label={`Store sync: ${status}`}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <h3 className="mb-3 text-sm font-semibold">Shopify store</h3>
          {body}
        </PopoverContent>
      </Popover>

      <AlertDialog open={!!conflict && !busy}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changed here and in Shopify</AlertDialogTitle>
            <AlertDialogDescription>
              Since the last sync, these were edited both in Shopiflow and in Shopify's editor. Choose which version to keep. The other one is replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-40 list-disc overflow-y-auto pl-5 font-mono text-xs text-muted-foreground">
            {(conflict?.files ?? []).map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => sync.resolveConflict('theirs')}>Use Shopify's</AlertDialogCancel>
            <AlertDialogAction onClick={() => sync.resolveConflict('mine')}>Keep mine</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish “{theme?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Shoppers on {theme?.shopName ?? theme?.shop} will see this theme right away. Your current live theme stays in your
              Shopify theme library, so you can switch back from Shopify's admin. After publishing, your edits here wait for
              Update store instead of going live as you type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmPublish(false);
                void sync.publish();
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
