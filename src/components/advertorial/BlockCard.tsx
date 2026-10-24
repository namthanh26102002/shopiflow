import React from 'react';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { 
  AlertTriangle, 
  Navigation, 
  TrendingUp, 
  LayoutTemplate, 
  Type, 
  Image, 
  Video,
  MessageCircle, 
  MousePointerClick, 
  Minus,
  Megaphone,
  LucideIcon
} from 'lucide-react';
import { AdvertorialBlock, BlockType } from '@/types/advertorial';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT, msg, tr, type MessageKey } from '@/i18n';

interface BlockCardProps {
  block: AdvertorialBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDragging?: boolean;
}

const blockTypeConfig: Record<BlockType, { icon: LucideIcon; label: MessageKey }> = {
  'alert-banner': { icon: AlertTriangle, label: msg('Alert Banner') },
  'breadcrumb': { icon: Navigation, label: msg('Breadcrumb') },
  'trending-badge': { icon: TrendingUp, label: msg('Trending Badge') },
  'hero': { icon: LayoutTemplate, label: msg('Hero Section') },
  'text': { icon: Type, label: msg('Text Block') },
  'image': { icon: Image, label: msg('Image') },
  'video': { icon: Video, label: msg('Video') },
  'facebook-comments': { icon: MessageCircle, label: msg('FB Comments') },
  'cta-button': { icon: MousePointerClick, label: msg('CTA Button') },
  'important-update': { icon: Megaphone, label: msg('Important Update') },
  'divider': { icon: Minus, label: msg('Divider') },
  'youtube': { icon: Video, label: msg('YouTube') },
};

const getBlockPreview = (block: AdvertorialBlock): string => {
  switch (block.type) {
    case 'hero':
      return block.headline?.replace(/<[^>]*>/g, '').slice(0, 30) || tr('Untitled');
    case 'text':
      return block.content?.replace(/<[^>]*>/g, '').slice(0, 30) || tr('Empty text');
    case 'cta-button':
      return block.text || tr('Button');
    case 'facebook-comments':
      return tr('{count} comments', { count: (block.comments || []).reduce((n, c) => n + 1 + (c.replies?.length || 0), 0) });
    case 'image':
      return block.alt || block.caption || tr('No image');
    case 'video':
      return block.caption || tr('No video');
    case 'alert-banner':
      return block.text?.slice(0, 30) || tr('Banner');
    case 'important-update':
      return block.headline?.slice(0, 30) || tr('Important Update');
    default:
      return '';
  }
};

export const BlockCard: React.FC<BlockCardProps> = ({
  block,
  index,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  isDragging,
}) => {
  const t = useT();
  const config = blockTypeConfig[block.type];
  if (!config) return null;
  const Icon = config.icon;
  const preview = getBlockPreview(block);

  return (
    <div
      className={cn(
        'block-card group flex items-center gap-2',
        isSelected && 'selected',
        isDragging && 'dragging'
      )}
      onClick={onSelect}
    >
      <div className="drag-handle">
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{t(config.label)}</p>
          {preview && (
            <p className="text-xs text-muted-foreground truncate">{preview}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button aria-label={t('Duplicate block')}
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="w-3 h-3" />
        </Button>
        <Button aria-label={t('Delete block')}
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
