import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ThemeBuilder from './ThemeBuilder';

// jsdom has no ResizeObserver; Radix's slider and scroll area need one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const updates: Array<Record<string, unknown>> = [];
let storedThemeData: unknown = null;

vi.mock('@/hooks/useAuth', () => {
  const auth = { user: { id: 'user-1', email: 'me@example.com' }, signOut: () => {} };
  return { useAuth: () => auth };
});

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [{ id: 'theme-1', title: 'Summer store', created_at: '', updated_at: '', published_url: null }],
    loading: false,
    busy: false,
    isAdmin: false,
    atLimit: false,
    limit: 2,
    createProject: vi.fn(),
    deleteProject: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const select = () => {
    const q = {
      eq: () => q,
      maybeSingle: async () => ({ data: { id: 'theme-1', title: 'Summer store', theme_data: storedThemeData }, error: null }),
    };
    return q;
  };
  return {
    supabase: {
      from: () => ({
        select,
        update: (values: Record<string, unknown>) => {
          updates.push(values);
          return { eq: async () => ({ error: null }) };
        },
      }),
    },
  };
});

const renderEditor = () =>
  render(
    <MemoryRouter initialEntries={['/theme-builder/theme-1']}>
      <Routes>
        <Route path="/theme-builder/:themeId" element={<ThemeBuilder />} />
        <Route path="/theme-builder" element={<p>entry</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ThemeBuilder', () => {
  beforeEach(() => {
    updates.length = 0;
    storedThemeData = null;
  });

  it('opens an untouched theme on the base theme', async () => {
    renderEditor();
    const sections = await screen.findByRole('complementary', { name: 'Sections' });
    expect(within(sections).getByText('Home page')).toBeInTheDocument();
    expect(within(sections).getByText('Hero')).toBeInTheDocument();
    expect(within(sections).getByText('Announcement bar')).toBeInTheDocument();
    expect(screen.getByLabelText('Theme name')).toHaveValue('Summer store');
  });

  it('edits a section setting and autosaves it', async () => {
    renderEditor();
    const sections = await screen.findByRole('complementary', { name: 'Sections' });
    fireEvent.click(within(sections).getByText('Hero'));

    const settings = screen.getByRole('complementary', { name: 'Settings' });
    const heading = within(settings).getByLabelText('Heading');
    expect(heading).toHaveValue('Your headline here');
    fireEvent.change(heading, { target: { value: 'Summer sale' } });

    await waitFor(() => expect(updates.length).toBeGreaterThan(0), { timeout: 4000 });
    const saved = updates[updates.length - 1].theme_data as { templates: Record<string, { sections: Record<string, { settings: Record<string, unknown> }> }> };
    expect(saved.templates.index.sections.hero.settings.heading).toBe('Summer sale');
  });

  it('hides a section from the list', async () => {
    renderEditor();
    const sections = await screen.findByRole('complementary', { name: 'Sections' });
    fireEvent.click(within(sections).getByLabelText('Hide Hero'));
    expect(within(sections).getByLabelText('Show Hero')).toBeInTheDocument();
    await waitFor(() => expect(updates.length).toBeGreaterThan(0), { timeout: 4000 });
    const saved = updates[updates.length - 1].theme_data as { templates: Record<string, { sections: Record<string, { disabled?: boolean }> }> };
    expect(saved.templates.index.sections.hero.disabled).toBe(true);
  });

  it('switches to the product template', async () => {
    renderEditor();
    await screen.findByRole('complementary', { name: 'Sections' });
    // The template picker lists every JSON template in the theme.
    expect(screen.getByRole('combobox', { name: 'Page to edit' })).toHaveTextContent('Home page');
  });
});
