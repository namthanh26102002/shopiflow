import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Advertorial,
  AdvertorialBlock,
  AdvertorialSettings,
  FacebookComment,
  FacebookCommentsBlock,
  ImportantUpdateBlock,
} from '@/types/advertorial';
import { cn } from '@/lib/utils';
import { sanitizeHtml, sanitizeSvg } from '@/lib/sanitize';
import { TrendingUp, Flame, Zap, Sparkles, ChevronRight, ThumbsUp, User } from 'lucide-react';
import { getAttribution } from '@/lib/attribution';

// --- Block Renderers (public-facing, no interactivity) ---

const AlertBannerRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'alert-banner' }> }> = ({ block }) => (
  <div className="w-full py-2.5 px-4 text-center text-sm font-medium flex items-center justify-center gap-2" style={{ backgroundColor: block.backgroundColor, color: block.textColor }}>
    {block.iconSvg && (
      <span
        className="w-4 h-4 flex-shrink-0 inline-flex"
        style={{ color: block.iconColor || block.textColor }}
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(block.iconSvg.replace(/width="[^"]*"/, 'width="16"').replace(/height="[^"]*"/, 'height="16"')) }}
      />
    )}
    {block.text}
  </div>
);

const BreadcrumbRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'breadcrumb' }> }> = ({ block }) => (
  <div className="flex items-center gap-1.5 text-xs text-gray-500 py-2">
    {block.items.map((item, i) => (
      <React.Fragment key={i}>
        <span>{item.label}</span>
        {i < block.items.length - 1 && <ChevronRight className="w-3 h-3" />}
      </React.Fragment>
    ))}
  </div>
);

const TrendingBadgeRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'trending-badge' }> }> = ({ block }) => {
  const icons = { trending: TrendingUp, viral: Flame, hot: Zap, new: Sparkles };
  const Icon = icons[block.icon];
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
      <Icon className="w-3.5 h-3.5" />
      {block.text}
    </div>
  );
};

const HeroRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'hero' }>; settings: AdvertorialSettings }> = ({ block, settings }) => (
  <div className="space-y-4">
    <div className="text-2xl sm:text-3xl font-bold leading-tight" style={{ fontFamily: settings.headlineFont }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.headline) }} />
    {block.mediaType === 'video' && block.videoSrc && (
      <div className="rounded-lg overflow-hidden">
        <video src={block.videoSrc} autoPlay loop muted playsInline className="w-full object-cover" />
      </div>
    )}
    {block.mediaType === 'image' && block.imageSrc && (
      <div className="rounded-lg overflow-hidden">
        <img src={block.imageSrc} alt={block.imageAlt} className="w-full object-cover" />
      </div>
    )}
    {block.subheadline && <div className="text-base text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.subheadline) }} />}
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-emerald-500">
        {block.authorImageUrl ? <img src={block.authorImageUrl} alt={block.author} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-400" />}
      </div>
      <div>
        {block.author && <p className="text-sm font-medium">By {block.author}</p>}
        {block.date && <p className="text-xs text-gray-500">{block.date}</p>}
      </div>
    </div>
  </div>
);




const VideoRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'video' }> }> = ({ block }) => (
  <figure className="space-y-2">
    {block.src ? <video src={block.src} autoPlay loop muted playsInline className="w-full rounded-lg" /> : null}
    {block.caption && <figcaption className="text-xs text-gray-500 text-center">{block.caption}</figcaption>}
  </figure>
);

const TextRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'text' }>; settings: AdvertorialSettings }> = ({ block, settings }) => {
  const iconType = block.listIconType || 'default';
  const iconColor = block.listIconColor || '#000000';
  const fontSize = block.fontSize || 16;
  const fontFamily = block.fontFamily || settings.bodyFont;
  let listStyles = '';
  // Force font overrides on all child elements to beat inline styles from pasted content
  listStyles += `.text-block-${block.id}, .text-block-${block.id} * { font-size: ${fontSize}px !important; font-family: ${fontFamily} !important; }`;
  if (block.listBackgroundColor) {
    listStyles += `.text-block-${block.id} ul { background-color: ${block.listBackgroundColor}; padding: 16px; border-radius: 8px; list-style-position: inside; }`;
  }
  if (iconType !== 'default') {
    const iconChar = iconType === 'tick' ? '\\2713' : '\\2715';
    listStyles += `.text-block-${block.id} ul { list-style: none; } .text-block-${block.id} ul li { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; } .text-block-${block.id} ul li::before { content: '${iconChar}'; color: ${iconColor}; font-size: 1.1em !important; font-weight: 700; flex-shrink: 0; line-height: 1.5; }`;
  }
  const styleTag = `<style>${listStyles}</style>`;
  return (
    <div className={`prose prose-sm max-w-none text-block-${block.id}`} style={{ fontFamily, fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: styleTag + sanitizeHtml(block.content) }} />
  );
};

const ImageRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'image' }> }> = ({ block }) => (
  <figure className="space-y-2">
    {block.src && <img src={block.src} alt={block.alt} className="w-full rounded-lg" />}
    {block.caption && <figcaption className="text-xs text-gray-500 text-center">{block.caption}</figcaption>}
  </figure>
);

const FacebookCommentItem: React.FC<{ comment: FacebookComment; isReply?: boolean }> = ({ comment, isReply = false }) => {
  const totalReactions = comment.likeCount + comment.loveCount + comment.hahaCount + comment.wowCount;
  return (
    <div className={cn("flex gap-2", isReply && "ml-10")}>
      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {comment.avatarUrl ? <img src={comment.avatarUrl} alt={comment.name} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-gray-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#f0f2f5] rounded-2xl px-3 py-2 inline-block max-w-full">
          <p className="font-semibold text-[13px] text-[#050505]">{comment.name}</p>
          <p className="text-[15px] text-[#050505] whitespace-pre-wrap">{comment.text}</p>
        </div>
        {comment.imageUrl && <img src={comment.imageUrl} alt="" className="mt-2 rounded-lg max-w-[280px] max-h-[200px] object-cover" />}
        <div className="flex items-center gap-1 mt-1 text-xs">
          <span className="text-[#65676b]">{comment.timestamp}</span>
          <span className="text-[#65676b]">·</span>
          <span className="font-semibold text-[#65676b]">Like</span>
          <span className="text-[#65676b]">·</span>
          <span className="font-semibold text-[#65676b]">Reply</span>
          {totalReactions > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[#65676b]">
              <span className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center">
                <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
              </span>
              {totalReactions}
            </span>
          )}
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => <FacebookCommentItem key={reply.id} comment={reply} isReply />)}
          </div>
        )}
      </div>
    </div>
  );
};

const FacebookCommentsRenderer: React.FC<{ block: FacebookCommentsBlock }> = ({ block }) => {
  const totalComments = block.comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
  return (
    <div className="border-t border-[#dddfe2] pt-3 space-y-3">
      <h3 className="text-[15px] font-semibold text-[#050505]">Comments ({totalComments})</h3>
      <div className="space-y-3">{block.comments.map((c) => <FacebookCommentItem key={c.id} comment={c} />)}</div>
    </div>
  );
};

const CTAButtonRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'cta-button' }>; settings: AdvertorialSettings; onCtaClick?: (blockId: string, url: string) => void }> = ({ block, settings, onCtaClick }) => {
  const radiusMap = { square: 'rounded-none', rounded: 'rounded-lg', pill: 'rounded-full' };
  const sizeMap = { small: 'py-2 px-4 text-sm', medium: 'py-3 px-6 text-base', large: 'py-4 px-8 text-lg' };
  return (
    <a
      href={block.url}
      onClick={() => onCtaClick?.(block.id, block.url)}
      className={cn('inline-flex items-center justify-center font-semibold text-white transition-opacity hover:opacity-90', radiusMap[settings.ctaButtonStyle] || 'rounded-lg', sizeMap[block.size], block.fullWidth && 'w-full')}
      style={{ backgroundColor: block.color }}
    >
      {block.text}
    </a>
  );
};

