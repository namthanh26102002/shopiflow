// The only project management surface: switch between projects, create one, or
// delete the one you are in. There is no separate list page — signing in lands
// straight in the editor.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useProjects, ProjectTable } from '@/hooks/useProjects';

interface ProjectSwitcherProps {
  table: ProjectTable;
  /** Editor route prefix, e.g. "/builder". */
  basePath: string;
  /** Noun used in the menu copy, e.g. "quiz". */
  noun: string;
  /** Project currently open, so it can be ticked and targeted for deletion. */
  currentId?: string;
  /** Live title from the editor, which leads the stored one after a rename. */
  currentTitle?: string;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  table, basePath, noun, currentId, currentTitle,
}) => {
  const navigate = useNavigate();
  const {
    projects, isAdmin, atLimit, limit, busy, createProject, deleteProject, refresh,
  } = useProjects(table);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCreate = async () => {
    const id = await createProject();
    if (id) navigate(`${basePath}/${id}`);
  };

  const handleDelete = async () => {
    if (!currentId) return;
    setConfirmDelete(false);
    await deleteProject(currentId);
    // Back to the index route, which opens the next project or makes a new one.
    navigate(basePath, { replace: true });
  };

  const displayTitle = currentTitle || 'this project';

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open) refresh(); }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 text-muted-foreground hover:text-foreground shrink-0"
            title={`Switch ${noun}`}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {isAdmin ? 'Your projects' : `${projects.length} of ${limit} projects used`}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => navigate(`${basePath}/${p.id}`)}
              className="gap-2"
            >
              <Check
                className={`w-3.5 h-3.5 shrink-0 ${p.id === currentId ? 'opacity-100' : 'opacity-0'}`}
              />
              <span className="truncate">
                {p.id === currentId && currentTitle ? currentTitle : p.title}
              </span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleCreate} disabled={busy || atLimit} className="gap-2">
            <Plus className="w-3.5 h-3.5 shrink-0" />
            New {noun}
          </DropdownMenuItem>

          {atLimit && (
            <p className="px-2 pb-1 text-xs text-muted-foreground">
              Limit reached — delete one to make room.
            </p>
          )}

          <DropdownMenuItem
            onClick={() => setConfirmDelete(true)}
            disabled={busy || !currentId}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Delete this {noun}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{displayTitle}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the {noun} and its content, and cannot be undone.
              {projects.length <= 1
                ? ' It is your only project, so a new empty one will be created.'
                : ' You will be taken to your most recent remaining project.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
