// Index route for a builder (/builder, /advertorial-builder).
//
// There is no project list page: signing in should land in the editor. This
// sends the user straight to their most recently edited project, creating one
// first if they have none. Switching, creating and deleting all live in the
// header dropdown from here on.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, ProjectTable } from '@/hooks/useProjects';

interface ProjectResolverProps {
  table: ProjectTable;
  /** Editor route prefix, e.g. "/builder". */
  basePath: string;
  /** Noun used in the failure message, e.g. "quiz". */
  noun: string;
}

export const ProjectResolver: React.FC<ProjectResolverProps> = ({ table, basePath, noun }) => {
  const navigate = useNavigate();
  const { projects, loading, createProject } = useProjects(table);
  // createProject is async and `projects` refreshes after it; without this the
  // effect could fire a second create before the first lands.
  const creatingRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loading || failed) return;

    // Ordered by updated_at desc, so [0] is the one they were last in.
    if (projects.length > 0) {
      navigate(`${basePath}/${projects[0].id}`, { replace: true });
      return;
    }

    if (creatingRef.current) return;
    creatingRef.current = true;

    createProject().then((id) => {
      if (id) {
        navigate(`${basePath}/${id}`, { replace: true });
      } else {
        creatingRef.current = false;
        setFailed(true);
      }
    });
  }, [loading, failed, projects, basePath, navigate, createProject]);

  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            Could not open a {noun}
          </p>
          <p className="text-xs text-muted-foreground">
            Something went wrong loading your projects. Try reloading the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
};
