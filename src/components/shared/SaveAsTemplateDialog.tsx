// Admin: snapshot the open quiz as a template, either as a new one or by
// overwriting an existing template's content.
//
// Overwriting is how a template gets edited: there is no separate template
// editor, so an admin imports a template, edits the resulting quiz, then saves
// back over the original.
import React, { useState } from 'react';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useContentTemplates, TemplateContent, TemplateType,
} from '@/hooks/useContentTemplates';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: TemplateType;
  /** Title of the project being saved, used as the default template name. */
  projectTitle: string;
  /** Noun used in the copy, e.g. "quiz". */
  noun: string;
  content: TemplateContent;
}

const NEW = '__new__';

export const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({
  open, onOpenChange, contentType, projectTitle, noun, content,
}) => {
  const {
    templates, busyId, createTemplate, updateTemplateContent,
  } = useContentTemplates(contentType);
  const [target, setTarget] = useState<string>(NEW);
  const [title, setTitle] = useState(projectTitle);
  const [description, setDescription] = useState('');

  const saving = busyId !== null;

  const handleSave = async () => {
    const ok = target === NEW
      ? await createTemplate(title, description, content)
      : await updateTemplateContent(target, content);
    if (ok) {
      onOpenChange(false);
      setTarget(NEW);
      setDescription('');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (o) setTitle(projectTitle); onOpenChange(o); }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Save as template
          </DialogTitle>
          <DialogDescription>
            Copies this {noun}&apos;s content and design into a template other
            users can start from.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateTarget">Save to</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="templateTarget">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW}>New template</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    Overwrite “{t.title}”
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target === NEW ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="templateTitle">Name</Label>
                <Input
                  id="templateTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Skincare finder"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateDescription">Description</Label>
                <Textarea
                  id="templateDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Who is this template for, and what does it do?"
                  rows={2}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                New templates start as drafts. Publish it from the gallery when it
                is ready for users.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Replaces that template&apos;s content with this {noun}. Its name,
              description and published state stay as they are, and projects
              already created from it are unaffected.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {target === NEW ? 'Create template' : 'Overwrite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
