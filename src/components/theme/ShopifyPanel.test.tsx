import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShopifyPanel } from './ShopifyPanel';
import { baseThemeData } from '@/lib/shopifyTheme/themeSource';
import { ShopifyRequestError, type LinkedTheme } from '@/lib/shopifyApi';

const api = vi.hoisted(() => ({
  start: vi.fn(),
  install: vi.fn(),
  status: vi.fn(),
  sync: vi.fn(),
  publish: vi.fn(),
  disconnect: vi.fn(),
}));
const storesState = vi.hoisted(() => ({ stores: [] as Array<{ id: string; shop_domain: string; shop_name: string | null; connected_at: string }> }));

vi.mock('@/lib/shopifyApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/shopifyApi')>()),
  shopifyApi: api,
}));

vi.mock('@/hooks/useShopifyStores', () => ({
  useShopifyStores: () => ({ stores: storesState.stores, loading: false, error: false, refresh: vi.fn() }),
}));

const editor = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/contexts/ThemeEditorContext', () => ({ useThemeEditor: () => editor.value }));

const theme: LinkedTheme = {
  id: 'gid://shopify/OnlineStoreTheme/9',
  numericId: '9',
  name: 'Summer store',
  role: 'UNPUBLISHED',
  processing: false,
  processingFailed: false,
  shop: 'demo.myshopify.com',
  shopName: 'Demo',
  storeId: 'store-1',
};

const renderPanel = () => {
  render(
    <MemoryRouter>
      <ShopifyPanel />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /shopify/i }));
};

describe('ShopifyPanel', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    storesState.stores = [];
    editor.value = {
      themeId: 'project-1',
      title: 'Summer store',
      data: baseThemeData(),
      revision: 1,
      flushSave: vi.fn(async () => {}),
    };
  });

  it('asks for the store address when nothing is connected', async () => {
    api.start.mockResolvedValue({ url: 'https://demo.myshopify.com/admin/oauth/authorize?x=1', shop: 'demo.myshopify.com' });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, href: 'http://localhost/theme-builder/project-1', assign }, writable: true });

    renderPanel();
    fireEvent.change(await screen.findByLabelText('Your Shopify store address'), { target: { value: 'demo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect store' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://demo.myshopify.com/admin/oauth/authorize?x=1'));
    expect(api.start).toHaveBeenCalledWith('demo', 'http://localhost/theme-builder/project-1');
  });

  it('installs the theme on the chosen store as a ZIP', async () => {
    storesState.stores = [{ id: 'store-1', shop_domain: 'demo.myshopify.com', shop_name: 'Demo', connected_at: '' }];
    api.status.mockResolvedValue({ linked: false });
    api.install.mockResolvedValue({ theme });

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Install on store' }));

    await waitFor(() => expect(api.install).toHaveBeenCalled());
    const [projectId, storeId, zipBase64] = api.install.mock.calls[0];
    expect(projectId).toBe('project-1');
    expect(storeId).toBe('store-1');
    expect(atob(zipBase64).slice(0, 2)).toBe('PK');
    expect(await screen.findByRole('button', { name: /update store/i })).toBeInTheDocument();
  });

  it('sends only the merchant-editable JSON when updating', async () => {
    storesState.stores = [{ id: 'store-1', shop_domain: 'demo.myshopify.com', shop_name: 'Demo', connected_at: '' }];
    api.status.mockResolvedValue({ linked: true, theme });
    api.sync.mockResolvedValue({ theme, written: 3 });

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /update store/i }));

    await waitFor(() => expect(api.sync).toHaveBeenCalled());
    const files = Object.keys(api.sync.mock.calls[0][1]);
    expect(files).toContain('config/settings_data.json');
    expect(files).toContain('templates/index.json');
    expect(files).toContain('sections/header-group.json');
    expect(files.some((name) => name.endsWith('.liquid') || name.startsWith('assets/'))).toBe(false);
  });

  it('asks before overwriting edits made in Shopify', async () => {
    storesState.stores = [{ id: 'store-1', shop_domain: 'demo.myshopify.com', shop_name: 'Demo', connected_at: '' }];
    api.status.mockResolvedValue({ linked: true, theme });
    api.sync
      .mockRejectedValueOnce(new ShopifyRequestError('changed', 'conflict', ['templates/index.json']))
      .mockResolvedValueOnce({ theme, written: 3 });

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /update store/i }));

    expect(await screen.findByText('Changes were made in Shopify')).toBeInTheDocument();
    expect(screen.getByText('templates/index.json')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replace with mine' }));
    await waitFor(() => expect(api.sync).toHaveBeenLastCalledWith('project-1', expect.any(Object), true));
  });

  it('publishes only after confirmation', async () => {
    storesState.stores = [{ id: 'store-1', shop_domain: 'demo.myshopify.com', shop_name: 'Demo', connected_at: '' }];
    api.status.mockResolvedValue({ linked: true, theme });
    api.publish.mockResolvedValue({ theme: { ...theme, role: 'MAIN' } });

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Publish to store' }));
    expect(api.publish).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('project-1'));
  });
});
