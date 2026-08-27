import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, FileText, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useClassrooms } from '@/hooks/useClassrooms';
import { useLessons } from '@/hooks/useLessons';
import { useInfoTheme } from '@/hooks/useInfoTheme';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { InfoThemeToggle } from '@/components/shared/InfoThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const InfoClassroom: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { classrooms } = useClassrooms(isAdmin ? false : true);
  const { lessons, isLoading, createLesson, updateLesson, deleteLesson } = useLessons(classroomId, isAdmin ? false : true);
  const { theme, setTheme, colors } = useInfoTheme();

  const [creatingLesson, setCreatingLesson] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const classroom = classrooms.find(c => c.id === classroomId);

  const handleCreateLesson = () => {
    if (!newLessonName.trim()) return;
    createLesson.mutate(newLessonName.trim());
    setNewLessonName('');
    setCreatingLesson(false);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    updateLesson.mutate({ id, name: editName.trim() });
    setEditingId(null);
  };

  const handleTogglePublish = (id: string, current: boolean) => {
    updateLesson.mutate({ id, published: !current });
    toast.success(!current ? 'Published' : 'Unpublished');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      deleteLesson.mutate(id);
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      <header className="h-14 flex items-center justify-between px-4" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.headerBg }}>
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
        <div className="w-72 flex-shrink-0 flex flex-col" style={{ borderRight: `1px solid ${colors.border}`, backgroundColor: colors.card }}>
          <div className="p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <button onClick={() => navigate('/info')} className="flex items-center gap-1.5 text-sm mb-3 transition-colors" style={{ color: colors.textMuted }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {classroom && <h2 className="text-sm font-bold" style={{ color: colors.text }}>{classroom.name}</h2>}
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" style={{ backgroundColor: colors.cardHover }} />)}
              </div>
            ) : lessons.length === 0 && !isAdmin ? (
              <div className="p-4 text-center text-sm" style={{ color: colors.textMuted }}>
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No lessons yet.</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="group relative flex items-center rounded-lg transition-colors"
                    style={{ opacity: !lesson.published && isAdmin ? 0.6 : 1 }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.cardHover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {editingId === lesson.id ? (
                      <div className="flex items-center gap-1 w-full px-2 py-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(lesson.id); if (e.key === 'Escape') setEditingId(null); }}
                          className="h-7 text-sm flex-1"
                          style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                          autoFocus
                        />
                        <button onClick={() => handleRename(lesson.id)} style={{ color: colors.accent }}><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} style={{ color: colors.textMuted }}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/info/lesson/${lesson.id}/view`)}
                          className="flex-1 flex items-center gap-2 px-3 py-2.5 text-left text-sm"
                          style={{ color: colors.text }}
                        >
                          <span className="truncate">{lesson.name}</span>
                          {isAdmin && !lesson.published && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0" style={{ backgroundColor: colors.accentMuted, color: colors.accent }}>Draft</Badge>
                          )}
                        </button>

                        {isAdmin && (
                          <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => navigate(`/info/lesson/${lesson.id}`)} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: colors.textMuted }} title="Edit content">
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setEditingId(lesson.id); setEditName(lesson.name); }} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: colors.textMuted }} title="Rename">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleTogglePublish(lesson.id, lesson.published)} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: colors.textMuted }} title={lesson.published ? 'Unpublish' : 'Publish'}>
                              {lesson.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button onClick={() => handleDelete(lesson.id, lesson.name)} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: '#ef4444' }} title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add lesson */}
            {isAdmin && (
              <div className="p-2" style={{ borderTop: lessons.length > 0 ? `1px solid ${colors.border}` : 'none' }}>
                {creatingLesson ? (
                  <div className="flex items-center gap-1 px-2">
                    <Input
                      value={newLessonName}
                      onChange={(e) => setNewLessonName(e.target.value)}
                      placeholder="Lesson name..."
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLesson(); if (e.key === 'Escape') { setCreatingLesson(false); setNewLessonName(''); } }}
                      className="h-7 text-sm flex-1"
                      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                      autoFocus
                    />
                    <button onClick={handleCreateLesson} style={{ color: colors.accent }}><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setCreatingLesson(false); setNewLessonName(''); }} style={{ color: colors.textMuted }}><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingLesson(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{ color: colors.textMuted }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.cardHover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Plus className="w-4 h-4" />
                    Add Lesson
                  </button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right content area */}
        <div className="flex-1 flex items-center justify-center">
          {lessons.length > 0 ? (
            <div className="text-center" style={{ color: colors.textMuted }}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium" style={{ color: colors.text }}>Select a lesson to start</p>
              <p className="text-sm mt-1">Choose from the sidebar on the left</p>
            </div>
          ) : !isLoading ? (
            <div className="text-center" style={{ color: colors.textMuted }}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No lessons available yet.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default InfoClassroom;
