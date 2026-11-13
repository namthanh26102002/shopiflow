// Shopify theme editor: sections on the left, live preview in the middle,
// settings on the right — the same layout as Shopify's own theme editor.
import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ThemeEditorProvider, useThemeEditor } from '@/contexts/ThemeEditorContext';
import { ThemeHeader } from '@/components/theme/ThemeHeader';
import { SectionTree } from '@/components/theme/SectionTree';
import { ThemeSettingsPanel } from '@/components/theme/ThemeSettingsPanel';
import { ThemePreview } from '@/components/theme/ThemePreview';
import { PreviewDrawer } from '@/components/shared/PreviewDrawer';

const XL_QUERY = '(min-width: 1280px)';

/** Only one preview renders at a time: each one runs the whole theme. */
const useIsXl = () => {
  const [matches, setMatches] = useState(() => window.matchMedia(XL_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(XL_QUERY);
    const onChange = () => setMatches(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return matches;
};

const ThemeBuilderContent: React.FC = () => {
  const { loading, notFound } = useThemeEditor();
  const isXl = useIsXl();

  useEffect(() => {
    if (notFound) toast.error('That theme no longer exists.');
  }, [notFound]);

  if (notFound) return <Navigate to="/theme-builder" replace />;

  return (
    <div className="flex h-screen flex-col bg-background">
      <ThemeHeader />
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="w-60 shrink-0 border-r border-border bg-card lg:w-64" aria-label="Sections">
            <SectionTree />
          </aside>

          {/* Docked preview from xl up; below that it opens as a drawer. */}
          {isXl && (
            <main className="min-w-0 flex-1">
              <ThemePreview />
            </main>
          )}

          <aside className="min-w-0 flex-1 border-l border-border bg-card xl:w-80 xl:flex-none 2xl:w-96" aria-label="Settings">
            <ThemeSettingsPanel />
          </aside>

          {!isXl && (
            <PreviewDrawer>
              <ThemePreview />
            </PreviewDrawer>
          )}
        </div>
      )}
    </div>
  );
};

const ThemeBuilder: React.FC = () => {
  const { themeId } = useParams<{ themeId: string }>();
  if (!themeId) return <Navigate to="/theme-builder" replace />;
  return (
    <ThemeEditorProvider themeId={themeId}>
      <ThemeBuilderContent />
    </ThemeEditorProvider>
  );
};

export default ThemeBuilder;
