import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  Advertorial,
  AdvertorialBlock,
  AdvertorialSettings,
  BlockType,
  createDefaultAdvertorialSettings,
  createBlock,
  generateBlockId,
} from '@/types/advertorial';
import { AdvertorialContext } from '@/contexts/AdvertorialContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const LessonProvider: React.FC<{ lessonId: string; children: React.ReactNode }> = ({ lessonId, children }) => {
  const [advertorial, setAdvertorial] = useState<Advertorial>({
    id: lessonId,
    settings: createDefaultAdvertorialSettings(),
    blocks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();
        if (error) throw error;
        const blocks = (data.blocks as unknown as AdvertorialBlock[]).sort((a, b) => a.order - b.order);
        const settings = { ...createDefaultAdvertorialSettings(), ...(data.settings as any) };
        setAdvertorial({
          id: data.id,
          settings,
          blocks,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
        isLoadedRef.current = true;
      } catch (err) {
        console.error('Error loading lesson:', err);
        toast.error('Failed to load lesson');
      }
    };
    load();
  }, [lessonId]);

  const saveToDb = useCallback(async (advert: Advertorial) => {
    if (!isLoadedRef.current) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ blocks: advert.blocks as any, settings: advert.settings as any })
        .eq('id', lessonId);
      if (error) throw error;
    } catch (err) {
      console.error('Error saving lesson:', err);
    } finally {
      setSaving(false);
    }
  }, [lessonId]);

  const triggerSave = useCallback((advert: Advertorial) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToDb(advert), 2000);
  }, [saveToDb]);

  const updateAdvertorialAndSave = useCallback((updater: (prev: Advertorial) => Advertorial) => {
    setAdvertorial(prev => {
      const next = updater(prev);
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  const addBlock = useCallback((type: BlockType) => {
    const newBlock = createBlock(type, advertorial.blocks.length);
    updateAdvertorialAndSave(prev => ({ ...prev, blocks: [...prev.blocks, newBlock], updatedAt: new Date() }));
    setSelectedBlockId(newBlock.id);
  }, [advertorial.blocks.length, updateAdvertorialAndSave]);

  const updateBlock = useCallback(<T extends AdvertorialBlock>(id: string, updates: Partial<T>) => {
    updateAdvertorialAndSave(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, ...updates } as AdvertorialBlock : b),
      updatedAt: new Date(),
    }));
  }, [updateAdvertorialAndSave]);

  const deleteBlock = useCallback((id: string) => {
    updateAdvertorialAndSave(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })),
      updatedAt: new Date(),
    }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [selectedBlockId, updateAdvertorialAndSave]);

  const duplicateBlock = useCallback((id: string) => {
    updateAdvertorialAndSave(prev => {
      const idx = prev.blocks.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const newBlock = { ...prev.blocks[idx], id: generateBlockId(), order: idx + 1 };
      return { ...prev, blocks: [...prev.blocks.slice(0, idx + 1), newBlock, ...prev.blocks.slice(idx + 1).map(b => ({ ...b, order: b.order + 1 }))], updatedAt: new Date() };
    });
  }, [updateAdvertorialAndSave]);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    updateAdvertorialAndSave(prev => {
      const idx = prev.blocks.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.blocks.length) return prev;
      const blocks = [...prev.blocks];
      const [removed] = blocks.splice(idx, 1);
      blocks.splice(newIdx, 0, removed);
      return { ...prev, blocks: blocks.map((b, i) => ({ ...b, order: i })), updatedAt: new Date() };
    });
  }, [updateAdvertorialAndSave]);

  const reorderBlocks = useCallback((startIndex: number, endIndex: number) => {
    updateAdvertorialAndSave(prev => {
      const blocks = [...prev.blocks];
      const [removed] = blocks.splice(startIndex, 1);
      blocks.splice(endIndex, 0, removed);
      return { ...prev, blocks: blocks.map((b, i) => ({ ...b, order: i })), updatedAt: new Date() };
    });
  }, [updateAdvertorialAndSave]);

  const updateSettings = useCallback((updates: Partial<AdvertorialSettings>) => {
    updateAdvertorialAndSave(prev => ({ ...prev, settings: { ...prev.settings, ...updates }, updatedAt: new Date() }));
  }, [updateAdvertorialAndSave]);

  const resetAdvertorial = useCallback(() => {
    setAdvertorial(prev => ({ ...prev, blocks: [], settings: createDefaultAdvertorialSettings() }));
    setSelectedBlockId(null);
  }, []);

  const publishAdvertorial = useCallback(async () => {}, []);
  const updatePublishedAdvertorial = useCallback(async () => {}, []);

  const value = {
    advertorial,
    selectedBlockId,
    setSelectedBlockId,
    saving,
    isLesson: true,
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    moveBlock,
    reorderBlocks,
    updateSettings,
    resetAdvertorial,
    publishAdvertorial,
    updatePublishedAdvertorial,
  };

  // Provide via AdvertorialContext so all existing advertorial components (BlockEditor, BlocksList, etc.) work
  return (
    <AdvertorialContext.Provider value={value}>
      {children}
    </AdvertorialContext.Provider>
  );
};
