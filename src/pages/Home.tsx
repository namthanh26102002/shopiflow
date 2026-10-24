// /home — every quiz and advertorial in one place, with how each is doing.
//
// Before this, signing in dropped you into whichever quiz you touched last and
// the only list was the dropdown next to the project name.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { BookOpen, HelpCircle, LogOut, Newspaper, Package, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProjectSummary, ProjectTable, useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { cn } from '@/lib/utils';

const STATS_DAYS = 30;

interface ProjectStats {
  /** Quiz starts, or advertorial page views. */
  visits: number;
  /** Quiz completions; undefined for advertorials. */
  completions?: number;
}

const since = () => new Date(Date.now() - STATS_DAYS * 24 * 60 * 60 * 1000).toISOString();

// Counted with head requests: one row per visit would hit the API's row cap
// on a busy page and undercount.
const loadQuizStats = async (id: string): Promise<ProjectStats> => {
  const from = since();
  const [starts, completions] = await Promise.all([
    supabase.from('quiz_responses').select('id', { count: 'exact', head: true })
      .eq('quiz_id', id).gte('started_at', from),
    supabase.from('quiz_responses').select('id', { count: 'exact', head: true })
      .eq('quiz_id', id).gte('started_at', from).not('completed_at', 'is', null),
  ]);
  return { visits: starts.count ?? 0, completions: completions.count ?? 0 };
};

const loadAdvertorialStats = async (id: string): Promise<ProjectStats> => {
  const { count } = await supabase.from('advertorial_events').select('id', { count: 'exact', head: true })
    .eq('advertorial_id', id).eq('event_type', 'page_view').gte('created_at', since());
  return { visits: count ?? 0 };
};

const useProjectStats = (table: ProjectTable, projects: ProjectSummary[]) => {
  const [stats, setStats] = useState<Record<string, ProjectStats>>({});
  const ids = projects.map((p) => p.id).join(',');

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    const load = table === 'quizzes' ? loadQuizStats : loadAdvertorialStats;
    Promise.all(ids.split(',').map(async (id) => [id, await load(id)] as const))
      .then((entries) => { if (!cancelled) setStats(Object.fromEntries(entries)); })
      .catch((err) => console.error(`Error loading ${table} stats:`, err));
    return () => { cancelled = true; };
  }, [table, ids]);

  return stats;
};

const StatusPill: React.FC<{ live: boolean }> = ({ live }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
      live
        ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
        : 'border-border text-muted-foreground'
    )}
  >
    <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-green-500' : 'bg-muted-foreground/60')} />
    {live ? 'Live' : 'Draft'}
  </span>
);

const ProjectCard: React.FC<{
  project: ProjectSummary;
  table: ProjectTable;
  stats?: ProjectStats;
  onOpen: () => void;
}> = ({ project, table, stats, onOpen }) => {
  const live = !!project.published_url;
  const rate = stats?.completions !== undefined && stats.visits > 0
    ? Math.round((stats.completions / stats.visits) * 100)
    : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-foreground truncate group-hover:text-primary">
          {project.title || 'Untitled'}
        </h3>
        <StatusPill live={live} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Edited {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
      </p>

      <div className="mt-4 flex items-end gap-6">
        {stats ? (
          <>
            <div>
              <p className="text-xl font-semibold text-foreground tabular-nums">{stats.visits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{table === 'quizzes' ? 'starts' : 'views'}</p>
            </div>
            {table === 'quizzes' && (
              <div>
                <p className="text-xl font-semibold text-foreground tabular-nums">{rate === null ? '—' : `${rate}%`}</p>
                <p className="text-xs text-muted-foreground">completed</p>
              </div>
            )}
          </>
        ) : (
          <Skeleton className="h-10 w-32" />
        )}
        <p className="ml-auto text-[11px] text-muted-foreground">last {STATS_DAYS} days</p>
      </div>
    </button>
  );
};

const ProjectSection: React.FC<{
  table: ProjectTable;
  title: string;
  noun: string;
  icon: React.ElementType;
  basePath: string;
}> = ({ table, title, noun, icon: Icon, basePath }) => {
  const navigate = useNavigate();
  const { projects, loading, busy, isAdmin, atLimit, limit, createProject } = useProjects(table);
  const stats = useProjectStats(table, projects);

  const handleCreate = async () => {
    const id = await createProject();
    if (id) navigate(`${basePath}/${id}`);
  };

  return (
    <section aria-labelledby={`${table}-heading`}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 id={`${table}-heading`} className="text-sm font-semibold text-foreground">{title}</h2>
          {!loading && !isAdmin && (
            <span className="text-xs text-muted-foreground">{projects.length} of {limit} used</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={busy || loading || atLimit}
          title={atLimit ? `You can keep up to ${limit}. Delete one to make room.` : undefined}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New {noun}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-foreground font-medium">No {noun}s yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create one to start collecting visits.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              table={table}
              stats={stats[p.id]}
              onOpen={() => navigate(`${basePath}/${p.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between gap-3 px-4">
        <BuilderSwitcher />
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={signOut} title="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <h1 className="text-2xl font-semibold text-foreground">Your projects</h1>

        <ProjectSection table="quizzes" title="Quizzes" noun="quiz" icon={HelpCircle} basePath="/builder" />
        <ProjectSection table="advertorials" title="Advertorials" noun="advertorial" icon={Newspaper} basePath="/advertorial-builder" />

        <section aria-label="Other tools" className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Info', description: 'Classrooms and lessons', icon: BookOpen, path: '/info' },
            { label: 'Orders', description: 'Order tracking pages', icon: Package, path: '/orders' },
          ].map((tool) => (
            <button
              key={tool.path}
              type="button"
              onClick={() => navigate(tool.path)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <tool.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{tool.label}</span>
                <span className="block text-xs text-muted-foreground">{tool.description}</span>
              </span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Home;
