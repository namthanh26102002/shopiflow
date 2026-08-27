import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Bold, Italic, Palette, List, Type, AlignVerticalJustifyCenter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const PRESET_COLORS = [
  '#000000', '#EF4444', '#3B82F6', '#22C55E',
  '#F97316', '#A855F7', '#EAB308', '#EC4899',
  '#14B8A6', '#92400E', '#6B7280', '#FFFFFF',
];

const FONT_SIZES = [
  { label: 'XS', value: '12px' },
  { label: 'S', value: '14px' },
  { label: 'M', value: '16px' },
  { label: 'L', value: '20px' },
  { label: 'XL', value: '24px' },
  { label: '2XL', value: '30px' },
  { label: '3XL', value: '36px' },
  { label: '4XL', value: '48px' },
];

const LINE_HEIGHTS = [
  { label: 'Tight', value: '1' },
  { label: 'Snug', value: '1.25' },
  { label: 'Normal', value: '1.5' },
  { label: 'Relaxed', value: '1.75' },
  { label: 'Loose', value: '2' },
];

/**
 * Aggressively sanitize pasted HTML so it inherits the editor's styling.
 * Strips ALL inline styles, classes, ids, and converts the markup to a
 * minimal allowlist of tags/attributes.
 */
function sanitizePastedHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html;

  // Remove non-content elements entirely
  container.querySelectorAll('style, script, meta, link, head').forEach((el) => el.remove());

  const ALLOWED_TAGS = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN',
    'UL', 'OL', 'LI', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  ]);

  const walk = (node: Element) => {
    // Snapshot children since we may unwrap
    const children = Array.from(node.children);
    children.forEach(walk);

    // Strip all attributes except href on links
    Array.from(node.attributes).forEach((attr) => {
      if (node.tagName === 'A' && attr.name === 'href') return;
      node.removeAttribute(attr.name);
    });

    // Unwrap disallowed tags (replace with their children)
    if (!ALLOWED_TAGS.has(node.tagName)) {
      const parent = node.parentNode;
      if (parent) {
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
      }
    }
  };

  Array.from(container.children).forEach(walk);
  return container.innerHTML;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your content here...',
  minHeight = '120px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isInternalChange = useRef(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isList, setIsList] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [lineHeightOpen, setLineHeightOpen] = useState(false);

  // Sync external value changes into the editor
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    onChange(el.innerHTML);
  }, [onChange]);

  const updateToolbarState = useCallback(() => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsList(document.queryCommandState('insertUnorderedList'));
  }, []);

  const handleInput = useCallback(() => {
    emitChange();
    updateToolbarState();
  }, [emitChange, updateToolbarState]);

  // Strip ALL inline styles/classes from pasted content so it adopts the
  // editor's typography. Keeps basic formatting (bold/italic/lists/links).
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    if (html) {
      const cleaned = sanitizePastedHtml(html);
      document.execCommand('insertHTML', false, cleaned);
    } else {
      document.execCommand('insertText', false, plain);
    }
    emitChange();
  }, [emitChange]);

  const handleKeyUp = useCallback(() => {
    updateToolbarState();
  }, [updateToolbarState]);

  const handleMouseUp = useCallback(() => {
    updateToolbarState();
  }, [updateToolbarState]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedRangeRef.current;
    if (!range) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  const execFormat = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    emitChange();
    updateToolbarState();
  }, [emitChange, updateToolbarState]);

  const applyColor = useCallback((color: string) => {
    restoreSelection();
    document.execCommand('foreColor', false, color);
    emitChange();
    setColorPickerOpen(false);
  }, [restoreSelection, emitChange]);

  // Apply font-size to current selection by wrapping in <span style="font-size:...">.
  const applyFontSize = useCallback((size: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setFontSizeOpen(false);
      return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = size;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      // Reselect inserted node
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch (err) {
      console.error('applyFontSize failed', err);
    }
    emitChange();
    setFontSizeOpen(false);
  }, [restoreSelection, emitChange]);

  // Apply line-height to the block-level ancestor of the selection.
  const applyLineHeight = useCallback((lh: string) => {
    restoreSelection();
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!sel || sel.rangeCount === 0 || !editor) {
      setLineHeightOpen(false);
      return;
    }
    let node: Node | null = sel.getRangeAt(0).startContainer;
    // Walk up to nearest block-level element inside editor
    const blockTags = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
    while (node && node !== editor) {
      if (node.nodeType === 1 && blockTags.has((node as HTMLElement).tagName)) break;
      node = node.parentNode;
    }
    if (node && node !== editor && node.nodeType === 1) {
      (node as HTMLElement).style.lineHeight = lh;
    } else {
      // Apply to the whole editor if no block ancestor was found
      editor.style.lineHeight = lh;
    }
    emitChange();
    setLineHeightOpen(false);
  }, [restoreSelection, emitChange]);

  const handleColorPickerOpenChange = useCallback((open: boolean) => {
    if (open) {
      saveSelection();
    }
    setColorPickerOpen(open);
  }, [saveSelection]);

  const handleFontSizeOpenChange = useCallback((open: boolean) => {
    if (open) saveSelection();
    setFontSizeOpen(open);
  }, [saveSelection]);

  const handleLineHeightOpenChange = useCallback((open: boolean) => {
    if (open) saveSelection();
    setLineHeightOpen(open);
  }, [saveSelection]);

  const isEmpty = !value || value === '<br>' || value === '<p><br></p>';

  return (
    <div className="rounded-md border border-input overflow-hidden bg-background max-w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-input bg-muted/40">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0 rounded',
            isBold && 'bg-accent text-accent-foreground'
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('bold');
          }}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0 rounded',
            isItalic && 'bg-accent text-accent-foreground'
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('italic');
          }}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0 rounded',
            isList && 'bg-accent text-accent-foreground'
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('insertUnorderedList');
          }}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>

        <Popover open={colorPickerOpen} onOpenChange={handleColorPickerOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              title="Text Color"
            >
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-3"
            side="bottom"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    'w-6 h-6 rounded-sm border border-border cursor-pointer hover:scale-110 transition-transform',
                    color === '#FFFFFF' && 'border-muted-foreground/30'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => applyColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <input
                type="color"
                className="w-7 h-6 rounded cursor-pointer border-0 p-0"
                onChange={(e) => applyColor(e.target.value)}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Font Size */}
        <Popover open={fontSizeOpen} onOpenChange={handleFontSizeOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              title="Font Size"
            >
              <Type className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-32 p-1"
            side="bottom"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex flex-col">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className="text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                  onClick={() => applyFontSize(s.value)}
                >
                  <span style={{ fontSize: s.value }}>{s.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.value}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Line Height */}
        <Popover open={lineHeightOpen} onOpenChange={handleLineHeightOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              title="Line Spacing"
            >
              <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-32 p-1"
            side="bottom"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex flex-col">
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.value}
                  type="button"
                  className="text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                  onClick={() => applyLineHeight(lh.value)}
                >
                  {lh.label}
                  <span className="text-xs text-muted-foreground ml-2">{lh.value}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <div
            className="absolute top-0 left-0 px-3 py-2 text-sm text-muted-foreground pointer-events-none select-none"
            aria-hidden
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="px-3 py-2 text-sm outline-none overflow-x-hidden break-words"
          style={{ minHeight, wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}
          onInput={handleInput}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onBlur={saveSelection}
          onPaste={handlePaste}
        />
      </div>
    </div>
  );
};
