// Rich text for Shopify's richtext and inline_richtext settings.
//
// Shopify accepts only a small set of tags in these settings and rejects a
// theme upload whose settings break the rule, so output is cut down to that
// set on every change rather than trusting the browser's contentEditable HTML.
import React, { useCallback, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

const BLOCK_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li'];
const INLINE_TAGS = ['br', 'strong', 'b', 'em', 'i', 'a'];

export const cleanRichText = (html: string, inline: boolean): string => {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: inline ? INLINE_TAGS : BLOCK_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'target'],
  }).trim();
  if (inline || clean === '') return clean;
  // Shopify wants block-level content; wrap loose text in a paragraph.
  return /^<(p|ul|ol)\b/i.test(clean) ? clean : `<p>${clean}</p>`;
};

interface ThemeRichTextProps {
  value: string;
  onChange: (html: string) => void;
  inline?: boolean;
  id?: string;
}

export const ThemeRichText: React.FC<ThemeRichTextProps> = ({ value, onChange, inline = false, id }) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  // Only overwrite the DOM when the value changed from outside (another
  // selection, a reset); rewriting it while typing would move the caret.
  useEffect(() => {
    if (!ref.current || value === lastEmitted.current) return;
    ref.current.innerHTML = cleanRichText(value ?? '', inline);
  }, [value, inline]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = cleanRichText(ref.current.innerHTML, inline);
    lastEmitted.current = html;
    onChange(html);
  }, [inline, onChange]);

  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    // execCommand is deprecated but still the only cross-browser way to toggle
    // formatting in a contentEditable without a full editor dependency.
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Link address', 'https://');
    if (url && url !== 'https://') run('createLink', url);
  };

  const tools = [
    { label: 'Bold', icon: Bold, action: () => run('bold') },
    { label: 'Italic', icon: Italic, action: () => run('italic') },
    { label: 'Link', icon: Link2, action: addLink },
    ...(inline
      ? []
      : [
          { label: 'Bulleted list', icon: List, action: () => run('insertUnorderedList') },
          { label: 'Numbered list', icon: ListOrdered, action: () => run('insertOrderedList') },
        ]),
  ];

  return (
    <div className="rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
      <div className="flex gap-0.5 border-b border-border px-1 py-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.action}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <tool.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline={!inline}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyDown={(event) => {
          if (inline && event.key === 'Enter') event.preventDefault();
        }}
        className={cn(
          'prose prose-sm max-w-none px-3 py-2 text-sm outline-none [&_p]:my-1',
          inline ? 'min-h-[2.25rem]' : 'min-h-[5rem]',
        )}
      />
    </div>
  );
};
