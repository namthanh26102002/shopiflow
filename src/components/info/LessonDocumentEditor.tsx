import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Bold, Italic,
  Image, Minus, Link, Video, Trash2,
  Heading1, Heading2, Heading3, Heading4,
  Cloud, CloudOff, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Columns, Rows,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InfoThemeColors } from '@/hooks/useInfoTheme';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LessonDocumentEditorProps {
  lessonId: string;
  initialContent: string;
  themeColors: InfoThemeColors;
}

const TOOLBAR_GROUPS = [
  [
    { cmd: 'formatBlock', val: 'H1', icon: Heading1, title: 'Heading 1' },
    { cmd: 'formatBlock', val: 'H2', icon: Heading2, title: 'Heading 2' },
    { cmd: 'formatBlock', val: 'H3', icon: Heading3, title: 'Heading 3' },
    { cmd: 'formatBlock', val: 'H4', icon: Heading4, title: 'Heading 4' },
  ],
  [
    { cmd: 'bold', icon: Bold, title: 'Bold' },
    { cmd: 'italic', icon: Italic, title: 'Italic' },
  ],
  [
    { cmd: 'insertImage', icon: Image, title: 'Image' },
    { cmd: 'insertHorizontalRule', icon: Minus, title: 'Divider' },
    { cmd: 'createLink', icon: Link, title: 'Link' },
    { cmd: 'uploadVideo', icon: Video, title: 'Upload Video' },
  ],
];

