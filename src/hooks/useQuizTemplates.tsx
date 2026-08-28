// Admin-authored quiz templates, and importing one into a user's own project.
//
// Templates live outside public.quizzes, so they never appear in a user's
// project switcher and never count toward the project limit. Importing copies
// the content into a new quiz row: the result is an ordinary project with no
// link back, so editing it cannot affect the template.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

export interface QuizTemplate {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  settings: unknown;
  questions: unknown;
  products: unknown;
  results: unknown;
}

/** Fields copied verbatim from a template into a new project. */
export interface TemplateContent {
  settings: unknown;
  questions: unknown;
  products: unknown;
  results: unknown;
}

const LIMIT_MARKER = 'PROJECT_LIMIT_REACHED';

/** Number of questions in a template, for the gallery card. */
export const templateQuestionCount = (t: QuizTemplate): number =>
  Array.isArray(t.questions) ? t.questions.length : 0;

export const useQuizTemplates = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setTemplates([]); setLoading(false); return; }
    try {
      // RLS decides visibility: users get published only, admins get drafts too.
      const { data, error } = await supabase
        .from('quiz_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTemplates((data ?? []) as unknown as QuizTemplate[]);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /**
   * Copy a template into a new quiz project owned by the caller.
   * Returns the new project id, or null if it could not be created.
   */
  const importTemplate = useCallback(async (t: QuizTemplate): Promise<string | null> => {
    if (!user) return null;
    setBusyId(t.id);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          user_id: user.id,
          title: t.title,
          settings: t.settings as never,
          questions: t.questions as never,
          products: t.products as never,
          results: t.results as never,
        })
        .select('id')
        .single();

      if (error) {
        if (error.message?.includes(LIMIT_MARKER)) {
          toast.error('You have reached your project limit. Delete a quiz to make room.');
          return null;
        }
        throw error;
      }

      toast.success(`Created a new quiz from "${t.title}"`);
      return data.id;
    } catch (err) {
      console.error('Error importing template:', err);
      toast.error('Failed to import the template');
      return null;
    } finally {
      setBusyId(null);
    }
  }, [user]);

  /** Admin: snapshot a quiz project as a new template. */
  const createTemplate = useCallback(async (
    title: string,
    description: string,
    content: TemplateContent,
  ): Promise<boolean> => {
    if (!user) return false;
    setBusyId('new');
    try {
      const { error } = await supabase.from('quiz_templates').insert({
        created_by: user.id,
        title: title.trim() || 'Untitled Template',
        description: description.trim(),
        settings: content.settings as never,
        questions: content.questions as never,
        products: content.products as never,
        results: content.results as never,
      });
      if (error) throw error;
      toast.success('Template saved');
      await load();
      return true;
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to save the template');
      return false;
    } finally {
      setBusyId(null);
    }
  }, [user, load]);

  /** Admin: replace an existing template's content from a quiz project. */
  const updateTemplateContent = useCallback(async (
    id: string,
    content: TemplateContent,
  ): Promise<boolean> => {
    setBusyId(id);
    try {
      const { error } = await supabase.from('quiz_templates').update({
        settings: content.settings as never,
        questions: content.questions as never,
        products: content.products as never,
        results: content.results as never,
      }).eq('id', id);
      if (error) throw error;
      toast.success('Template updated');
      await load();
      return true;
    } catch (err) {
      console.error('Error updating template:', err);
      toast.error('Failed to update the template');
      return false;
    } finally {
      setBusyId(null);
    }
  }, [load]);

  /** Admin: rename, re-describe, or publish/unpublish. */
  const updateTemplateMeta = useCallback(async (
    id: string,
    patch: Partial<Pick<QuizTemplate, 'title' | 'description' | 'is_published'>>,
  ) => {
    setBusyId(id);
    try {
      const { error } = await supabase.from('quiz_templates').update(patch).eq('id', id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error('Error updating template:', err);
      toast.error('Failed to update the template');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  /** Admin: copy a template, as an unpublished draft to edit from. */
  const duplicateTemplate = useCallback(async (t: QuizTemplate) => {
    if (!user) return;
    setBusyId(t.id);
    try {
      const { error } = await supabase.from('quiz_templates').insert({
        created_by: user.id,
        title: `${t.title} (copy)`,
        description: t.description,
        settings: t.settings as never,
        questions: t.questions as never,
        products: t.products as never,
        results: t.results as never,
        is_published: false,
      });
      if (error) throw error;
      toast.success('Template duplicated as a draft');
      await load();
    } catch (err) {
      console.error('Error duplicating template:', err);
      toast.error('Failed to duplicate the template');
    } finally {
      setBusyId(null);
    }
  }, [user, load]);

  const deleteTemplate = useCallback(async (t: QuizTemplate) => {
    setBusyId(t.id);
    try {
      const { error } = await supabase.from('quiz_templates').delete().eq('id', t.id);
      if (error) throw error;
      toast.success('Template deleted');
      await load();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Failed to delete the template');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return {
    templates,
    loading: loading || adminLoading,
    busyId,
    isAdmin,
    importTemplate,
    createTemplate,
    updateTemplateContent,
    updateTemplateMeta,
    duplicateTemplate,
    deleteTemplate,
    refresh: load,
  };
};
