import React, { useState } from 'react';
import { Plus, LayoutTemplate } from 'lucide-react';
import { BlockCard } from './BlockCard';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export const BlocksList: React.FC = () => {
  const { 
    advertorial, 
    selectedBlockId, 
    setSelectedBlockId, 
    deleteBlock, 
    duplicateBlock,
    reorderBlocks 
  } = useAdvertorial();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderBlocks(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Blocks</h3>
        <p className="text-xs text-muted-foreground">
          {advertorial.blocks.length} {advertorial.blocks.length === 1 ? 'block' : 'blocks'}
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {advertorial.blocks.length === 0 ? (
            <div className="builder-panel text-center py-6">
              <div className="w-10 h-10 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center">
                <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No blocks yet</p>
              <p className="text-xs text-muted-foreground">Add components from the left panel</p>
            </div>
          ) : (
            advertorial.blocks.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <BlockCard
                  block={block}
                  index={index}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onDelete={() => deleteBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  isDragging={draggedIndex === index}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
