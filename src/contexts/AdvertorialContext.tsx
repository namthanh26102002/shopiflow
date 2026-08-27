// Advertorial Context – provides global state for advertorial page builder
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  Advertorial, 
  AdvertorialBlock, 
  AdvertorialSettings, 
  BlockType,
  createDefaultAdvertorial, 
  createBlock,
  generateBlockId 
} from '@/types/advertorial';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AdvertorialContextType {
  advertorial: Advertorial;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  saving: boolean;
  loading: boolean;
  /** True when the requested advertorial does not exist or is not the user's. */
  notFound: boolean;
  isLesson?: boolean;

  // Block operations
  addBlock: (type: BlockType) => void;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, direction: 'up' | 'down') => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  
  // Settings operations
  updateSettings: (updates: Partial<AdvertorialSettings>) => void;
  
  // Persistence
  resetAdvertorial: () => void;
  publishAdvertorial: () => Promise<void>;
  updatePublishedAdvertorial: () => Promise<void>;
}

export const AdvertorialContext = createContext<AdvertorialContextType | undefined>(undefined);

export const AdvertorialProvider: React.FC<{ children: React.ReactNode; advertorialId: string }> = ({ children, advertorialId }) => {
  const { user } = useAuth();
  const [advertorial, setAdvertorial] = useState<Advertorial>(createDefaultAdvertorial());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dbId, setDbId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadedRef = useRef(false);

  // Load or create advertorial on mount
  useEffect(() => {
    if (!user || !advertorialId) {
      setLoading(false);
      return;
    }

    const loadOrCreate = async () => {
      isLoadedRef.current = false;
      setLoading(true);
      setNotFound(false);
      try {
        // Load the requested advertorial project.
        const { data, error } = await supabase
          .from('advertorials')
          .select('*')
          .eq('id', advertorialId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDbId(data.id);
          setAdvertorial({
            id: data.id,
            settings: data.settings as unknown as AdvertorialSettings,
            blocks: (data.blocks as unknown as AdvertorialBlock[]).sort((a, b) => a.order - b.order),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            publishedUrl: data.published_url || undefined,
          });
          isLoadedRef.current = true;
        } else {
          // Creation happens on the project list, not here.
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error loading advertorial:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrCreate();
  }, [user, advertorialId]);

  // Auto-save with debounce
  const saveToDb = useCallback(async (advert: Advertorial) => {
    if (!dbId || !user || !isLoadedRef.current) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('advertorials')
        .update({
          title: advert.settings.title,
          settings: advert.settings as any,
          blocks: advert.blocks as any,
        })
        .eq('id', dbId);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving advertorial:', err);
    } finally {
      setSaving(false);
    }
  }, [dbId, user]);

  // Debounced save trigger
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
    updateAdvertorialAndSave(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
      updatedAt: new Date(),
    }));
    setSelectedBlockId(newBlock.id);
  }, [advertorial.blocks.length, updateAdvertorialAndSave]);

  const updateBlock = useCallback(<T extends AdvertorialBlock>(id: string, updates: Partial<T>) => {
    updateAdvertorialAndSave(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === id ? { ...block, ...updates } as AdvertorialBlock : block
      ),
      updatedAt: new Date(),
    }));
  }, [updateAdvertorialAndSave]);

  const deleteBlock = useCallback((id: string) => {
    updateAdvertorialAndSave(prev => ({
      ...prev,
      blocks: prev.blocks
        .filter(block => block.id !== id)
        .map((block, index) => ({ ...block, order: index })),
      updatedAt: new Date(),
    }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [selectedBlockId, updateAdvertorialAndSave]);

  const duplicateBlock = useCallback((id: string) => {
    updateAdvertorialAndSave(prev => {
      const blockIndex = prev.blocks.findIndex(b => b.id === id);
      if (blockIndex === -1) return prev;
      const originalBlock = prev.blocks[blockIndex];
      const newBlock = { ...originalBlock, id: generateBlockId(), order: blockIndex + 1 };
      const newBlocks = [
        ...prev.blocks.slice(0, blockIndex + 1),
        newBlock,
        ...prev.blocks.slice(blockIndex + 1).map(b => ({ ...b, order: b.order + 1 }))
      ];
      return { ...prev, blocks: newBlocks, updatedAt: new Date() };
    });
  }, [updateAdvertorialAndSave]);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    updateAdvertorialAndSave(prev => {
      const blockIndex = prev.blocks.findIndex(b => b.id === id);
      if (blockIndex === -1) return prev;
      const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
      if (newIndex < 0 || newIndex >= prev.blocks.length) return prev;
      const newBlocks = [...prev.blocks];
      const [removed] = newBlocks.splice(blockIndex, 1);
      newBlocks.splice(newIndex, 0, removed);
      return { ...prev, blocks: newBlocks.map((block, index) => ({ ...block, order: index })), updatedAt: new Date() };
    });
  }, [updateAdvertorialAndSave]);

  const reorderBlocks = useCallback((startIndex: number, endIndex: number) => {
    updateAdvertorialAndSave(prev => {
      const blocks = [...prev.blocks];
      const [removed] = blocks.splice(startIndex, 1);
      blocks.splice(endIndex, 0, removed);
      return { ...prev, blocks: blocks.map((block, index) => ({ ...block, order: index })), updatedAt: new Date() };
    });
  }, [updateAdvertorialAndSave]);

  const updateSettings = useCallback((updates: Partial<AdvertorialSettings>) => {
    updateAdvertorialAndSave(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
      updatedAt: new Date(),
    }));
  }, [updateAdvertorialAndSave]);

  const resetAdvertorial = useCallback(() => {
    const defaultAdvert = createDefaultAdvertorial();
    setAdvertorial(prev => ({ ...defaultAdvert, id: prev.id }));
    setSelectedBlockId(null);
  }, []);

  const publishAdvertorial = useCallback(async () => {
    if (!dbId) return;
    
    // Save current state first
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await saveToDb(advertorial);

    const baseUrl = window.location.origin;
    const publishedUrl = `${baseUrl}/advertorial/${dbId}`;

    try {
      const { error } = await supabase
        .from('advertorials')
        .update({ published_url: publishedUrl })
        .eq('id', dbId);

      if (error) throw error;

      setAdvertorial(prev => ({ ...prev, publishedUrl }));
      toast.success('Advertorial published successfully!');
      
      await navigator.clipboard.writeText(publishedUrl);
    } catch (err) {
      console.error('Error publishing:', err);
      toast.error('Failed to publish advertorial');
    }
  }, [dbId, advertorial, saveToDb]);

  const updatePublishedAdvertorial = useCallback(async () => {
    if (!dbId) return;
    
    // Save current state
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await saveToDb(advertorial);

    toast.success('Published advertorial updated!');
  }, [dbId, advertorial, saveToDb]);

  return (
    <AdvertorialContext.Provider value={{
      advertorial,
      selectedBlockId,
      setSelectedBlockId,
      saving,
      loading,
      notFound,
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
    }}>
      {children}
    </AdvertorialContext.Provider>
  );
};

export const useAdvertorial = () => {
  const context = useContext(AdvertorialContext);
  if (!context) {
    throw new Error('useAdvertorial must be used within an AdvertorialProvider');
  }
  return context;
};
