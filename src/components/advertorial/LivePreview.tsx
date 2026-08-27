import React from 'react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { AdvertorialBlock, FacebookComment, FacebookCommentsBlock, ImportantUpdateBlock } from '@/types/advertorial';
import { cn } from '@/lib/utils';
import { TrendingUp, Flame, Zap, Sparkles, ChevronRight, ThumbsUp, User } from 'lucide-react';

// Block Renderers
const AlertBannerRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'alert-banner' }> }> = ({ block }) => (
  <div 
    className="w-full py-2.5 px-4 text-center text-sm font-medium flex items-center justify-center gap-2"
    style={{ backgroundColor: block.backgroundColor, color: block.textColor }}
  >
    {block.iconSvg && (
      <span
        className="w-4 h-4 flex-shrink-0 inline-flex"
        style={{ color: block.iconColor || block.textColor }}
        dangerouslySetInnerHTML={{ __html: block.iconSvg.replace(/width="[^"]*"/, 'width="16"').replace(/height="[^"]*"/, 'height="16"') }}
      />
    )}
    {block.text}
  </div>
);

const BreadcrumbRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'breadcrumb' }> }> = ({ block }) => (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
    {block.items.map((item, i) => (
      <React.Fragment key={i}>
        <span className="hover:text-foreground cursor-pointer">{item.label}</span>
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

const HeroRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'hero' }>; settings: { headlineFont: string } }> = ({ block, settings }) => (
  <div className="space-y-4">
    <div 
      className="text-2xl sm:text-3xl font-bold text-foreground leading-tight"
      style={{ fontFamily: settings.headlineFont }}
      dangerouslySetInnerHTML={{ __html: block.headline }}
    />
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
    {block.subheadline && (
      <div 
        className="text-base text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: block.subheadline }}
      />
    )}
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-emerald-500">
        {block.authorImageUrl ? (
          <img src={block.authorImageUrl} alt={block.author} className="w-full h-full object-cover" />
        ) : (
          <User className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div>
        {block.author && (
          <p className="text-sm font-medium text-foreground">By {block.author}</p>
        )}
        {block.date && (
          <p className="text-xs text-muted-foreground">{block.date}</p>
        )}
      </div>
    </div>
  </div>
);




const VideoRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'video' }> }> = ({ block }) => (
  <figure className="space-y-2">
    {block.src ? (
      <video 
        src={block.src} 
        autoPlay 
        loop 
        muted 
        playsInline
        className="w-full rounded-lg" 
      />
    ) : (
      <div className="w-full h-48 bg-secondary rounded-lg flex items-center justify-center text-muted-foreground">
        No video
      </div>
    )}
    {block.caption && <figcaption className="text-xs text-muted-foreground text-center">{block.caption}</figcaption>}
  </figure>
);

const TextRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'text' }>; settings: { bodyFont: string } }> = ({ block, settings }) => {
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
    listStyles += `
      .text-block-${block.id} ul { list-style: none; ${block.listBackgroundColor ? '' : 'padding-left: 0;'} }
      .text-block-${block.id} ul li { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
      .text-block-${block.id} ul li::before { content: '${iconChar}'; color: ${iconColor}; font-size: 1.1em !important; font-weight: 700; flex-shrink: 0; line-height: 1.5; }
    `;
  }

  const styleTag = `<style>${listStyles}</style>`;

  return (
    <div 
      className={`prose prose-sm max-w-none text-foreground text-block-${block.id}`}
      style={{ fontFamily, fontSize: `${fontSize}px` }}
      dangerouslySetInnerHTML={{ __html: styleTag + block.content }}
    />
  );
};

const ImageRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'image' }> }> = ({ block }) => (
  <figure className="space-y-2">
    {block.src ? (
      <img src={block.src} alt={block.alt} className="w-full rounded-lg" />
    ) : (
      <div className="w-full h-48 bg-secondary rounded-lg flex items-center justify-center text-muted-foreground">
        No image
      </div>
    )}
    {block.caption && <figcaption className="text-xs text-muted-foreground text-center">{block.caption}</figcaption>}
  </figure>
);

