import React, { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShopifyPanel } from './ShopifyPanel';
import { ShopifySyncProvider } from '@/contexts/ShopifySyncContext';
// @ts-expect-error EditorContext exists only in this file's mock.
import { EditorContext } from '@/contexts/ThemeEditorContext';
import { baseThemeData } from '@/lib/shopifyTheme/themeSource';
import { canonical, localSyncFiles } from '@/lib/shopifyTheme/storeSync';
import { updateSectionSetting } from '@/lib/shopifyTheme/state';
import type { ThemeData } from '@/lib/shopifyTheme/types';
import { ShopifyRequestError, type LinkedTheme } from '@/lib/shopifyApi';

const api = vi.hoisted(() => ({
  start: vi.fn(),
  install: vi.fn(),
  status: vi.fn(),
  sync: vi.fn(),
  pull: vi.fn(),
  publish: vi.fn(),
  disconnect: vi.fn(),
}));
const storesState = vi.hoisted(() => ({ stores: [] as Array<{ id: string; shop_domain: string; shop_name: string | null; connected_at: string }> }));
const editorHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('@/lib/shopifyApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/shopifyApi')>()),
  shopifyApi: api,
}));
vi.mock('@/hooks/useShopifyStores', () => ({
  useShopifyStores: () => ({ stores: storesState.stores, loading: false, error: false, refresh: vi.fn(async () => {}) }),
}));
// A real context, so consumers re-render on edits as they do in the app.
vi.mock('@/contexts/ThemeEditorContext', async () => {
  const { createContext, useContext } = await import('react');
  const EditorContext = createContext<unknown>(null);
  return { useThemeEditor: () => useContext(EditorContext), EditorContext };
});

const THEME_ID = 'gid://shopify/OnlineStoreTheme/9';
const theme: LinkedTheme = {
  id: THEME_ID,
  numericId: '9',
  name: 'Summer store',
  role: 'UNPUBLISHED',
  processing: false,
  processingFailed: false,
  shop: 'demo.myshopify.com',
  shopName: 'Demo',
  storeId: 'store-1',
};

const remoteOf = (data: ThemeData, checksum = 'c1') =>
  Object.fromEntries(Object.entries(localSyncFiles(data)).map(([name, content]) => [name, { content, checksum }]));

/** A stand-in for ThemeEditorProvider: real state, so edits re-render. */
let latestData: ThemeData;
let editSpy: ReturnType<typeof vi.fn>;
const Harness: React.FC<{ initial: ThemeData; children: React.ReactNode }> = ({ initial, children }) => {
  const [data, setData] = useState(initial);
  const [revision, setRevision] = useState(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  latestData = data;
  editorHolder.current = {
    themeId: 'project-1',
    title: 'Summer store',
    data,
    dataRef,
    revision,
    loading: false,
    flushSave: async () => {},
    edit: (update: (d: ThemeData) => ThemeData) => {
      editSpy(update);
      setData((d) => update(d));
      setRevision((r) => r + 1);
    },
    updateMeta: (update: (d: ThemeData) => ThemeData) => setData((d) => update(d)),
  };
  return <EditorContext.Provider value={editorHolder.current}>{children}</EditorContext.Provider>;
};

const renderPanel = (initial: ThemeData = baseThemeData()) => {
  const utils = render(
    <MemoryRouter>
      <Harness initial={initial}>
        <ShopifySyncProvider>
          <ShopifyPanel />
        </ShopifySyncProvider>
      </Harness>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /shopify/i }));
  return utils;
};

const linkedStore = () => {
  storesState.stores = [{ id: 'store-1', shop_domain: 'demo.myshopify.com', shop_name: 'Demo', connected_at: '' }];
};

/** Theme data already agreed with the store (as after an install). */
const agreed = (data: ThemeData): ThemeData => {
  const remote = remoteOf(data);
  return {
    ...data,
    storeSync: {
      themeId: THEME_ID,
      base: Object.fromEntries(Object.entries(remote).map(([n, f]) => [n, canonical(f.content)])),
      checksums: {},
    },
  };
};

