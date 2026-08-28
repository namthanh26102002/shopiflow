// Template gallery. Users browse published templates and import one as a new
// project; admins additionally see drafts and manage them inline, so there is
// one surface rather than separate browse and manage screens.
import React, { useState } from 'react';
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
  useQuizTemplates, QuizTemplate, templateQuestionCount,
} from '@/hooks/useQuizTemplates';

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const {
    templates, loading, busyId, isAdmin,
    importTemplate, updateTemplateMeta, duplicateTemplate, deleteTemplate,
  } = useQuizTemplates();

  const [pendingDelete, setPendingDelete] = useState<QuizTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const handleUse = async (t: QuizTemplate) => {
    const id = await importTemplate(t);
    if (id) {
      onOpenChange(false);
      navigate(`/builder/${id}`);
    }
  };

  const startEdit = (t: QuizTemplate) => {
    setEditingId(t.id);
    setDraftTitle(t.title);
    setDraftDescription(t.description);
  };

  const commitEdit = async (id: string) => {
    await updateTemplateMeta(id, {
      title: draftTitle.trim() || 'Untitled Template',
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
              Quiz templates
            </DialogTitle>
            <DialogDescription>
              Start from a ready-made quiz. Importing creates your own copy —
              editing it never changes the template.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : templates.length === 0 ? (
            <div className="border border-border-subtle rounded-lg p-10 text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                No templates available yet
              </p>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? 'Open a quiz and choose "Save as template" to create the first one.'
                  : 'Check back later — templates are published by the Shopiflow team.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="border border-border-subtle rounded-lg p-4">
                  {editingId === t.id ? (
                    <div className="space-y-2">
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        placeholder="Template name"
                        autoFocus
                      />
                      <Textarea
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        placeholder="What is this template for?"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => commitEdit(t.id)}>
                          <Check className="w-3.5 h-3.5 mr-1.5" />Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5 mr-1.5" />Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{t.title}</span>
                          {!t.is_published && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                              Draft
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {templateQuestionCount(t)} question
                          {templateQuestionCount(t) === 1 ? '' : 's'}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleUse(t)}
                        disabled={busyId === t.id}
                        className="shrink-0"
                      >
                        {busyId === t.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <>Use this<ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
                      </Button>
                    </div>
                  )}

                  {isAdmin && editingId !== t.id && (
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border-subtle">
                      <span className="text-xs text-muted-foreground mr-auto">Admin</span>
                      <Button
                        variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => updateTemplateMeta(t.id, { is_published: !t.is_published })}
                        disabled={busyId === t.id}
                      >
                        {t.is_published
                          ? <><EyeOff className="w-3.5 h-3.5 mr-1.5" />Unpublish</>
                          : <><Eye className="w-3.5 h-3.5 mr-1.5" />Publish</>}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="w-7 h-7"
                        title="Rename or edit description"
                        onClick={() => startEdit(t)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="w-7 h-7"
                        title="Duplicate as draft"
                        onClick={() => duplicateTemplate(t)}
                        disabled={busyId === t.id}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="w-7 h-7 text-destructive"
                        title="Delete template"
                        onClick={() => setPendingDelete(t)}
                        disabled={busyId === t.id}
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
              To change a template&apos;s questions or design: use it to create a
              quiz, edit that quiz, then choose <strong>Save as template</strong> and
              overwrite this one.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the template for everyone. Quizzes already created from
              it are unaffected — they are independent copies. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteTemplate(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
