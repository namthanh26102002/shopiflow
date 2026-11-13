// Live preview of the theme, rendered in the browser from the real Liquid.
//
// Two stacked iframes take turns: a full re-render loads into the hidden one
// and is swapped in only once it has painted, so the page never flashes
// white. Edits to a single section skip that and patch the visible page.
//
// The iframes are sandboxed without allow-same-origin: theme scripts and any
// HTML a merchant types run in an opaque origin and cannot read the app's
// session. Everything crosses over through postMessage.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useThemeEditor } from '@/contexts/ThemeEditorContext';
import { ThemeRenderer, attrToRef, refToAttr } from '@/lib/shopifyTheme/renderer';
import type { SectionRef } from '@/lib/shopifyTheme/types';
import { cn } from '@/lib/utils';

let sharedRenderer: ThemeRenderer | null = null;
const getRenderer = () => (sharedRenderer ??= new ThemeRenderer());

const RENDER_DELAY_MS = 120;

const selectedRefOf = (selection: ReturnType<typeof useThemeEditor>['selection']): SectionRef | null =>
  selection && selection.kind !== 'theme-settings' ? selection.ref : null;

export const ThemePreview: React.FC<{ className?: string }> = ({ className }) => {
  const { data, revision, lastHint, template, selection, select, selectionFromPreview, device, loading } = useThemeEditor();
  const frames = [useRef<HTMLIFrameElement>(null), useRef<HTMLIFrameElement>(null)];
  const [active, setActive] = useState(0);
  const [docs, setDocs] = useState<[string, string]>(['', '']);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(active);
  activeRef.current = active;
  const scrollRef = useRef(0);
  const readyRef = useRef(false);
  const shownTemplateRef = useRef<string | null>(null);
  const pendingFrameRef = useRef<number | null>(null);
  const renderSeqRef = useRef(0);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const post = useCallback((frameIndex: number, message: Record<string, unknown>) => {
    frames[frameIndex].current?.contentWindow?.postMessage({ target: 'sf-preview', ...message }, '*');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Messages from the preview: ready, scroll position, clicks.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const index = frames.findIndex((frame) => frame.current?.contentWindow === event.source);
      if (index < 0) return;
      const msg = event.data as { source?: string; type?: string; y?: number; ref?: string; block?: string | null };
      if (msg?.source !== 'sf-preview') return;

      if (msg.type === 'ready') {
        if (index === pendingFrameRef.current) {
          pendingFrameRef.current = null;
          readyRef.current = true;
          setActive(index);
          setBusy(false);
        }
      } else if (msg.type === 'scroll' && index === activeRef.current) {
        scrollRef.current = msg.y ?? 0;
      } else if (msg.type === 'select' && index === activeRef.current && msg.ref) {
        const ref = attrToRef(msg.ref);
        if (!ref) return;
        select(msg.block ? { kind: 'block', ref, blockKey: msg.block } : { kind: 'section', ref }, { fromPreview: true });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [select]);

  // Re-render after edits, debounced so typing does not queue a render per key.
  useEffect(() => {
    if (loading) return;
    const seq = ++renderSeqRef.current;
    const timer = setTimeout(async () => {
      const renderer = getRenderer();
      try {
        const sameTemplate = shownTemplateRef.current === template;
        if (lastHint.kind === 'section' && sameTemplate && readyRef.current && pendingFrameRef.current === null) {
          const html = await renderer.renderSectionInPage(data, template, lastHint.ref);
          if (seq !== renderSeqRef.current) return;
          if (html !== null) {
            post(activeRef.current, { type: 'replace-section', ref: refToAttr(lastHint.ref), html });
            setError(null);
            return;
          }
        }

        setBusy(true);
        const selectedRef = selectedRefOf(selectionRef.current);
        const html = await renderer.renderPage(data, template, {
          scrollY: sameTemplate ? scrollRef.current : 0,
          selectedRef: selectedRef ? refToAttr(selectedRef) : null,
        });
        if (seq !== renderSeqRef.current) return;
        if (!sameTemplate) scrollRef.current = 0;
        shownTemplateRef.current = template;
        const target = 1 - activeRef.current;
        pendingFrameRef.current = target;
        setDocs((current) => {
          const next: [string, string] = [...current];
          // A changing nonce makes React set srcdoc even if the HTML repeats.
          next[target] = `${html}<!-- r${seq} -->`;
          return next;
        });
        setError(null);
      } catch (err) {
        console.error('Theme preview failed:', err);
        if (seq === renderSeqRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setBusy(false);
        }
      }
    }, RENDER_DELAY_MS);
    return () => clearTimeout(timer);
    // revision covers every edit; data alone would also fire on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, template, loading]);

  // Outline the selected section in the preview; scroll to it unless the
  // click came from the preview itself.
  useEffect(() => {
    const ref = selectedRefOf(selection);
    post(activeRef.current, { type: 'select', ref: ref ? refToAttr(ref) : null, scroll: !selectionFromPreview });
  }, [selection, selectionFromPreview, active, post]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-muted/40', className)}>
      <div
        className={cn(
          'relative mx-auto h-full transition-[width] duration-200',
          device === 'mobile' ? 'w-[390px] max-w-full py-4' : 'w-full',
        )}
      >
        <div
          className={cn(
            'relative h-full w-full overflow-hidden bg-white',
            device === 'mobile' && 'rounded-[28px] border-[6px] border-foreground/80 shadow-xl',
          )}
        >
          {frames.map((frame, index) => (
            <iframe
              key={index}
              ref={frame}
              title={index === active ? 'Theme preview' : 'Theme preview (loading)'}
              sandbox="allow-scripts"
              srcDoc={docs[index]}
              aria-hidden={index !== active}
              tabIndex={index === active ? 0 : -1}
              className={cn(
                'absolute inset-0 h-full w-full border-0 bg-white',
                index === active ? 'visible z-10' : 'invisible z-0',
              )}
            />
          ))}
        </div>
      </div>

      {busy && (
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Rendering
        </div>
      )}
      {error && (
        <div className="absolute inset-x-3 bottom-3 z-20 rounded-md border border-destructive/40 bg-background p-3 text-xs text-destructive shadow">
          Preview failed: {error}
        </div>
      )}
    </div>
  );
};