export const LessonDocumentEditor: React.FC<LessonDocumentEditorProps> = ({
  lessonId,
  initialContent,
  themeColors,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(initialContent);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);
  const [hoveredMedia, setHoveredMedia] = useState<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [insertLine, setInsertLine] = useState<{ top: number; left: number; width: number } | null>(null);
  const [interacting, setInteracting] = useState<false | 'resize' | 'drag'>(false);
  const dropRef = useRef<{ target: HTMLElement; position: 'before' | 'after' } | null>(null);
  const { user } = useAuth();

  const activeMedia = selectedMedia ?? hoveredMedia;

  const measure = useCallback((el: HTMLElement | null) => {
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) { setRect(null); return; }
    const w = wrapper.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - w.top, left: r.left - w.left, width: r.width, height: r.height });
  }, []);

  useEffect(() => { measure(activeMedia); }, [activeMedia, measure]);

  useEffect(() => {
    const onChange = () => measure(activeMedia);
    window.addEventListener('resize', onChange);
    const scroller = wrapperRef.current?.parentElement;
    scroller?.addEventListener('scroll', onChange);
    return () => {
      window.removeEventListener('resize', onChange);
      scroller?.removeEventListener('scroll', onChange);
    };
  }, [activeMedia, measure]);

  // Hover detection for the media overlay buttons
  useEffect(() => {
    const editor = editorRef.current;
    const wrapper = wrapperRef.current;
    if (!editor || !wrapper) return;
    const onOver = (e: MouseEvent) => {
      if (interacting) return;
      const t = e.target as HTMLElement;
      // Keep the current hover target while the cursor is over the overlay itself,
      // otherwise the overlay unmounts and instantly re-mounts (flicker).
      if (t.closest?.('[data-media-overlay]')) return;
      if (t.tagName === 'IMG' || t.tagName === 'VIDEO') { setHoveredMedia(t); return; }
      if (!editor.contains(t)) return;
      setHoveredMedia(null);
    };
    const onLeave = (e: MouseEvent) => {
      if (interacting) return;
      const to = e.relatedTarget as HTMLElement | null;
      if (to?.closest?.('[data-media-overlay]')) return;
      setHoveredMedia(null);
    };
    wrapper.addEventListener('mousemove', onOver);
    wrapper.addEventListener('mouseleave', onLeave);
    return () => {
      wrapper.removeEventListener('mousemove', onOver);
      wrapper.removeEventListener('mouseleave', onLeave);
    };
  }, [interacting]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  // Click handler to select/deselect media elements
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        // Remove previous selection
        editor.querySelectorAll('.media-selected').forEach(el => el.classList.remove('media-selected'));
        target.classList.add('media-selected');
        setSelectedMedia(target);
        e.preventDefault();
      } else {
        editor.querySelectorAll('.media-selected').forEach(el => el.classList.remove('media-selected'));
        setSelectedMedia(null);
      }
    };

    editor.addEventListener('click', handleClick);
    return () => editor.removeEventListener('click', handleClick);
  }, []);

  // Handle delete/backspace on selected media
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMedia && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        selectedMedia.remove();
        setSelectedMedia(null);
        scheduleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedia]);

  const deleteSelectedMedia = useCallback(() => {
    if (!selectedMedia) return;
    selectedMedia.remove();
    setSelectedMedia(null);
    scheduleSave();
  }, [selectedMedia]);

  const saveContent = useCallback(async (html: string) => {
    if (html === lastSavedRef.current) return;
    setSaving(true);
    const { error } = await supabase
      .from('lessons')
      .update({ content: html } as any)
      .eq('id', lessonId);
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
    } else {
      lastSavedRef.current = html;
    }
  }, [lessonId]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (editorRef.current) {
        saveContent(editorRef.current.innerHTML);
      }
    }, 2000);
  }, [saveContent]);

  const handleInput = useCallback(() => {
    scheduleSave();
  }, [scheduleSave]);

  const getBlock = useCallback((el: HTMLElement | null): HTMLElement | null => {
    const editor = editorRef.current;
    if (!el || !editor || !editor.contains(el)) return null;
    let block: HTMLElement = el;
    while (block.parentElement && block.parentElement !== editor) block = block.parentElement;
    return block.parentElement === editor ? block : null;
  }, []);

  // --- Media row helpers ---
  const MAX_ROW_ITEMS = 4;

  const getCell = useCallback((el: HTMLElement | null): HTMLElement | null => {
    const editor = editorRef.current;
    if (!el || !editor) return null;
    const cell = el.closest('.media-cell') as HTMLElement | null;
    return cell && editor.contains(cell) ? cell : null;
  }, []);

  const isMediaBlock = useCallback((block: Element | null): boolean => {
    if (!block) return false;
    const el = block as HTMLElement;
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') return true;
    if (el.classList.contains('media-row')) return true;
    return !!el.querySelector('img,video') && !el.textContent?.trim();
  }, []);

  const flipRow = useCallback((nodes: HTMLElement[], mutate: () => void) => {
    const before = new Map(nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return [n, { top: r.top, left: r.left }] as const;
    }));
    mutate();
    nodes.forEach((n) => {
      const prev = before.get(n);
      if (!prev) return;
      const r = n.getBoundingClientRect();
      const dx = prev.left - r.left;
      const dy = prev.top - r.top;
      if (!dx && !dy) return;
      n.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    });
  }, []);

  const makeCell = useCallback((media: HTMLElement) => {
    const cell = document.createElement('div');
    cell.className = 'media-cell';
    cell.style.flex = '1 1 0';
    media.style.width = '';
    media.style.height = '';
    cell.appendChild(media);
    return cell;
  }, []);

  const blockToCells = useCallback((block: HTMLElement): HTMLElement[] => {
    if (block.classList.contains('media-row')) return Array.from(block.children) as HTMLElement[];
    const medias: HTMLElement[] = block.tagName === 'IMG' || block.tagName === 'VIDEO'
      ? [block]
      : (Array.from(block.querySelectorAll('img,video')) as HTMLElement[]);
    return medias.map((m) => makeCell(m));
  }, [makeCell]);

  const groupWith = useCallback((dir: 'up' | 'down') => {
    const el = activeMedia;
    const editor = editorRef.current;
    const block = getBlock(el);
    if (!el || !editor || !block) return;
    const sibling = (dir === 'up' ? block.previousElementSibling : block.nextElementSibling) as HTMLElement | null;
    if (!sibling || !isMediaBlock(sibling)) return;

    const first = dir === 'up' ? sibling : block;
    const second = dir === 'up' ? block : sibling;
    const cells = [...blockToCells(first), ...blockToCells(second)];
    if (cells.length > MAX_ROW_ITEMS) {
      toast.error(`Up to ${MAX_ROW_ITEMS} media items per row`);
      return;
    }

    const nodes = Array.from(editor.children) as HTMLElement[];
    flipRow(nodes, () => {
      const row = document.createElement('div');
      row.className = 'media-row';
      cells.forEach((c) => { c.style.flex = '1 1 0'; row.appendChild(c); });
      editor.insertBefore(row, first);
      first.remove();
      second.remove();
    });

    setSelectedMedia(el);
    requestAnimationFrame(() => measure(el));
    setTimeout(() => measure(el), 240);
    scheduleSave();
  }, [activeMedia, blockToCells, flipRow, getBlock, isMediaBlock, measure, scheduleSave]);

  const ungroup = useCallback(() => {
    const el = activeMedia;
    const editor = editorRef.current;
    const cell = getCell(el);
    const row = cell?.parentElement as HTMLElement | null;
    if (!el || !editor || !cell || !row) return;

    const nodes = Array.from(editor.children) as HTMLElement[];
    flipRow(nodes, () => {
      const holder = document.createElement('p');
      el.style.width = '';
      holder.appendChild(el);
      row.parentElement?.insertBefore(holder, row.nextSibling);
      cell.remove();

      const remaining = Array.from(row.children) as HTMLElement[];
      if (remaining.length === 0) {
        row.remove();
      } else if (remaining.length === 1) {
        const lone = remaining[0].querySelector('img,video') as HTMLElement | null;
        const p = document.createElement('p');
        if (lone) { lone.style.width = ''; p.appendChild(lone); }
        row.parentElement?.insertBefore(p, row);
        row.remove();
      } else {
        remaining.forEach((c) => { c.style.flex = '1 1 0'; });
      }
    });

    setSelectedMedia(el);
    requestAnimationFrame(() => measure(el));
    setTimeout(() => measure(el), 240);
    scheduleSave();
  }, [activeMedia, flipRow, getCell, measure, scheduleSave]);

  const moveWithinRow = useCallback((dir: 'left' | 'right') => {
    const el = activeMedia;
    const cell = getCell(el);
    const row = cell?.parentElement as HTMLElement | null;
    if (!el || !cell || !row) return;
    const sibling = (dir === 'left' ? cell.previousElementSibling : cell.nextElementSibling) as HTMLElement | null;
    if (!sibling) return;

    const cells = Array.from(row.children) as HTMLElement[];
    flipRow(cells, () => {
      if (dir === 'left') row.insertBefore(cell, sibling);
      else row.insertBefore(sibling, cell);
    });

    setSelectedMedia(el);
    requestAnimationFrame(() => measure(el));
    setTimeout(() => measure(el), 240);
    scheduleSave();
  }, [activeMedia, flipRow, getCell, measure, scheduleSave]);

  // --- Resize (corner drag, aspect ratio preserved) ---
  const startResize = useCallback((e: React.PointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    const el = selectedMedia;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;
    e.preventDefault();
    e.stopPropagation();
    setInteracting('resize');
    const startX = e.clientX;
    const startW = el.getBoundingClientRect().width;
    const maxW = wrapper.clientWidth - 48;
    const sign = corner === 'ne' || corner === 'se' ? 1 : -1;

    // Inside a media row we redistribute flex shares instead of pixel widths
    const cell = getCell(el);
    const row = cell?.parentElement as HTMLElement | null;
    const rowCells = row ? (Array.from(row.children) as HTMLElement[]) : [];
    const rowWidth = row ? row.clientWidth : 0;

    const onMove = (ev: PointerEvent) => {
      if (cell && row && rowCells.length > 1) {
        const others = rowCells.length - 1;
        const minEach = 60;
        const next = Math.max(
          minEach,
          Math.min(rowWidth - minEach * others, startW + (ev.clientX - startX) * sign)
        );
        cell.style.flex = `${Math.round(next)} 1 0`;
        const share = Math.max(minEach, (rowWidth - next) / others);
        rowCells.forEach((c) => { if (c !== cell) c.style.flex = `${Math.round(share)} 1 0`; });
        measure(el);
        return;
      }
      const next = Math.max(80, Math.min(maxW, startW + (ev.clientX - startX) * sign));
      el.style.width = `${Math.round(next)}px`;
      el.style.height = 'auto';
      el.style.maxWidth = '100%';
      measure(el);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setInteracting(false);
      scheduleSave();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [selectedMedia, measure, scheduleSave, getCell]);

  // --- Reorder with arrow buttons (FLIP animation) ---
  const [moveState, setMoveState] = useState({
    up: false, down: false, left: false, right: false,
    groupUp: false, groupDown: false, inRow: false,
  });

  useEffect(() => {
    const block = getBlock(activeMedia);
    const cell = getCell(activeMedia);
    const rowCells = cell?.parentElement ? Array.from(cell.parentElement.children) : [];
    setMoveState({
      up: !!block?.previousElementSibling,
      down: !!block?.nextElementSibling,
      left: !!cell?.previousElementSibling,
      right: !!cell?.nextElementSibling,
      groupUp: isMediaBlock(block?.previousElementSibling ?? null) && rowCells.length < MAX_ROW_ITEMS,
      groupDown: isMediaBlock(block?.nextElementSibling ?? null) && rowCells.length < MAX_ROW_ITEMS,
      inRow: !!cell,
    });
  }, [activeMedia, getBlock, getCell, isMediaBlock, rect]);

  const moveMedia = useCallback((dir: 'up' | 'down') => {
    const el = activeMedia;
    const editor = editorRef.current;
    const block = getBlock(el);
    if (!el || !editor || !block) return;
    const sibling = (dir === 'up' ? block.previousElementSibling : block.nextElementSibling) as HTMLElement | null;
    if (!sibling) return;

    // capture positions for a smooth FLIP animation
    const nodes = Array.from(editor.children) as HTMLElement[];
    const before = new Map(nodes.map((n) => [n, n.getBoundingClientRect().top]));

    setSelectedMedia(el);
    if (dir === 'up') editor.insertBefore(block, sibling);
    else editor.insertBefore(sibling, block);

    nodes.forEach((n) => {
      const prevTop = before.get(n);
      if (prevTop === undefined) return;
      const delta = prevTop - n.getBoundingClientRect().top;
      if (!delta) return;
      n.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    });

    requestAnimationFrame(() => measure(el));
    setTimeout(() => measure(el), 240);
    scheduleSave();
  }, [activeMedia, getBlock, measure, scheduleSave]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const cleaned = html
        .replace(/font-size\s*:\s*[^;"']*/gi, '')
        .replace(/font-family\s*:\s*[^;"']*/gi, '');
      document.execCommand('insertHTML', false, cleaned);
    } else {
      document.execCommand('insertText', false, text);
    }
    scheduleSave();
  }, [scheduleSave]);

  const execCmd = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();

    if (cmd === 'insertImage') {
      fileInputRef.current?.click();
      return;
    }

    if (cmd === 'uploadVideo') {
      videoInputRef.current?.click();
      return;
    }

    if (cmd === 'createLink') {
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
      scheduleSave();
      return;
    }

    if (cmd === 'formatBlock' && val) {
      document.execCommand('formatBlock', false, `<${val}>`);
    } else {
      document.execCommand(cmd, false, val);
    }
    scheduleSave();
  }, [scheduleSave]);

  const compressVideo = useCallback(async (file: File): Promise<File> => {
    // For files under 5MB, skip compression
    if (file.size < 5 * 1024 * 1024) return file;
    // Return original — true compression needs server-side ffmpeg
    return file;
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/lessons/${lessonId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('quiz-assets').upload(path, file);
    if (error) { toast.error('Upload failed: ' + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('quiz-assets').getPublicUrl(path);
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, `<img src="${publicUrl}" alt="" /><p><br></p>`);
    scheduleSave();
    e.target.value = '';
  }, [lessonId, scheduleSave, user]);

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    toast.info(`Uploading video (${sizeMB}MB)...`);
    const ext = file.name.split('.').pop() || 'mp4';
    const path = `${user.id}/lessons/${lessonId}/${Date.now()}.${ext}`;
    const videoFile = await compressVideo(file);
    const { error } = await supabase.storage.from('quiz-assets').upload(path, videoFile);
    if (error) { toast.error('Upload failed: ' + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('quiz-assets').getPublicUrl(path);
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, `<video src="${publicUrl}" controls playsinline style="max-width:100%;border-radius:8px;margin:8px 0"></video><p><br></p>`);
    scheduleSave();
    toast.success('Video uploaded');
    e.target.value = '';
  }, [lessonId, scheduleSave, user, compressVideo]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (editorRef.current && editorRef.current.innerHTML !== lastSavedRef.current) {
        supabase.from('lessons').update({ content: editorRef.current.innerHTML } as any).eq('id', lessonId);
      }
    };
  }, [lessonId]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="sticky top-0 z-10 flex items-center gap-0.5 px-4 py-2 flex-wrap"
        style={{ backgroundColor: themeColors.card, borderBottom: `1px solid ${themeColors.border}` }}
      >
        {TOOLBAR_GROUPS.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="w-px h-6 mx-1" style={{ backgroundColor: themeColors.border }} />}
            {group.map((btn) => (
              <button
                key={btn.title}
                onMouseDown={(e) => { e.preventDefault(); execCmd(btn.cmd, btn.val); }}
                className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80 transition-opacity"
                style={{ color: themeColors.textMuted }}
                title={btn.title}
              >
                <btn.icon className="w-4 h-4" />
              </button>
            ))}
          </React.Fragment>
        ))}

        {/* Delete button - visible when media is selected */}
        {selectedMedia && (
          <>
            <div className="w-px h-6 mx-1" style={{ backgroundColor: themeColors.border }} />
            <button
              onMouseDown={(e) => { e.preventDefault(); deleteSelectedMedia(); }}
              className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80 transition-opacity"
              style={{ color: '#ef4444' }}
              title="Delete selected media"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: themeColors.textMuted }}>
          {saving ? (
            <><CloudOff className="w-3.5 h-3.5 animate-pulse" /> Saving...</>
          ) : (
            <><Cloud className="w-3.5 h-3.5" style={{ color: '#22c55e' }} /> Saved</>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto">
        <div ref={wrapperRef} className="max-w-[680px] mx-auto px-6 py-8 relative">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            className="outline-none min-h-[60vh] prose prose-sm max-w-none"
            style={{
              color: themeColors.text,
              caretColor: themeColors.accent,
              lineHeight: 1.8,
            }}
            data-placeholder="Start writing..."
          />

          {/* Media overlay: drag handle (hover) + resize handles (selected) */}
          {rect && activeMedia && (
            <div
              data-media-overlay
              className="absolute pointer-events-none"
              style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex: 20 }}
            >
              {selectedMedia === activeMedia && (
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{ outline: `2px solid ${themeColors.accent}`, outlineOffset: 2 }}
                />
              )}

              <div
                data-media-overlay
                className="absolute pointer-events-auto flex flex-col gap-1"
                style={{ top: 8, left: 8 }}
              >
                {([
                  { key: 'up', Icon: ChevronUp, enabled: moveState.up, title: 'Move up', action: () => moveMedia('up') },
                  { key: 'down', Icon: ChevronDown, enabled: moveState.down, title: 'Move down', action: () => moveMedia('down') },
                  { key: 'left', Icon: ChevronLeft, enabled: moveState.left, title: 'Move left in row', action: () => moveWithinRow('left') },
                  { key: 'right', Icon: ChevronRight, enabled: moveState.right, title: 'Move right in row', action: () => moveWithinRow('right') },
                  { key: 'groupUp', Icon: Columns, enabled: moveState.groupUp, title: 'Group side by side with media above', action: () => groupWith('up') },
                  { key: 'groupDown', Icon: Columns, enabled: moveState.groupDown, title: 'Group side by side with media below', action: () => groupWith('down') },
                  { key: 'ungroup', Icon: Rows, enabled: moveState.inRow, title: 'Ungroup (own row)', action: () => ungroup() },
                ]).map(({ key, Icon, enabled, title, action }) => (
                  enabled ? (
                    <button
                      key={key}
                      type="button"
                      title={title}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); action(); }}
                      className="flex items-center justify-center rounded-md shadow-sm transition-transform hover:scale-110"
                      style={{
                        width: 26, height: 26,
                        backgroundColor: themeColors.card,
                        border: `1px solid ${themeColors.border}`,
                        color: themeColors.text,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ) : null
                ))}
              </div>

              {selectedMedia === activeMedia && (['nw', 'ne', 'sw', 'se'] as const).map((c) => (
                <div
                  key={c}
                  onPointerDown={(e) => startResize(e, c)}
                  className="absolute pointer-events-auto rounded-full"
                  style={{
                    width: 12, height: 12,
                    backgroundColor: themeColors.card,
                    border: `2px solid ${themeColors.accent}`,
                    top: c.startsWith('n') ? -6 : undefined,
                    bottom: c.startsWith('s') ? -6 : undefined,
                    left: c.endsWith('w') ? -6 : undefined,
                    right: c.endsWith('e') ? -6 : undefined,
                    cursor: c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize',
                  }}
                />
              ))}

              {interacting === 'resize' && (
                <div
                  className="absolute px-2 py-0.5 rounded text-[11px]"
                  style={{
                    bottom: 8, right: 8,
                    backgroundColor: themeColors.accent,
                    color: themeColors.card,
                  }}
                >
                  {Math.round(rect.width)} × {Math.round(rect.height)}
                </div>
              )}
            </div>
          )}

          {insertLine && (
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                top: insertLine.top - 1, left: insertLine.left, width: insertLine.width, height: 3,
                backgroundColor: themeColors.accent, zIndex: 25,
              }}
            />
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />

      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: ${themeColors.textMuted};
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
        [contenteditable] h2 { font-size: 1.5em; font-weight: 600; margin: 0.75em 0; }
        [contenteditable] h3 { font-size: 1.25em; font-weight: 600; margin: 0.8em 0; }
        [contenteditable] h4 { font-size: 1.1em; font-weight: 600; margin: 0.85em 0; }
        [contenteditable] code { background: ${themeColors.accentMuted}; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        [contenteditable] hr { border: none; border-top: 1px solid ${themeColors.border}; margin: 24px 0; }
        [contenteditable] a { color: ${themeColors.accent}; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; cursor: pointer; }
        [contenteditable] img.media-selected { outline: 2px solid ${themeColors.accent}; outline-offset: 2px; }
        [contenteditable] video { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; cursor: pointer; }
        [contenteditable] video.media-selected { outline: 2px solid ${themeColors.accent}; outline-offset: 2px; }
        [contenteditable] .media-row { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0; }
        [contenteditable] .media-cell { flex: 1 1 0; min-width: 0; }
        [contenteditable] .media-cell img,
        [contenteditable] .media-cell video { width: 100%; height: auto; margin: 0; display: block; }
        @media (max-width: 640px) {
          [contenteditable] .media-row { flex-wrap: wrap; }
          [contenteditable] .media-cell { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  );
};