const ImportantUpdateRenderer: React.FC<{ block: ImportantUpdateBlock; onCtaClick?: (blockId: string, url: string) => void }> = ({ block, onCtaClick }) => (
  <div className="py-6 px-4" style={{ backgroundColor: block.backgroundColor }}>
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: block.headlineColor }}>{block.headline}</h2>
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />
        {block.imageSrc && <img src={block.imageSrc} alt="" className="w-full rounded-lg object-cover" />}
      </div>
      {block.trustBadges.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-4">
          {block.trustBadges.map((badge, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <img src={badge.src} alt={badge.label} className="w-16 h-16 object-contain" />
              <span className="text-xs font-semibold text-center leading-tight max-w-[80px]">{badge.label}</span>
            </div>
          ))}
        </div>
      )}
      <a
        href={block.buttonUrl}
        onClick={() => onCtaClick?.(block.id, block.buttonUrl)}
        className="block w-full text-center py-4 px-6 text-lg font-bold text-white rounded-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: block.buttonColor }}
      >
        {block.buttonText}
      </a>
    </div>
  </div>
);

const DividerRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'divider' }> }> = ({ block }) => {
  if (block.style === 'space') return <div style={{ height: block.height }} />;
  if (block.style === 'dots') return (
    <div className="flex justify-center gap-1.5 py-4" style={{ height: block.height }}>
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
    </div>
  );
  return <hr className="border-t border-gray-200 my-4" style={{ marginTop: block.height / 2, marginBottom: block.height / 2 }} />;
};

function renderBlock(block: AdvertorialBlock, settings: AdvertorialSettings, onCtaClick?: (blockId: string, url: string) => void) {
  switch (block.type) {
    case 'alert-banner': return <AlertBannerRenderer block={block} />;
    case 'breadcrumb': return <BreadcrumbRenderer block={block} />;
    case 'trending-badge': return <TrendingBadgeRenderer block={block} />;
    case 'hero': return <HeroRenderer block={block} settings={settings} />;
    case 'text': return <TextRenderer block={block} settings={settings} />;
    case 'image': return <ImageRenderer block={block} />;
    case 'video': return <VideoRenderer block={block} />;
    case 'facebook-comments': return <FacebookCommentsRenderer block={block} />;
    case 'cta-button': return <CTAButtonRenderer block={block} settings={settings} onCtaClick={onCtaClick} />;
    case 'important-update': return <ImportantUpdateRenderer block={block} onCtaClick={onCtaClick} />;
    case 'divider': return <DividerRenderer block={block} />;
    default: return null;
  }
}

// --- Main Public Page ---

