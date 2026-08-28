// Admin-authored templates for both builders.
//
// Templates live outside the project tables, so they never appear in a user's
// project switcher and never count toward the project limit. Importing copies
// the content into a new project row with no link back, so the result is
// independent by construction.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

export type TemplateType = 'quiz' | 'advertorial';

/**
 * The per-builder payload. Shape is owned by the builder that reads it:
 * quizzes carry questions/products/results, advertorials carry blocks.
 */
export type TemplateContent = Record<string, unknown>;

export interface ContentTemplate {
  id: string;
  content_type: TemplateType;
  title: string;
  description: string;
  content: TemplateContent;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const LIMIT_MARKER = 'PROJECT_LIMIT_REACHED';

const PROJECT_TABLE: Record<TemplateType, 'quizzes' | 'advertorials'> = {
  quiz: 'quizzes',
  advertorial: 'advertorials',
};

/** A one-line summary for the gallery card, per builder. */
export const describeTemplate = (t: ContentTemplate): string => {
  if (t.content_type === 'quiz') {
    const n = Array.isArray(t.content?.questions) ? t.content.questions.length : 0;
    return `${n} question${n === 1 ? '' : 's'}`;
  }
  const n = Array.isArray(t.content?.blocks) ? t.content.blocks.length : 0;
  return `${n} block${n === 1 ? '' : 's'}`;
};

export const useContentTemplates = (contentType: TemplateType) => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setTemplates([]); setLoading(false); return; }
    // Every load reports progress, not just the first: callers refetch when a
    // dialog opens, and showing the previous (possibly empty) list as if it
    // were current is how a freshly saved template appeared to be missing.
    setLoading(true);
    try {
      // RLS decides visibility: published for users, drafts too for admins.
      const { data, error } = await supabase
        .from('content_templates')
        .select('*')
        .eq('content_type', contentType)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTemplates((data ?? []) as unknown as ContentTemplate[]);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [user, contentType]);

  useEffect(() => { load(); }, [load]);

  /** Copy a template into a new project owned by the caller. */
  const importTemplate = useCallback(async (t: ContentTemplate): Promise<string | null> => {
    if (!user) return null;
    setBusyId(t.id);
    try {
      const c = t.content ?? {};
      const row = contentType === 'quiz'
        ? {
            user_id: user.id,
            title: t.title,
            settings: c.settings ?? {},
            questions: c.questions ?? [],
            products: c.products ?? [],
            results: c.results ?? {},
          }
        : {
            user_id: user.id,
            title: t.title,
            settings: c.settings ?? {},
            blocks: c.blocks ?? [],
          };

      const { data, error } = await supabase
        .from(PROJECT_TABLE[contentType])
        .insert(row as never)
        .select('id')
        .single();

      if (error) {
        if (error.message?.includes(LIMIT_MARKER)) {
          toast.error('You have reached your project limit. Delete one to make room.');
          return null;
        }
        throw error;
      }

      toast.success(`Created a new project from "${t.title}"`);
      return (data as { id: string }).id;
    } catch (err) {
      console.error('Error importing template:', err);
      toast.error('Failed to import the template');
      return null;
    } finally {
      setBusyId(null);
    }
  }, [user, contentType]);

  /** Admin: snapshot the open project as a new template. */
  const createTemplate = useCallback(async (
    title: string, description: string, content: TemplateContent,
  ): Promise<boolean> => {
    if (!user) return false;
    setBusyId('new');
    try {
      const { error } = await supabase.from('content_templates').insert({
        created_by: user.id,
        content_type: contentType,
        title: title.trim() || 'Untitled Template',
        description: description.trim(),
        content: content as never,
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
  }, [user, contentType, load]);

  /** Admin: replace a template's content from the open project. */
  const updateTemplateContent = useCallback(async (
    id: string, content: TemplateContent,
  ): Promise<boolean> => {
    setBusyId(id);
    try {
      const { error } = await supabase
        .from('content_templates')
        .update({ content: content as never })
        .eq('id', id);
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
    patch: Partial<Pick<ContentTemplate, 'title' | 'description' | 'is_published'>>,
  ) => {
    setBusyId(id);
    try {
      const { error } = await supabase.from('content_templates').update(patch).eq('id', id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error('Error updating template:', err);
      toast.error('Failed to update the template');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  /** Admin: copy a template as an unpublished draft to work from. */
  const duplicateTemplate = useCallback(async (t: ContentTemplate) => {
    if (!user) return;
    setBusyId(t.id);
    try {
      const { error } = await supabase.from('content_templates').insert({
        created_by: user.id,
        content_type: t.content_type,
        title: `${t.title} (copy)`,
        description: t.description,
        content: t.content as never,
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

  const deleteTemplate = useCallback(async (t: ContentTemplate) => {
    setBusyId(t.id);
    try {
      const { error } = await supabase.from('content_templates').delete().eq('id', t.id);
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
