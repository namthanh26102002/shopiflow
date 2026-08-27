import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Pencil, Eye, EyeOff, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdvertorialBlock, AdvertorialSettings, createDefaultAdvertorialSettings } from '@/types/advertorial';
import { sanitizeHtml } from '@/lib/sanitize';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInfoTheme, InfoThemeColors } from '@/hooks/useInfoTheme';
import { InfoThemeToggle } from '@/components/shared/InfoThemeToggle';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LessonDocumentEditor } from '@/components/info/LessonDocumentEditor';

// Legacy block renderers for backward compatibility (non-admin viewing old content)

function renderLegacyBlock(block: AdvertorialBlock, settings: AdvertorialSettings, themeColors: InfoThemeColors) {
  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div className="text-2xl sm:text-3xl font-bold leading-tight" style={{ fontFamily: settings.headlineFont, color: themeColors.text }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.headline) }} />
          {block.mediaType === 'video' && block.videoSrc && <div className="rounded-lg overflow-hidden"><video src={block.videoSrc} autoPlay loop muted playsInline className="w-full object-cover" /></div>}
          {block.mediaType === 'image' && block.imageSrc && <div className="rounded-lg overflow-hidden"><img src={block.imageSrc} alt={block.imageAlt} className="w-full object-cover" /></div>}
          {block.subheadline && <div className="text-base" style={{ color: themeColors.textMuted }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.subheadline) }} />}
        </div>
      );
    case 'text': {
      const fontSize = block.fontSize || 16;
      const fontFamily = block.fontFamily || settings.bodyFont;
      return <div className="prose prose-sm max-w-none" style={{ fontFamily, fontSize: `${fontSize}px`, color: themeColors.text }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />;
    }
    case 'image':
      return (
        <figure className="space-y-2">
          {block.src && <img src={block.src} alt={block.alt} className="w-full rounded-lg" />}
          {block.caption && <figcaption className="text-xs text-center" style={{ color: themeColors.textMuted }}>{block.caption}</figcaption>}
        </figure>
      );
    case 'video':
      return (
        <figure className="space-y-2">
          {block.src ? <video src={block.src} autoPlay loop muted playsInline className="w-full rounded-lg" /> : null}
          {block.caption && <figcaption className="text-xs text-center" style={{ color: themeColors.textMuted }}>{block.caption}</figcaption>}
        </figure>
      );
    case 'divider':
      if (block.style === 'space') return <div style={{ height: block.height }} />;
      if (block.style === 'dots') return <div className="flex justify-center gap-1.5 py-4" style={{ height: block.height }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColors.textMuted }} /><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColors.textMuted }} /><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColors.textMuted }} /></div>;
      return <hr style={{ borderTop: `1px solid ${themeColors.border}`, marginTop: block.height / 2, marginBottom: block.height / 2 }} />;
    case 'youtube':
      return (
        <figure className="space-y-2">
          {block.videoId && /^[a-zA-Z0-9_-]{11}$/.test(block.videoId) ? (
            <iframe src={`https://www.youtube.com/embed/${block.videoId}`} className="w-full aspect-video rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : null}
          {block.caption && <figcaption className="text-xs text-center" style={{ color: themeColors.textMuted }}>{block.caption}</figcaption>}
        </figure>
      );
    default: return null;
  }
}

// Convert legacy blocks to HTML for migration
function blocksToHtml(blocks: AdvertorialBlock[], settings: AdvertorialSettings): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'hero':
        let html = `<h1>${block.headline}</h1>`;
        if (block.mediaType === 'image' && block.imageSrc) html += `<img src="${block.imageSrc}" alt="${block.imageAlt || ''}" />`;
        if (block.subheadline) html += `<p>${block.subheadline}</p>`;
        return html;
      case 'text': return block.content;
      case 'image': return block.src ? `<img src="${block.src}" alt="${block.alt || ''}" />` : '';
      case 'divider': return '<hr />';
      case 'youtube': return block.videoId ? `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:16px 0"><iframe src="https://www.youtube.com/embed/${block.videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>` : '';
      default: return '';
    }
  }).filter(Boolean).join('\n');
}

// Sidebar
interface SidebarLesson { id: string; name: string; order: number; }

const LessonSidebar: React.FC<{
  classroomName: string;
  lessons: SidebarLesson[];
  currentLessonId: string;
  onSelectLesson: (id: string) => void;
  onBack: () => void;
  themeColors: InfoThemeColors;
}> = ({ classroomName, lessons, currentLessonId, onSelectLesson, onBack, themeColors }) => (
  <div className="h-full flex flex-col" style={{ backgroundColor: themeColors.card, borderRight: `1px solid ${themeColors.border}` }}>
    <div className="p-4" style={{ borderBottom: `1px solid ${themeColors.border}` }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-3" style={{ color: themeColors.textMuted }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h2 className="text-sm font-bold" style={{ color: themeColors.text }}>{classroomName}</h2>
    </div>
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => onSelectLesson(lesson.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors"
            style={{
              color: lesson.id === currentLessonId ? themeColors.accent : themeColors.text,
              backgroundColor: lesson.id === currentLessonId ? themeColors.accentMuted : 'transparent',
              fontWeight: lesson.id === currentLessonId ? 500 : 400,
            }}
          >
            <span className="truncate">{lesson.name}</span>
          </button>
        ))}
      </div>
    </ScrollArea>
  </div>
);