const AdvertorialPublic: React.FC<{ overrideId?: string }> = ({ overrideId }) => {
  const { advertorialId: paramId } = useParams<{ advertorialId: string }>();
  const advertorialId = overrideId || paramId;
  const navigate = useNavigate();
  const [advertorial, setAdvertorial] = useState<{ settings: AdvertorialSettings; blocks: AdvertorialBlock[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const pageLoadTimeRef = useRef(Date.now());
  const attributionRef = useRef(getAttribution());
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());
  const videoMilestonesRef = useRef<Record<string, Set<number>>>({});
  const blockVisibleMsRef = useRef<Record<string, number>>({});
  const blockEnterRef = useRef<Record<string, number>>({});
  const blockSentRef = useRef(false);

  // Track CTA click
  const handleCtaClick = useCallback((blockId: string, targetUrl: string) => {
    if (!advertorialId) return;
    supabase.from('advertorial_events').insert({
      advertorial_id: advertorialId,
      session_id: sessionIdRef.current,
      event_type: 'cta_click',
      block_id: blockId,
      target_url: targetUrl,
      time_on_page_ms: Date.now() - pageLoadTimeRef.current,
      ...attributionRef.current,
    }).then(() => {});
  }, [advertorialId]);

  // Fire-and-forget event insert
  const track = useCallback((row: Record<string, unknown>) => {
    if (!advertorialId) return;
    supabase.from('advertorial_events').insert({
      advertorial_id: advertorialId,
      session_id: sessionIdRef.current,
      ...attributionRef.current,
      ...row,
    } as never).then(() => {});
  }, [advertorialId]);

  useEffect(() => {
    const load = async () => {
      if (!advertorialId) { setError('Advertorial not found'); setLoading(false); return; }
      try {
        const { data, error: fetchError } = await supabase
          .from('advertorials')
          .select('id, title, settings, blocks, published_url, created_at, updated_at')
          .eq('id', advertorialId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data || !data.published_url) {
          setError('This advertorial is not published');
          setLoading(false);
          return;
        }

        const loadedSettings = data.settings as unknown as AdvertorialSettings;
        const loadedBlocks = (data.blocks as unknown as AdvertorialBlock[]).sort((a, b) => a.order - b.order);

        setAdvertorial({ settings: loadedSettings, blocks: loadedBlocks });

        if (loadedSettings.title) document.title = loadedSettings.title;

        if (loadedSettings.faviconUrl) {
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
          link.href = loadedSettings.faviconUrl;
        }

        if (loadedSettings.metaDescription) {
          let meta = document.querySelector("meta[name='description']") as HTMLMetaElement;
          if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
          meta.content = loadedSettings.metaDescription;
        }
      } catch (err) {
        console.error('Error loading advertorial:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [advertorialId]);

  // Track page_view on mount and page_exit on leave
  useEffect(() => {
    if (!advertorialId) return;

    // Page view
    // Resolve coarse location (country + region only) first, then log the view
    supabase.functions
      .invoke('track-visit')
      .then(({ data: geo }) => {
        const g = geo as { country?: string | null; region?: string | null } | null;
        return supabase.from('advertorial_events').insert({
          advertorial_id: advertorialId,
          session_id: sessionIdRef.current,
          event_type: 'page_view',
          time_on_page_ms: 0,
          ...attributionRef.current,
          country: g?.country ?? null,
          region: g?.region ?? null,
        });
      })
      .catch(() => {
        supabase.from('advertorial_events').insert({
          advertorial_id: advertorialId,
          session_id: sessionIdRef.current,
          event_type: 'page_view',
          time_on_page_ms: 0,
          ...attributionRef.current,
        }).then(() => {});
      });

    // Page exit via sendBeacon
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Use fetch with keepalive for page_exit (supports custom headers unlike sendBeacon)
    const handleVisibilityChangeWithHeaders = () => {
      if (document.visibilityState === 'hidden') {
        const timeOnPage = Date.now() - pageLoadTimeRef.current;
        const payload = JSON.stringify({
          advertorial_id: advertorialId,
          session_id: sessionIdRef.current,
          event_type: 'page_exit',
          time_on_page_ms: timeOnPage,
        });

        fetch(`${supabaseUrl}/rest/v1/advertorial_events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Prefer': 'return=minimal',
          },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChangeWithHeaders);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChangeWithHeaders);
  }, [advertorialId]);

  // Scroll depth, per-block visibility time and video engagement
  useEffect(() => {
    if (!advertorial || !advertorialId) return;

    /* ---- scroll depth milestones ---- */
    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const percent = scrollable > 0
        ? Math.min(100, Math.round(((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100))
        : 100;
      [25, 50, 75, 100].forEach(m => {
        if (percent >= m && !scrollMilestonesRef.current.has(m)) {
          scrollMilestonesRef.current.add(m);
          track({
            event_type: 'scroll_depth',
            percent: m,
            time_on_page_ms: Date.now() - pageLoadTimeRef.current,
          });
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    /* ---- per-block visibility time ---- */
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const id = (entry.target as HTMLElement).dataset.blockId;
          if (!id) return;
          if (entry.isIntersecting) {
            blockEnterRef.current[id] ||= Date.now();
          } else if (blockEnterRef.current[id]) {
            blockVisibleMsRef.current[id] =
              (blockVisibleMsRef.current[id] || 0) + (Date.now() - blockEnterRef.current[id]);
            delete blockEnterRef.current[id];
          }
        });
      },
      { threshold: 0.5 }
    );
    const blockEls = contentRef.current?.querySelectorAll<HTMLElement>('[data-block-id]') || [];
    blockEls.forEach(el => observer.observe(el));

    const flushBlockTimes = () => {
      if (blockSentRef.current) return;
      const now = Date.now();
      Object.entries(blockEnterRef.current).forEach(([id, start]) => {
        blockVisibleMsRef.current[id] = (blockVisibleMsRef.current[id] || 0) + (now - start);
      });
      blockEnterRef.current = {};
      const rows = Object.entries(blockVisibleMsRef.current)
        .filter(([, ms]) => ms > 500)
        .map(([block_id, ms]) => ({
          advertorial_id: advertorialId,
          session_id: sessionIdRef.current,
          event_type: 'block_view',
          block_id,
          time_on_page_ms: Math.round(ms),
          ...attributionRef.current,
        }));
      if (rows.length === 0) return;
      blockSentRef.current = true;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      fetch(`${supabaseUrl}/rest/v1/advertorial_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(rows),
        keepalive: true,
      }).catch(() => {});
    };

    const onHide = () => { if (document.visibilityState === 'hidden') flushBlockTimes(); };
    document.addEventListener('visibilitychange', onHide);

    /* ---- video engagement ---- */
    const videos = Array.from(contentRef.current?.querySelectorAll('video') || []);
    const cleanups: Array<() => void> = [];
    videos.forEach(video => {
      const blockId = video.closest('[data-block-id]')?.getAttribute('data-block-id') || null;
      const key = blockId || 'video';
      videoMilestonesRef.current[key] ||= new Set();

      const onPlay = () => {
        if (videoMilestonesRef.current[key].has(0)) return;
        videoMilestonesRef.current[key].add(0);
        track({ event_type: 'video_play', block_id: blockId, percent: 0 });
      };
      const onTimeUpdate = () => {
        if (!video.duration || !isFinite(video.duration)) return;
        const pct = Math.round((video.currentTime / video.duration) * 100);
        [25, 50, 75, 100].forEach(m => {
          if (pct >= m && !videoMilestonesRef.current[key].has(m)) {
            videoMilestonesRef.current[key].add(m);
            track({
              event_type: 'video_progress',
              block_id: blockId,
              percent: m,
              time_on_page_ms: Math.round(video.currentTime * 1000),
            });
          }
        });
      };
      video.addEventListener('play', onPlay);
      video.addEventListener('timeupdate', onTimeUpdate);
      cleanups.push(() => {
        video.removeEventListener('play', onPlay);
        video.removeEventListener('timeupdate', onTimeUpdate);
      });

      // Autoplaying videos never fire a user "play" gesture, so count the first frame
      if (!video.paused) onPlay();
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', onHide);
      observer.disconnect();
      cleanups.forEach(fn => fn());
      flushBlockTimes();
    };
  }, [advertorial, advertorialId, track]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !advertorial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">{error || 'Page not found'}</p>
          <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:underline">Go back home</button>
        </div>
      </div>
    );
  }

  const { settings, blocks } = advertorial;
  const radiusMap: Record<string, string> = { square: 'rounded-none', rounded: 'rounded-lg', pill: 'rounded-full' };

  return (
    <div className="min-h-screen bg-white">
      <div ref={contentRef} className="max-w-[680px] mx-auto" style={{ paddingBottom: settings.stickyCtaEnabled ? '72px' : undefined }}>
        {blocks.filter((block) => renderBlock(block, settings, handleCtaClick) !== null).map((block) => (
          <div key={block.id} data-block-id={block.id} className="px-4 py-3">
            {renderBlock(block, settings, handleCtaClick)}
          </div>
        ))}
        {settings.footerText && (
          <div className="px-4 py-6 text-center text-xs text-gray-500 border-t border-gray-200 mt-4">
            {settings.footerText}
          </div>
        )}
      </div>

      {/* Sticky Footer CTA */}
      {settings.stickyCtaEnabled && settings.stickyCtaText && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3">
          <div className="max-w-[680px] mx-auto">
            <a
              href={settings.stickyCtaUrl || '#'}
              onClick={() => handleCtaClick('sticky-cta', settings.stickyCtaUrl || '#')}
              className={cn(
                'block w-full text-center py-3.5 px-6 font-semibold text-white transition-opacity hover:opacity-90',
                radiusMap[settings.ctaButtonStyle] || 'rounded-lg'
              )}
              style={{ backgroundColor: settings.stickyCtaColor || settings.brandColor }}
            >
              {settings.stickyCtaText}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertorialPublic;
