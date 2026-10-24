// Template gallery. Users browse published templates and import one as a new
// project; admins additionally see drafts and manage them inline, so there is
// one surface rather than separate browse and manage screens.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate, Loader2, Copy, Trash2, Eye, EyeOff, Pencil, Check, X, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useContentTemplates, ContentTemplate, TemplateType, describeTemplate,
} from '@/hooks/useContentTemplates';
import { useT, type MessageKey } from '@/i18n';

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: TemplateType;
  /** Editor route prefix for the imported project, e.g. "/builder". */
  basePath: string;
  /** Noun used in the copy, e.g. "quiz". */
  noun: string;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  open, onOpenChange, contentType, basePath, noun,
}) => {
    const t = useT();
  const nounText = t(noun as MessageKey);
  const navigate = useNavigate();
  const {
    templates, loading, busyId, isAdmin,
    importTemplate, updateTemplateMeta, duplicateTemplate, deleteTemplate, refresh,
  } = useContentTemplates(contentType);

  // The gallery mounts with the builder header, so its first fetch happens long
  // before a template is saved. Refetch on open or it shows a stale list.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const [pendingDelete, setPendingDelete] = useState<ContentTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const handleUse = async (tpl: ContentTemplate) => {
    const id = await importTemplate(tpl);
    if (id) {
      onOpenChange(false);
      navigate(`${basePath}/${id}`);
    }
  };

  const startEdit = (tpl: ContentTemplate) => {
    setEditingId(tpl.id);
    setDraftTitle(tpl.title);
    setDraftDescription(tpl.description);
  };

  const commitEdit = async (id: string) => {
    await updateTemplateMeta(id, {
      title: draftTitle.trim() || t('Untitled Template'),
      description: draftDescription.trim(),
    });
    setEditingId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" />
              {noun === 'quiz' ? t('Quiz templates') : t('Advertorial templates')}
            </DialogTitle>
            <DialogDescription>
              {t('Start from a ready-made {noun}. Importing creates your own copy — editing it never changes the template.', { noun: nounText })}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('Loading templates…')}</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="border border-border-subtle rounded-lg p-10 text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                {t('No templates available yet')}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? t('Open a {noun} and choose "Save as template" to create the first one.', { noun: nounText })
                  : t('Check back later — templates are published by the Shopiflow team.')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="border border-border-subtle rounded-lg p-4">
                  {editingId === tpl.id ? (
                    <div className="space-y-2">
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        placeholder={t('Template name')}
                        autoFocus
                      />
                      <Textarea
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        placeholder={t('What is this template for?')}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => commitEdit(tpl.id)}>
                          <Check className="w-3.5 h-3.5 mr-1.5" />{t('Save')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5 mr-1.5" />{t('Cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{tpl.title}</span>
                          {!tpl.is_published && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                              {t('Draft')}
                            </span>
                          )}
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {describeTemplate(tpl)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleUse(tpl)}
                        disabled={busyId === tpl.id}
                        className="shrink-0"
                      >
                        {busyId === tpl.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <>{t('Use this')}<ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
                      </Button>
                    </div>
                  )}

                  {isAdmin && editingId !== tpl.id && (
                    <div className="flex items-center gap-1 mt-3 pt-3 border-tpl border-border-subtle">
                      <span className="text-xs text-muted-foreground mr-auto">{t('Admin')}</span>
                      <Button
                        variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => updateTemplateMeta(tpl.id, { is_published: !tpl.is_published })}
                        disabled={busyId === tpl.id}
                      >
                        {tpl.is_published
                          ? <><EyeOff className="w-3.5 h-3.5 mr-1.5" />{t('Unpublish')}</>
                          : <><Eye className="w-3.5 h-3.5 mr-1.5" />{t('Publish')}</>}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="w-7 h-7"
                        title={t('Rename or edit description')}
                        onClick={() => startEdit(tpl)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="w-7 h-7"
                        title={t('Duplicate as draft')}
                        onClick={() => duplicateTemplate(tpl)}
                        disabled={busyId === tpl.id}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="w-7 h-7 text-destructive"
                        title={t('Delete template')}
                        onClick={() => setPendingDelete(tpl)}
                        disabled={busyId === tpl.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && (
            <p className="text-xs text-muted-foreground">
              {t("To change a template's content: use it to create a {noun}, edit that {noun}, then choose", { noun: nounText })}{' '}
              <strong>{t('Save as template')}</strong>{' '}{t('and overwrite this one.')}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete “{title}”?', { title: pendingDelete?.title ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This removes the template for everyone. Quizzes already created from it are unaffected — they are independent copies. This cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteTemplate(pendingDelete);
                setPendingDelete(null);
              }}
            >
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