describe('ShopifyPanel with live sync', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    storesState.stores = [];
    editSpy = vi.fn();
  });

  it('asks for the store address when nothing is connected', async () => {
    api.start.mockResolvedValue({ url: 'https://demo.myshopify.com/admin/oauth/authorize?x=1', shop: 'demo.myshopify.com' });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, href: 'http://localhost/theme-builder/project-1', assign }, writable: true });

    renderPanel();
    fireEvent.change(await screen.findByLabelText('Your Shopify store address'), { target: { value: 'demo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect store' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://demo.myshopify.com/admin/oauth/authorize?x=1'));
  });

  it('installs the theme and records what was uploaded as the agreed version', async () => {
    linkedStore();
    api.status.mockResolvedValue({ linked: false });
    api.install.mockResolvedValue({ theme: { ...theme, processing: true } });

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Install on store' }));

    await waitFor(() => expect(api.install).toHaveBeenCalled());
    expect(atob(api.install.mock.calls[0][2]).slice(0, 2)).toBe('PK');
    await waitFor(() => expect(latestData.storeSync?.themeId).toBe(THEME_ID));
    expect(Object.keys(latestData.storeSync!.base)).toContain('templates/index.json');
  });

  it('brings in an edit made in Shopify', async () => {
    linkedStore();
    const start = baseThemeData();
    const inShopify = updateSectionSetting(start, { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'Edited in Shopify');
    api.status.mockResolvedValue({ linked: true, theme });
    // First round with no agreement yet adopts the store as agreed; the second sees the change.
    api.pull.mockResolvedValueOnce({ theme, files: remoteOf(start) }).mockResolvedValue({ theme, files: remoteOf(inShopify, 'c2') });

    renderPanel(start);
    await waitFor(() => expect(api.pull).toHaveBeenCalledTimes(1));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(latestData.templates.index.sections.hero.settings?.heading).toBe('Edited in Shopify'));
    expect(api.sync).not.toHaveBeenCalled();
  });

  it('sends an edit made here, guarded by the checksums it last saw', async () => {
    linkedStore();
    const start = agreed(baseThemeData());
    api.status.mockResolvedValue({ linked: true, theme });
    api.pull.mockResolvedValue({ theme, files: remoteOf(start, 'seen') });
    api.sync.mockResolvedValue({ theme, written: 1, checksums: { 'templates/index.json': 'new' } });

    renderPanel(start);
    await waitFor(() => expect(api.pull).toHaveBeenCalled());
    await screen.findByText(/in sync with your store/i);

    const edit = (editorHolder.current as { edit: (u: (d: ThemeData) => ThemeData) => void }).edit;
    act(() => edit((d) => updateSectionSetting(d, { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'Edited here')));

    await waitFor(() => expect(api.sync).toHaveBeenCalled(), { timeout: 5000 });
    const [, files, options] = api.sync.mock.calls[0];
    expect(Object.keys(files)).toEqual(['templates/index.json']);
    expect(options.baseChecksums).toEqual({ 'templates/index.json': 'seen' });
    await waitFor(() => expect(latestData.storeSync?.checksums['templates/index.json']).toBe('new'));
  }, 10_000);

  it('asks which version to keep when both sides changed the same file', async () => {
    linkedStore();
    const start = agreed(baseThemeData());
    const here = updateSectionSetting(start, { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'Mine');
    const there = updateSectionSetting(start, { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'Theirs');
    api.status.mockResolvedValue({ linked: true, theme });
    api.pull.mockResolvedValue({ theme, files: remoteOf(there, 'theirs') });
    api.sync.mockResolvedValue({ theme, written: 1, checksums: { 'templates/index.json': 'mine' } });

    renderPanel(here);
    expect(await screen.findByText('Changed here and in Shopify')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));

    await waitFor(() => expect(api.sync).toHaveBeenCalled());
    const [, files, options] = api.sync.mock.calls[0];
    expect(JSON.parse(files['templates/index.json']).sections.hero.settings.heading).toBe('Mine');
    expect(options.baseChecksums).toEqual({ 'templates/index.json': 'theirs' });
  });

  it('never writes to a live theme on its own; Update store does', async () => {
    linkedStore();
    const live = { ...theme, role: 'MAIN' };
    const start = agreed(baseThemeData());
    const here = updateSectionSetting(start, { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'Mine');
    api.status.mockResolvedValue({ linked: true, theme: live });
    api.pull.mockResolvedValue({ theme: live, files: remoteOf(start, 'c') });
    api.sync.mockResolvedValue({ theme: live, written: 1, checksums: {} });

    renderPanel(here);
    expect(await screen.findByText(/not live yet/i)).toBeInTheDocument();
    expect(api.sync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Update store' }));
    await waitFor(() => expect(api.sync).toHaveBeenCalled());
  });

  it('shows a sync error and offers to retry', async () => {
    linkedStore();
    api.status.mockResolvedValue({ linked: true, theme });
    api.pull.mockRejectedValue(new ShopifyRequestError("Shopify hasn't given Shopiflow permission", 'access_denied'));

    renderPanel(agreed(baseThemeData()));
    expect(await screen.findByText(/hasn't given Shopiflow permission/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
