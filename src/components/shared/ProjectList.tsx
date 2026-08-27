// Project picker shown at /builder and /advertorial-builder.
// Lists the current user's projects and lets them open, rename, delete or
// create one, subject to the per-user cap in useProjects.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProjects, ProjectTable, ProjectSummary } from '@/hooks/useProjects';

interface ProjectListProps {
  table: ProjectTable;
  /** Heading shown above the list, e.g. "Quiz Projects". */
  heading: string;
  /** Route prefix for the editor, e.g. "/builder". */
  basePath: string;
  /** Noun used in empty/limit copy, e.g. "quiz". */
  noun: string;
}

export const ProjectList: React.FC<ProjectListProps> = ({ table, heading, basePath, noun }) => {
  const navigate = useNavigate();
  const {
    projects, loading, busy, isAdmin, atLimit, limit,
    createProject, deleteProject, renameProject,
  } = useProjects(table);

  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const handleCreate = async () => {
    const id = await createProject();
    if (id) navigate(`${basePath}/${id}`);
  };

  const startRename = (p: ProjectSummary) => {
    setEditingId(p.id);
    setDraftTitle(p.title);
  };

  const commitRename = async (id: string) => {
    await renameProject(id, draftTitle);
    setEditingId(null);
  };

  const newButton = (
    <Button onClick={handleCreate} disabled={busy || atLimit}>
      <Plus className="w-4 h-4 mr-2" />
      New {noun}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? 'Unlimited projects (admin)'
                : `${projects.length} of ${limit} projects used`}
            </p>
          </div>

          {atLimit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span wrapper: disabled buttons swallow pointer events */}
                <span tabIndex={0}>{newButton}</span>
              </TooltipTrigger>
              <TooltipContent>
                Delete a {noun} to make room — the limit is {limit}.
              </TooltipContent>
            </Tooltip>
          ) : (
            newButton
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-border-subtle rounded-lg p-12 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No {noun} projects yet</p>
            <p className="text-xs text-muted-foreground mb-6">
              Create one to start building.
            </p>
            <Button onClick={handleCreate} disabled={busy}>
              <Plus className="w-4 h-4 mr-2" />
              New {noun}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="border border-border-subtle rounded-lg p-4 flex items-center gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(p.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <Button variant="ghost" size="icon" className="w-8 h-8"
                        onClick={() => commitRename(p.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8"
                        onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`${basePath}/${p.id}`)}
                        className="text-sm font-medium text-foreground hover:text-primary truncate block text-left"
                      >
                        {p.title}
                      </button>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Edited {new Date(p.updated_at).toLocaleDateString()}
                        {p.published_url && ' · Published'}
                      </p>
                    </>
                  )}
                </div>

                {editingId !== p.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    {p.published_url && (
                      <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
                        <a href={p.published_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="w-8 h-8"
                      onClick={() => startRename(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive"
                      onClick={() => setPendingDelete(p)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => navigate(`${basePath}/${p.id}`)}>
                      Open
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project and its content. If it is published,
              the live page will stop working. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteProject(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
