import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Classroom {
  id: string;
  user_id: string;
  name: string;
  cover_image_url: string;
  cover_aspect_ratio: string;
  order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export const useClassrooms = (publishedOnly = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: classrooms = [], isLoading } = useQuery({
    queryKey: ['classrooms', publishedOnly],
    queryFn: async () => {
      let query = supabase
        .from('classrooms')
        .select('*')
        .order('order', { ascending: true });
      
      if (publishedOnly) {
        query = query.eq('published', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Classroom[];
    },
  });

  const createClassroom = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('classrooms')
        .insert({ user_id: user.id, name, order: classrooms.length })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Classroom created');
    },
    onError: () => toast.error('Failed to create classroom'),
  });

  const updateClassroom = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Classroom> & { id: string }) => {
      const { error } = await supabase.from('classrooms').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
    onError: () => toast.error('Failed to update classroom'),
  });

  const deleteClassroom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classrooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Classroom deleted');
    },
    onError: () => toast.error('Failed to delete classroom'),
  });

  const reorderClassrooms = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from('classrooms').update({ order: idx }).eq('id', id)
        )
      );
    },
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['classrooms'] });
      const previous = queryClient.getQueriesData({ queryKey: ['classrooms'] });
      queryClient.setQueriesData<Classroom[]>({ queryKey: ['classrooms'] }, (old) => {
        if (!old) return old;
        const map = new Map(old.map((c) => [c.id, c]));
        return orderedIds
          .map((id, idx) => {
            const c = map.get(id);
            return c ? { ...c, order: idx } : null;
          })
          .filter(Boolean) as Classroom[];
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Failed to reorder');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });

  const setGlobalCoverRatio = useMutation({
    mutationFn: async (ratio: string) => {
      const { error } = await supabase
        .from('classrooms')
        .update({ cover_aspect_ratio: ratio })
        .not('id', 'is', null);
      if (error) throw error;
    },
    onMutate: async (ratio: string) => {
      await queryClient.cancelQueries({ queryKey: ['classrooms'] });
      const previous = queryClient.getQueriesData({ queryKey: ['classrooms'] });
      queryClient.setQueriesData<Classroom[]>({ queryKey: ['classrooms'] }, (old) =>
        old ? old.map((c) => ({ ...c, cover_aspect_ratio: ratio })) : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Failed to update cover ratio');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });

  return { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom, reorderClassrooms, setGlobalCoverRatio };
};
