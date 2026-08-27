import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, Plus, Pencil, Trash2, Eye, EyeOff, ImagePlus, X, Check, GripVertical, Frame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useClassrooms } from '@/hooks/useClassrooms';
import { useInfoTheme } from '@/hooks/useInfoTheme';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { InfoThemeToggle } from '@/components/shared/InfoThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableClassroomCardProps {
  id: string;
  isAdmin: boolean;
  children: (handleProps: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  }) => React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const SortableClassroomCard: React.FC<SortableClassroomCardProps> = ({ id, isAdmin, children, style, className }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isAdmin });
  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : style?.opacity ?? 1,
    zIndex: isDragging ? 20 : undefined,
    ...style,
  };
  return (
    <div ref={setNodeRef} style={dragStyle} className={className}>
      {children({ attributes, listeners })}
    </div>
  );
};

const Info: React.FC = () => {
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom, reorderClassrooms, setGlobalCoverRatio } = useClassrooms(isAdmin ? false : true);
  const navigate = useNavigate();
  const { theme, setTheme, colors } = useInfoTheme();

  const coverRatio = classrooms[0]?.cover_aspect_ratio || '16/9';
  const RATIO_PRESETS = ['16/9', '3/2', '4/3', '1/1'];
  const [customRatio, setCustomRatio] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = classrooms.findIndex((c) => c.id === active.id);
    const newIndex = classrooms.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(classrooms, oldIndex, newIndex);
    reorderClassrooms.mutate(reordered.map((c) => c.id));
  };

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverUploadTarget, setCoverUploadTarget] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createClassroom.mutate(newName.trim());
    setNewName('');
    setCreatingNew(false);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    updateClassroom.mutate({ id, name: editName.trim() });
    setEditingId(null);
  };

  const handleTogglePublish = (id: string, current: boolean) => {
    updateClassroom.mutate({ id, published: !current });
    toast.success(!current ? 'Published' : 'Unpublished');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This will also delete all lessons inside.`)) {
      deleteClassroom.mutate(id);
    }
  };

  const handleCoverUpload = async (classroomId: string, file: File) => {
    if (!user) return;
    setUploadingId(classroomId);
    try {
      const previousUrl = classrooms.find((c) => c.id === classroomId)?.cover_image_url;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/classrooms/${classroomId}/cover-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('quiz-assets').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('quiz-assets').getPublicUrl(path);
      updateClassroom.mutate({ id: classroomId, cover_image_url: urlData.publicUrl });

      // Remove the previous cover file so storage doesn't accumulate old images
      if (previousUrl) {
        const marker = '/quiz-assets/';
        const idx = previousUrl.indexOf(marker);
        if (idx !== -1) {
          const oldPath = decodeURIComponent(previousUrl.slice(idx + marker.length).split('?')[0]);
          if (oldPath && oldPath !== path) {
            await supabase.storage.from('quiz-assets').remove([oldPath]);
          }
        }
      }
      toast.success('Cover updated');
    } catch {
      toast.error('Failed to upload cover');
    } finally {
      setUploadingId(null);
      setCoverUploadTarget(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
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

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.accentMuted }}>
            <BookOpen className="w-5 h-5" style={{ color: colors.accent }} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>Tập Tành Dropship</h1>
            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors"
                    style={{
                      backgroundColor: colors.accentMuted,
                      color: colors.accent,
                      border: `1px solid ${colors.accent}`,
                    }}
                    title="Adjust cover aspect ratio"
                  >
                    <Frame className="w-3.5 h-3.5" />
                    <span>{coverRatio.replace('/', ':')}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-56 p-3 space-y-3"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>Cover ratio</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RATIO_PRESETS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setGlobalCoverRatio.mutate(r)}
                          className="px-2 py-1 rounded text-xs transition-colors"
                          style={{
                            backgroundColor: coverRatio === r ? colors.accentMuted : colors.bg,
                            color: coverRatio === r ? colors.accent : colors.text,
                            border: `1px solid ${coverRatio === r ? colors.accent : colors.border}`,
                          }}
                        >
                          {r.replace('/', ':')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Custom ratio</p>
                    <Input
                      value={customRatio}
                      onChange={(e) => setCustomRatio(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const m = customRatio.trim().match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
                          if (m) { setGlobalCoverRatio.mutate(`${m[1]}/${m[2]}`); setCustomRatio(''); }
                          else toast.error('Use format like 21:9');
                        }
                      }}
                      placeholder="21:9"
                      className="h-8 text-xs"
                      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" style={{ backgroundColor: colors.card }} />)}
          </div>
        ) : classrooms.length === 0 && !isAdmin ? (
          <div className="text-center py-16" style={{ color: colors.textMuted }}>
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No classrooms available yet.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={classrooms.map((c) => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classrooms.map((c) => (
                  <SortableClassroomCard
                    key={c.id}
                    id={c.id}
                    isAdmin={isAdmin}
                    className="rounded-xl overflow-hidden text-left transition-all relative group"
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.card,
                      opacity: !c.published && isAdmin ? 0.7 : 1,
                    }}
                  >
                    {({ attributes, listeners }) => (
                      <>
                        {/* Admin hover overlay */}
                        {isAdmin && (
                          <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              {...attributes}
                              {...listeners}
                              onClick={(e) => e.stopPropagation()}
                              className="w-7 h-7 rounded-md flex items-center justify-center backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none"
                              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </button>
                            <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditName(c.name); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center backdrop-blur-sm"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCoverUploadTarget(c.id); fileInputRef.current?.click(); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center backdrop-blur-sm"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                      title="Upload cover"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePublish(c.id, c.published); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center backdrop-blur-sm"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                      title={c.published ? 'Unpublish' : 'Publish'}
                    >
                      {c.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center backdrop-blur-sm"
                      style={{ backgroundColor: 'rgba(180,40,40,0.7)', color: '#fff' }}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Draft badge */}
                {isAdmin && !c.published && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}>Draft</Badge>
                  </div>
                )}

                <button
                  onClick={() => navigate(`/info/classroom/${c.id}`)}
                  className="w-full text-left"
                >
                  {c.cover_image_url ? (
                    <div className="w-full" style={{ aspectRatio: coverRatio, backgroundColor: colors.card }}>
                      <img src={c.cover_image_url} alt={c.name} className="w-full h-full object-cover border-0 rounded-none shadow-none opacity-100" />
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center" style={{ aspectRatio: coverRatio, backgroundColor: colors.cardHover }}>
                      <BookOpen className="w-8 h-8" style={{ color: colors.textMuted }} />
                    </div>
                  )}
                </button>

                <div className="p-3">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="h-7 text-sm"
                        style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                        autoFocus
                      />
                      <button onClick={() => handleRename(c.id)} className="w-6 h-6 flex items-center justify-center" style={{ color: colors.accent }}><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="w-6 h-6 flex items-center justify-center" style={{ color: colors.textMuted }}><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <h3 className="font-semibold" style={{ color: colors.text }}>{c.name}</h3>
                  )}
                </div>
                      </>
                    )}
                  </SortableClassroomCard>
                ))}

            {/* Add new classroom card */}
            {isAdmin && (
              creatingNew ? (
                <div className="rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 gap-2" style={{ border: `1px dashed ${colors.border}`, backgroundColor: colors.card }}>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Classroom name..."
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreatingNew(false); setNewName(''); } }}
                    className="text-sm"
                    style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreate} style={{ backgroundColor: colors.accent, color: '#fff' }}>Create</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setCreatingNew(false); setNewName(''); }} style={{ color: colors.textMuted }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingNew(true)}
                  className="rounded-xl overflow-hidden flex flex-col items-center justify-center transition-colors w-full"
                  style={{ border: `1px dashed ${colors.border}`, backgroundColor: 'transparent', aspectRatio: coverRatio }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.cardHover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Plus className="w-8 h-8 mb-2" style={{ color: colors.textMuted }} />
                  <span className="text-sm" style={{ color: colors.textMuted }}>New Classroom</span>
                </button>
              )
            )}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Hidden file input for cover upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && coverUploadTarget) handleCoverUpload(coverUploadTarget, file);
            e.target.value = '';
          }}
        />
      </main>
    </div>
  );
};

export default Info;
