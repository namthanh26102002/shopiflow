// Advertorial Page Builder Types

export type BlockType = 
  | 'alert-banner'
  | 'breadcrumb'
  | 'trending-badge'
  | 'hero'
  | 'text'
  | 'image'
  | 'video'
  | 'facebook-comments'
  | 'cta-button'
  | 'important-update'
  | 'divider'
  | 'youtube';

// Facebook Comment types
export interface FacebookComment {
  id: string;
  avatarUrl: string;
  name: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
  likeCount: number;
  loveCount: number;
  hahaCount: number;
  wowCount: number;
  replies?: FacebookComment[];
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
}

export interface AlertBannerBlock extends BaseBlock {
  type: 'alert-banner';
  text: string;
  backgroundColor: string;
  textColor: string;
  iconSvg: string;
  iconColor: string;
}

export interface BreadcrumbBlock extends BaseBlock {
  type: 'breadcrumb';
  items: { label: string; url?: string }[];
}

export interface TrendingBadgeBlock extends BaseBlock {
  type: 'trending-badge';
  text: string;
  icon: 'trending' | 'viral' | 'hot' | 'new';
}

export interface HeroBlock extends BaseBlock {
  type: 'hero';
  headline: string; // HTML content from rich text editor
  subheadline: string; // HTML content from rich text editor
  authorImageUrl: string;
  author: string;
  date: string;
  mediaType: 'none' | 'video' | 'image';
  videoSrc: string;
  imageSrc: string;
  imageAlt: string;
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  src: string;
  caption: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string; // HTML content from rich text editor
  listBackgroundColor: string; // Background color for bullet list sections
  listIconType: 'default' | 'tick' | 'x'; // Bullet icon style
  listIconColor: string; // Color for custom bullet icons
  fontSize: number; // Font size in pixels
  fontFamily: string; // Font family override
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
  caption: string;
}

export interface FacebookCommentsBlock extends BaseBlock {
  type: 'facebook-comments';
  comments: FacebookComment[];
}

export interface CTAButtonBlock extends BaseBlock {
  type: 'cta-button';
  text: string;
  url: string;
  color: string;
  size: 'small' | 'medium' | 'large';
  fullWidth: boolean;
}

export interface ImportantUpdateBlock extends BaseBlock {
  type: 'important-update';
  headline: string;
  headlineColor: string;
  content: string; // HTML content for rich text with colors
  imageSrc: string;
  trustBadges: { src: string; label: string }[];
  buttonText: string;
  buttonUrl: string;
  buttonColor: string;
  backgroundColor: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  style: 'line' | 'space' | 'dots';
  height: number;
}

export interface YouTubeBlock extends BaseBlock {
  type: 'youtube';
  videoId: string;
  caption: string;
}

export type AdvertorialBlock =
  | AlertBannerBlock
  | BreadcrumbBlock
  | TrendingBadgeBlock
  | HeroBlock
  | TextBlock
  | ImageBlock
  | VideoBlock
  | FacebookCommentsBlock
  | CTAButtonBlock
  | ImportantUpdateBlock
  | DividerBlock
  | YouTubeBlock;

export interface AdvertorialSettings {
  title: string;
  metaDescription: string;
  faviconUrl: string;
  customDomain: string;
  brandColor: string;
  headlineFont: string;
  bodyFont: string;
  ctaButtonStyle: 'rounded' | 'square' | 'pill';
  ctaButtonSize: 'small' | 'medium' | 'large';
  footerText: string;
  stickyCtaEnabled: boolean;
  stickyCtaText: string;
  stickyCtaUrl: string;
  stickyCtaColor: string;
}

export interface Advertorial {
  id: string;
  settings: AdvertorialSettings;
  blocks: AdvertorialBlock[];
  createdAt: Date;
  updatedAt: Date;
  publishedUrl?: string;
}

