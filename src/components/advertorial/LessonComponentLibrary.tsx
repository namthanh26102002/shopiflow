import React from 'react';
import { 
  Type, 
  Image, 
  Video,
  Minus,
  LayoutTemplate,
  Youtube
} from 'lucide-react';
import { BlockType } from '@/types/advertorial';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BlockOption {
  type: BlockType;
  label: string;
  icon: React.ElementType;
  category: 'header' | 'content';
}

const blockOptions: BlockOption[] = [
  { type: 'hero', label: 'Hero Section', icon: LayoutTemplate, category: 'header' },
  { type: 'text', label: 'Text Block', icon: Type, category: 'content' },
  { type: 'image', label: 'Image', icon: Image, category: 'content' },
  { type: 'video', label: 'Video', icon: Video, category: 'content' },
  { type: 'youtube', label: 'YouTube', icon: Youtube, category: 'content' },
  { type: 'divider', label: 'Divider', icon: Minus, category: 'content' },
];

const categoryLabels = {
  header: 'Header',
  content: 'Content',
};

export const LessonComponentLibrary: React.FC = () => {
  const { addBlock } = useAdvertorial();

  const groupedBlocks = blockOptions.reduce((acc, block) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, BlockOption[]>);

  const handleDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Components</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Drag to add or click</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {(['header', 'content'] as const).map((category) => (
            <div key={category}>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {categoryLabels[category]}
              </h3>
              <div className="flex flex-col gap-1">
                {groupedBlocks[category]?.map((block) => (
                  <button
                    key={block.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.type)}
                    onClick={() => addBlock(block.type)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-2 rounded-lg',
                      'border border-border bg-card hover:bg-secondary/50',
                      'transition-all duration-150 cursor-grab active:cursor-grabbing',
                      'hover:border-primary/30 hover:shadow-sm'
                    )}
                  >
                    <block.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground">{block.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
