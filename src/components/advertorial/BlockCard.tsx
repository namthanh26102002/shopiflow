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

interface BlockCardProps {
  block: AdvertorialBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDragging?: boolean;
}

const blockTypeConfig: Record<BlockType, { icon: LucideIcon; label: string }> = {
  'alert-banner': { icon: AlertTriangle, label: 'Alert Banner' },
  'breadcrumb': { icon: Navigation, label: 'Breadcrumb' },
  'trending-badge': { icon: TrendingUp, label: 'Trending Badge' },
  'hero': { icon: LayoutTemplate, label: 'Hero Section' },
  'text': { icon: Type, label: 'Text Block' },
  'image': { icon: Image, label: 'Image' },
  'video': { icon: Video, label: 'Video' },
  'facebook-comments': { icon: MessageCircle, label: 'FB Comments' },
  'cta-button': { icon: MousePointerClick, label: 'CTA Button' },
  'important-update': { icon: Megaphone, label: 'Important Update' },
  'divider': { icon: Minus, label: 'Divider' },
  'youtube': { icon: Video, label: 'YouTube' },
};

const getBlockPreview = (block: AdvertorialBlock): string => {
  switch (block.type) {
    case 'hero':
      return block.headline?.replace(/<[^>]*>/g, '').slice(0, 30) || 'Untitled';
    case 'text':
      return block.content?.replace(/<[^>]*>/g, '').slice(0, 30) || 'Empty text';
    case 'cta-button':
      return block.text || 'Button';
    case 'facebook-comments':
      return `${block.comments?.length || 0} comments`;
    case 'image':
      return block.alt || block.caption || 'No image';
    case 'video':
      return block.caption || 'No video';
    case 'alert-banner':
      return block.text?.slice(0, 30) || 'Banner';
    case 'important-update':
      return block.headline?.slice(0, 30) || 'Important Update';
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
          <p className="text-sm font-medium text-foreground truncate">{config.label}</p>
          {preview && (
            <p className="text-xs text-muted-foreground truncate">{preview}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
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
        <Button
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
