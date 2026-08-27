// Project dropdown for the builder headers: switch between projects, create a
// new one, or jump back to the full list — without leaving the editor.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, LayoutGrid, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjects, ProjectTable } from '@/hooks/useProjects';

interface ProjectSwitcherProps {
  table: ProjectTable;
  /** Editor route prefix, e.g. "/builder". */
  basePath: string;
  /** Noun used in the menu copy, e.g. "quiz". */
  noun: string;
  /** Project currently open, so it can be ticked. */
  currentId?: string;
  /** Live title from the editor. Preferred over the stored one for the open
   *  project, which lags by the autosave debounce after a rename. */
  currentTitle?: string;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  table, basePath, noun, currentId, currentTitle,
}) => {
  const navigate = useNavigate();
  const { projects, isAdmin, atLimit, limit, busy, createProject, refresh } = useProjects(table);

  const handleCreate = async () => {
    const id = await createProject();
    if (id) navigate(`${basePath}/${id}`);
  };

  return (
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

        <DropdownMenuItem onClick={() => navigate(basePath)} className="gap-2">
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          All projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