// Helper function to generate IDs
export const generateBlockId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// Default settings
export const createDefaultAdvertorialSettings = (): AdvertorialSettings => ({
  title: 'Untitled Advertorial',
  metaDescription: '',
  faviconUrl: '',
  customDomain: '',
  brandColor: '#0066FF',
  headlineFont: 'system-ui',
  bodyFont: 'system-ui',
  ctaButtonStyle: 'rounded',
  ctaButtonSize: 'medium',
  footerText: '',
  stickyCtaEnabled: false,
  stickyCtaText: 'Shop Now',
  stickyCtaUrl: '#',
  stickyCtaColor: '#0066FF',
});

// Default advertorial
export const createDefaultAdvertorial = (): Advertorial => ({
  id: generateBlockId(),
  settings: createDefaultAdvertorialSettings(),
  blocks: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Block factories
export const createBlock = (type: BlockType, order: number): AdvertorialBlock => {
  const base = { id: generateBlockId(), order };

  switch (type) {
    case 'alert-banner':
      return { ...base, type, text: '🔥 Limited Time Offer - 50% Off Today!', backgroundColor: '#FEF3C7', textColor: '#92400E', iconSvg: '', iconColor: '#92400E' };
    case 'breadcrumb':
      return { ...base, type, items: [{ label: 'Home' }, { label: 'Health' }, { label: 'Article' }] };
    case 'trending-badge':
      return { ...base, type, text: 'Trending Now', icon: 'trending' };
    case 'hero':
      return { ...base, type, headline: '<p>Your Compelling Headline Here</p>', subheadline: '<p>A powerful subheadline that captures attention</p>', authorImageUrl: '', author: 'Dr. Jessica Thompson', date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), mediaType: 'none' as const, videoSrc: '', imageSrc: '', imageAlt: '' };
    case 'text':
      return { ...base, type, content: '<p>Start writing your content here...</p>', listBackgroundColor: '', listIconType: 'default', listIconColor: '#000000', fontSize: 16, fontFamily: '' };
    case 'image':
      return { ...base, type, src: '', alt: '', caption: '' };
    case 'video':
      return { ...base, type, src: '', caption: '' };
    case 'facebook-comments':
      return { 
        ...base, 
        type, 
        comments: [
          {
            id: generateBlockId(),
            avatarUrl: '',
            name: 'Sarah Johnson',
            text: 'This is amazing! Just ordered mine 🙌',
            timestamp: '2 d',
            likeCount: 12,
            loveCount: 3,
            hahaCount: 0,
            wowCount: 1,
            replies: []
          },
          {
            id: generateBlockId(),
            avatarUrl: '',
            name: 'Mike Thompson',
            text: 'Does it really work? Thinking about trying it',
            timestamp: '1 d',
            likeCount: 5,
            loveCount: 0,
            hahaCount: 0,
            wowCount: 0,
            replies: [
              {
                id: generateBlockId(),
                avatarUrl: '',
                name: 'Sarah Johnson',
                text: 'Yes! Best purchase I ever made 💯',
                timestamp: '1 d',
                likeCount: 8,
                loveCount: 2,
                hahaCount: 0,
                wowCount: 0,
              }
            ]
          }
        ]
      };
    case 'cta-button':
      return { ...base, type, text: 'Shop Now', url: '#', color: '#0066FF', size: 'large', fullWidth: true };
    case 'important-update':
      return { 
        ...base, 
        type, 
        headline: 'IMPORTANT UPDATE!', 
        headlineColor: '#FF0000',
        content: '<p>Your important message here...</p>', 
        imageSrc: '', 
        trustBadges: [],
        buttonText: 'Apply Discount And Check Availability',
        buttonUrl: '#',
        buttonColor: '#22C55E',
        backgroundColor: '#FEFCE8',
      };
    case 'divider':
      return { ...base, type, style: 'line', height: 24 };
    case 'youtube':
      return { ...base, type, videoId: '', caption: '' };
  }
};
