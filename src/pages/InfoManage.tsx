import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Plus, Trash2, Edit2, Eye, EyeOff, FileText, Image, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClassrooms } from '@/hooks/useClassrooms';
import { useLessons } from '@/hooks/useLessons';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const InfoManage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newLessonName, setNewLessonName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);

  const { lessons, isLoading: lessonsLoading, createLesson, updateLesson, deleteLesson } = useLessons(selectedClassroomId || undefined);

  const handleCreateClassroom = () => {
    if (!newClassroomName.trim()) return;
    createClassroom.mutate(newClassroomName.trim());
    setNewClassroomName('');
  };

  const handleCreateLesson = () => {
    if (!newLessonName.trim()) return;
    createLesson.mutate(newLessonName.trim());
    setNewLessonName('');
  };

  const handleCoverUpload = async (classroomId: string, file: File) => {
    if (!user) return;
    setUploadingCover(classroomId);
    try {
      const previousUrl = classrooms.find(c => c.id === classroomId)?.cover_image_url;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/classrooms/${classroomId}/cover-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('quiz-assets').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('quiz-assets').getPublicUrl(path);
      updateClassroom.mutate({ id: classroomId, cover_image_url: urlData.publicUrl });
      if (previousUrl) {
        const marker = '/quiz-assets/';
        const idx = previousUrl.indexOf(marker);
        if (idx !== -1) {
          const oldPath = decodeURIComponent(previousUrl.slice(idx + marker.length).split('?')[0]);
          if (oldPath && oldPath !== path) await supabase.storage.from('quiz-assets').remove([oldPath]);
        }
      }
      toast.success('Cover image updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload cover image');
    } finally {
      setUploadingCover(null);
    }
  };

  const startEdit = (id: string, name: string) => { setEditingId(id); setEditName(name); };
  const saveEdit = (type: 'classroom' | 'lesson') => {
    if (!editingId || !editName.trim()) return;
    if (type === 'classroom') updateClassroom.mutate({ id: editingId, name: editName.trim() });
    else updateLesson.mutate({ id: editingId, name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <BuilderSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{user?.email}</span>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800" onClick={signOut} title="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" onClick={() => navigate('/info')}>
          <ArrowLeft className="w-4 h-4" /> Back to Info
        </Button>

        <h1 className="text-xl font-bold text-zinc-100 mb-6">Manage Info</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classrooms Column */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Classrooms</h2>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="New classroom name"
                value={newClassroomName}
                onChange={e => setNewClassroomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateClassroom()}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              />
              <Button size="sm" onClick={handleCreateClassroom} disabled={!newClassroomName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {classrooms.map(c => (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${selectedClassroomId === c.id ? 'border-purple-500/50 bg-purple-500/10' : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/70'}`}
                  onClick={() => setSelectedClassroomId(c.id)}
                >
                  {editingId === c.id ? (
                    <div className="flex gap-2">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit('classroom')} autoFocus className="bg-zinc-900 border-zinc-700 text-zinc-100" />
                      <Button size="sm" onClick={() => saveEdit('classroom')} className="bg-purple-600 hover:bg-purple-700 text-white">Save</Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.cover_image_url ? (
                          <img src={c.cover_image_url} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-zinc-600" />
                          </div>
                        )}
                        <span className="font-medium text-sm text-zinc-100">{c.name}</span>
                        {!c.published && <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">Draft</span>}
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleCoverUpload(c.id, e.target.files[0])} />
                          <div className="w-7 h-7 rounded flex items-center justify-center hover:bg-zinc-800 text-zinc-500">
                            <Image className="w-3.5 h-3.5" />
                          </div>
                        </label>
                        <Switch
                          checked={c.published}
                          onCheckedChange={checked => updateClassroom.mutate({ id: c.id, published: checked })}
                        />
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" onClick={() => startEdit(c.id, c.name)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400 hover:text-red-300 hover:bg-zinc-800" onClick={() => deleteClassroom.mutate(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lessons Column */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Lessons {selectedClassroomId && `— ${classrooms.find(c => c.id === selectedClassroomId)?.name}`}
            </h2>

            {!selectedClassroomId ? (
              <p className="text-sm text-zinc-600 py-8 text-center">Select a classroom to manage its lessons.</p>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="New lesson name"
                    value={newLessonName}
                    onChange={e => setNewLessonName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateLesson()}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                  <Button size="sm" onClick={handleCreateLesson} disabled={!newLessonName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
                      {editingId === lesson.id ? (
                        <div className="flex gap-2">
                          <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit('lesson')} autoFocus className="bg-zinc-900 border-zinc-700 text-zinc-100" />
                          <Button size="sm" onClick={() => saveEdit('lesson')} className="bg-purple-600 hover:bg-purple-700 text-white">Save</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-purple-500/15 flex items-center justify-center text-xs font-semibold text-purple-300">{idx + 1}</span>
                            <span className="font-medium text-sm text-zinc-100">{lesson.name}</span>
                            {!lesson.published && <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">Draft</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={lesson.published}
                              onCheckedChange={checked => updateLesson.mutate({ id: lesson.id, published: checked })}
                            />
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" onClick={() => startEdit(lesson.id, lesson.name)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => navigate(`/info/lesson/${lesson.id}`)}>
                              <FileText className="w-3 h-3" /> Edit Content
                            </Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400 hover:text-red-300 hover:bg-zinc-800" onClick={() => deleteLesson.mutate(lesson.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {lessons.length === 0 && (
                    <p className="text-sm text-zinc-600 py-8 text-center">No lessons yet. Create one above.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InfoManage;
