import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

const projects = {
  quizzes: [
    { id: 'q1', title: 'Skin quiz', created_at: '2026-10-01', updated_at: new Date().toISOString(), published_url: 'x' },
  ],
  advertorials: [],
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'me@example.com' }, signOut: vi.fn() }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: (table: 'quizzes' | 'advertorials') => ({
    projects: projects[table],
    loading: false,
    busy: false,
    isAdmin: false,
    atLimit: false,
    limit: 2,
    createProject: vi.fn(),
  }),
}));

// Every count query resolves to 10 starts; the completed query (it adds .not) to 4.
vi.mock('@/integrations/supabase/client', () => {
  const query = (count: number) => {
    const q: Record<string, unknown> = {};
    const chain = () => q;
    Object.assign(q, {
      eq: chain,
      gte: chain,
      not: () => query(4),
      then: (resolve: (v: { count: number }) => void) => resolve({ count }),
    });
    return q;
  };
  return { supabase: { from: () => ({ select: () => query(10) }) } };
});

describe('Home', () => {
  it('lists projects with status and last-30-day stats', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('Skin quiz')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 used')).toBeInTheDocument();
    expect(screen.getByText('No advertorials yet')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('40%')).toBeInTheDocument());
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