const InfoLessonView: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme, setTheme, colors } = useInfoTheme();
  const [lesson, setLesson] = useState<{
    settings: AdvertorialSettings;
    blocks: AdvertorialBlock[];
    name: string;
    classroom_id: string;
    published: boolean;
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarLessons, setSidebarLessons] = useState<SidebarLesson[]>([]);
  const [classroomName, setClassroomName] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!lessonId) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();
        if (error) throw error;
        const blocks = (data.blocks as unknown as AdvertorialBlock[]).sort((a, b) => a.order - b.order);
        const settings = { ...createDefaultAdvertorialSettings(), ...(data.settings as any) };
        const content = (data as any).content || '';
        setLesson({ settings, blocks, name: data.name, classroom_id: data.classroom_id, published: data.published, content });

        const siblingsQuery = supabase
          .from('lessons')
          .select('id, name, order')
          .eq('classroom_id', data.classroom_id)
          .order('order', { ascending: true });
        const { data: siblings } = isAdmin
          ? await siblingsQuery
          : await siblingsQuery.eq('published', true);
        setSidebarLessons(siblings || []);

        const { data: classroom } = await supabase
          .from('classrooms')
          .select('name')
          .eq('id', data.classroom_id)
          .single();
        setClassroomName(classroom?.name || '');

        // Auto-migrate blocks to content for admin
        if (isAdmin && !content && blocks.length > 0) {
          const migratedHtml = blocksToHtml(blocks, settings);
          await supabase.from('lessons').update({ content: migratedHtml } as any).eq('id', lessonId);
          setLesson(prev => prev ? { ...prev, content: migratedHtml } : prev);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lessonId, isAdmin]);

  const handleSaveTitle = async () => {
    if (!titleDraft.trim() || !lessonId) return;
    const { error } = await supabase.from('lessons').update({ name: titleDraft.trim() }).eq('id', lessonId);
    if (error) { toast.error('Failed to rename'); return; }
    setLesson(prev => prev ? { ...prev, name: titleDraft.trim() } : prev);
    setEditingTitle(false);
    toast.success('Renamed');
  };

  const handleTogglePublish = async () => {
    if (!lesson || !lessonId) return;
    const newVal = !lesson.published;
    const { error } = await supabase.from('lessons').update({ published: newVal }).eq('id', lessonId);
    if (error) { toast.error('Failed'); return; }
    setLesson(prev => prev ? { ...prev, published: newVal } : prev);
    toast.success(newVal ? 'Published' : 'Unpublished');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}><div className="animate-pulse" style={{ color: colors.textMuted }}>Loading...</div></div>;
  if (!lesson) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}><p style={{ color: colors.textMuted }}>Lesson not found</p></div>;

  const hasContent = !!lesson.content?.trim();
  const hasLegacyBlocks = lesson.blocks.length > 0;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.headerBg }}>
        <div className="flex items-center gap-2">
          <BuilderSwitcher />
          <InfoThemeToggle theme={theme} onToggle={setTheme} colors={colors} />
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-xs" style={{ color: colors.textMuted }}>{user.email}</span>
              <Button variant="ghost" size="icon" className="w-8 h-8" style={{ color: colors.textMuted }} onClick={signOut} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" style={{ borderColor: colors.border, color: colors.text }} onClick={() => navigate('/auth')}>Sign In</Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0">
          <LessonSidebar
            classroomName={classroomName}
            lessons={sidebarLessons}
            currentLessonId={lessonId!}
            onSelectLesson={(id) => navigate(`/info/lesson/${id}/view`)}
            onBack={() => navigate(`/info/classroom/${lesson.classroom_id}`)}
            themeColors={colors}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Admin title bar */}
          {isAdmin && (
            <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="flex-1">
                {editingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                      className="text-lg font-bold h-auto py-1"
                      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                      autoFocus
                    />
                    <button onClick={handleSaveTitle} style={{ color: colors.accent }}><Check className="w-5 h-5" /></button>
                    <button onClick={() => setEditingTitle(false)} style={{ color: colors.textMuted }}><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-2">
                    <h1 className="text-lg font-bold" style={{ color: colors.text }}>{lesson.name}</h1>
                    <button
                      onClick={() => { setEditingTitle(true); setTitleDraft(lesson.name); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: colors.textMuted }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleTogglePublish}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md shrink-0"
                style={{ backgroundColor: colors.accentMuted, color: colors.accent }}
              >
                {lesson.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {lesson.published ? 'Published' : 'Draft'}
              </button>
            </div>
          )}

          {/* Content area */}
          {isAdmin ? (
            <LessonDocumentEditor
              lessonId={lessonId!}
              initialContent={lesson.content}
              themeColors={colors}
            />
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="max-w-[680px] mx-auto">
                {!isAdmin && (
                  <div className="px-6 py-6">
                    <h1 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>{lesson.name}</h1>
                  </div>
                )}
                {hasContent ? (
                  <div className="px-6 py-3">
                    <style>{`
                      .lesson-content .media-row { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0; }
                      .lesson-content .media-cell { flex: 1 1 0; min-width: 0; }
                      .lesson-content .media-cell img,
                      .lesson-content .media-cell video { width: 100%; height: auto; margin: 0; display: block; border-radius: 8px; }
                      @media (max-width: 640px) {
                        .lesson-content .media-row { flex-wrap: wrap; }
                        .lesson-content .media-cell { flex: 1 1 100% !important; }
                      }
                    `}</style>
                    <div
                      className="prose prose-sm max-w-none lesson-content"
                      style={{ color: colors.text }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }}
                    />
                  </div>
                ) : hasLegacyBlocks ? (
                  lesson.blocks.map(block => (
                    <div key={block.id} className="px-6 py-3">
                      {renderLegacyBlock(block, lesson.settings, colors)}
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center" style={{ color: colors.textMuted }}>
                    No content yet
                  </div>
                )}
                <div className="h-16" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoLessonView;
