import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Lesson {
  id: string;
  classroom_id: string;
  name: string;
  blocks: any[];
  settings: any;
  order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export const useLessons = (classroomId: string | undefined, publishedOnly = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['lessons', classroomId, publishedOnly],
    queryFn: async () => {
      if (!classroomId) return [];
      let query = supabase
        .from('lessons')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('order', { ascending: true });

      if (publishedOnly) {
        query = query.eq('published', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!classroomId,
  });

  const createLesson = useMutation({
    mutationFn: async (name: string) => {
      if (!classroomId) throw new Error('No classroom');
      const { data, error } = await supabase
        .from('lessons')
        .insert({ classroom_id: classroomId, name, order: lessons.length })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', classroomId] });
      toast.success('Lesson created');
    },
    onError: () => toast.error('Failed to create lesson'),
  });

  const updateLesson = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lesson> & { id: string }) => {
      const { error } = await supabase.from('lessons').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons', classroomId] }),
    onError: () => toast.error('Failed to update lesson'),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', classroomId] });
      toast.success('Lesson deleted');
    },
    onError: () => toast.error('Failed to delete lesson'),
  });

  return { lessons, isLoading, createLesson, updateLesson, deleteLesson };
};
