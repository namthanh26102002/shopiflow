// Lists, creates and deletes builder projects (quizzes / advertorials).
//
// Non-admins are capped at PROJECT_LIMIT per builder. The cap is enforced by
// a database trigger (see the project_limits migration); the checks here only
// keep the UI honest, they are not the security boundary.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { createDefaultQuiz } from '@/types/quiz';
import { createDefaultAdvertorial } from '@/types/advertorial';
import { toast } from 'sonner';

export const PROJECT_LIMIT = 2;

export type ProjectTable = 'quizzes' | 'advertorials';

export interface ProjectSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  published_url: string | null;
}

const LIMIT_MARKER = 'PROJECT_LIMIT_REACHED';

const newProjectRow = (table: ProjectTable, userId: string) => {
  if (table === 'quizzes') {
    const q = createDefaultQuiz();
    return {
      user_id: userId,
      title: q.settings.title,
      settings: q.settings,
      questions: q.questions,
      products: q.products,
      results: q.results,
      analytics: q.analytics,
    };
  }

  const a = createDefaultAdvertorial();
  return {
    user_id: userId,
    title: a.settings.title ?? 'Untitled Advertorial',
    settings: a.settings,
    blocks: a.blocks,
  };
};

export const useProjects = (table: ProjectTable) => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select('id, title, created_at, updated_at, published_url')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects((data ?? []) as ProjectSummary[]);
    } catch (err) {
      console.error(`Error loading ${table}:`, err);
      toast.error('Failed to load your projects');
    } finally {
      setLoading(false);
    }
  }, [user, table]);

  useEffect(() => {
    load();
  }, [load]);

  // Admins are unlimited; everyone else stops at PROJECT_LIMIT.
  const atLimit = !isAdmin && projects.length >= PROJECT_LIMIT;

  const createProject = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    setBusy(true);
    try {
      const { data, error } = await supabase
        .from(table)
        .insert([newProjectRow(table, user.id)])
        .select('id')
        .single();

      if (error) {
        // Surfaced when the database trigger rejects the insert, which also
        // covers the case where another tab used up the last slot.
        if (error.message?.includes(LIMIT_MARKER)) {
          toast.error(
            `You can keep up to ${PROJECT_LIMIT} projects here. Delete one to make room.`
          );
          await load();
          return null;
        }
        throw error;
      }

      await load();
      return data?.id ?? null;
    } catch (err) {
      console.error(`Error creating ${table} project:`, err);
      toast.error('Failed to create the project');
      return null;
    } finally {
      setBusy(false);
    }
  }, [user, table, load]);

  const deleteProject = useCallback(async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('Project deleted');
      await load();
    } catch (err) {
      console.error(`Error deleting ${table} project:`, err);
      toast.error('Failed to delete the project');
    } finally {
      setBusy(false);
    }
  }, [table, load]);

  const renameProject = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      const { error } = await supabase.from(table).update({ title: trimmed }).eq('id', id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error(`Error renaming ${table} project:`, err);
      toast.error('Failed to rename the project');
    }
  }, [table, load]);

  return {
    projects,
    loading: loading || adminLoading,
    busy,
    isAdmin,
    atLimit,
    limit: PROJECT_LIMIT,
    createProject,
    deleteProject,
    renameProject,
    refresh: load,
  };
};