// Single Facebook Comment Component
const FacebookCommentItem: React.FC<{ comment: FacebookComment; isReply?: boolean }> = ({ comment, isReply = false }) => {
  const totalReactions = comment.likeCount + comment.loveCount + comment.hahaCount + comment.wowCount;
  
  return (
    <div className={cn("flex gap-2", isReply && "ml-10")}>
      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {comment.avatarUrl ? (
          <img src={comment.avatarUrl} alt={comment.name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-gray-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#f0f2f5] rounded-2xl px-3 py-2 inline-block max-w-full">
          <p className="font-semibold text-[13px] text-[#050505]">{comment.name}</p>
          <p className="text-[15px] text-[#050505] whitespace-pre-wrap">{comment.text}</p>
        </div>
        {comment.imageUrl && (
          <img 
            src={comment.imageUrl} 
            alt="Comment attachment" 
            className="mt-2 rounded-lg max-w-[280px] max-h-[200px] object-cover"
          />
        )}
        <div className="flex items-center gap-1 mt-1 text-xs">
          <span className="text-[#65676b]">{comment.timestamp}</span>
          <span className="text-[#65676b]">·</span>
          <button className="font-semibold text-[#65676b] hover:underline">Like</button>
          <span className="text-[#65676b]">·</span>
          <button className="font-semibold text-[#65676b] hover:underline">Reply</button>
          {totalReactions > 0 && (
            <>
              <span className="ml-auto flex items-center gap-1 text-[#65676b]">
                <span className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center">
                  <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                </span>
                {totalReactions}
              </span>
            </>
          )}
        </div>
        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <FacebookCommentItem key={reply.id} comment={reply} isReply />
            ))}
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
      <h3 className="text-[15px] font-semibold text-[#050505]">
        Comments ({totalComments})
      </h3>
      <div className="space-y-3">
        {block.comments.map((comment) => (
          <FacebookCommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};

const CTAButtonRenderer: React.FC<{ 
  block: Extract<AdvertorialBlock, { type: 'cta-button' }>; 
  settings: { ctaButtonStyle: string } 
}> = ({ block, settings }) => {
  const radiusMap = { square: 'rounded-none', rounded: 'rounded-lg', pill: 'rounded-full' };
  const sizeMap = { small: 'py-2 px-4 text-sm', medium: 'py-3 px-6 text-base', large: 'py-4 px-8 text-lg' };
  
  return (
    <a
      href={block.url}
      className={cn(
        'inline-flex items-center justify-center font-semibold text-white transition-opacity hover:opacity-90',
        radiusMap[settings.ctaButtonStyle as keyof typeof radiusMap] || 'rounded-lg',
        sizeMap[block.size],
        block.fullWidth && 'w-full'
      )}
      style={{ backgroundColor: block.color }}
    >
      {block.text}
    </a>
  );
};

const ImportantUpdateRenderer: React.FC<{ block: ImportantUpdateBlock }> = ({ block }) => (
  <div className="py-6 px-4" style={{ backgroundColor: block.backgroundColor }}>
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: block.headlineColor }}>
        {block.headline}
      </h2>
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: block.content }} />
        {block.imageSrc && (
          <img src={block.imageSrc} alt="" className="w-full rounded-lg object-cover" />
        )}
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
        className="block w-full text-center py-4 px-6 text-lg font-bold text-white rounded-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: block.buttonColor }}
      >
        {block.buttonText}
      </a>
    </div>
  </div>
);

const DividerRenderer: React.FC<{ block: Extract<AdvertorialBlock, { type: 'divider' }> }> = ({ block }) => {
  if (block.style === 'space') {
    return <div style={{ height: block.height }} />;
  }
  if (block.style === 'dots') {
    return (
      <div className="flex justify-center gap-1.5 py-4" style={{ height: block.height }}>
        <span className="w-1.5 h-1.5 rounded-full bg-border" />
        <span className="w-1.5 h-1.5 rounded-full bg-border" />
        <span className="w-1.5 h-1.5 rounded-full bg-border" />
      </div>
    );
  }
  return <hr className="border-t border-border my-4" style={{ marginTop: block.height / 2, marginBottom: block.height / 2 }} />;
};

// Main Preview Component
export const LivePreview: React.FC = () => {
  const { advertorial, selectedBlockId, setSelectedBlockId } = useAdvertorial();
  const { settings, blocks } = advertorial;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('blockType');
    if (blockType) {
      // Block is added via context in ComponentLibrary
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const radiusMap: Record<string, string> = { square: 'rounded-none', rounded: 'rounded-lg', pill: 'rounded-full' };

  return (
    <div className="h-full flex flex-col bg-secondary/30">
      <div className="flex-1 overflow-auto p-4">
        <div 
          className="mx-auto bg-white shadow-sm rounded-lg transition-all duration-300 max-w-[375px] relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {blocks.length === 0 ? (
            <div className="h-96 flex items-center justify-center border-2 border-dashed border-border rounded-lg m-4">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Drag components here</p>
                <p className="text-xs text-muted-foreground mt-1">or click from the library</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0" style={{ paddingBottom: settings.stickyCtaEnabled ? '72px' : undefined }}>
              {blocks.filter((block) => renderBlock(block, settings) !== null).map((block) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={cn(
                    'relative cursor-pointer transition-all duration-150',
                    selectedBlockId === block.id 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : 'hover:ring-1 hover:ring-primary/30'
                  )}
                >
                  <div className="px-4 py-3">
                    {renderBlock(block, settings)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {settings.footerText && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground border-t border-border mt-4">
              {settings.footerText}
            </div>
          )}

          {/* Sticky Footer CTA Preview */}
          {settings.stickyCtaEnabled && (
            <div className="sticky bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-t border-border">
              <a
                href={settings.stickyCtaUrl || '#'}
                className={cn(
                  'block w-full text-center py-3 px-6 font-semibold text-white transition-opacity hover:opacity-90',
                  radiusMap[settings.ctaButtonStyle] || 'rounded-lg'
                )}
                style={{ backgroundColor: settings.stickyCtaColor || settings.brandColor }}
                onClick={(e) => e.preventDefault()}
              >
                {settings.stickyCtaText || 'Shop Now'}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function renderBlock(block: AdvertorialBlock, settings: { headlineFont: string; bodyFont: string; ctaButtonStyle: string }) {
  switch (block.type) {
    case 'alert-banner':
      return <AlertBannerRenderer block={block} />;
    case 'breadcrumb':
      return <BreadcrumbRenderer block={block} />;
    case 'trending-badge':
      return <TrendingBadgeRenderer block={block} />;
    case 'hero':
      return <HeroRenderer block={block} settings={settings} />;
    case 'text':
      return <TextRenderer block={block} settings={settings} />;
    case 'image':
      return <ImageRenderer block={block} />;
    case 'video':
      return <VideoRenderer block={block} />;
    case 'facebook-comments':
      return <FacebookCommentsRenderer block={block} />;
    case 'cta-button':
      return <CTAButtonRenderer block={block} settings={settings} />;
    case 'important-update':
      return <ImportantUpdateRenderer block={block} />;
    case 'divider':
      return <DividerRenderer block={block} />;
    case 'youtube':
      return (
        <figure className="space-y-2">
          {block.videoId && /^[a-zA-Z0-9_-]{11}$/.test(block.videoId) ? (
            <iframe
              src={`https://www.youtube.com/embed/${block.videoId}`}
              className="w-full aspect-video rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
          {block.caption && <figcaption className="text-xs text-muted-foreground text-center">{block.caption}</figcaption>}
        </figure>
      );
    default:
      return null;
  }
}
