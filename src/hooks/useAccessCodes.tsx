import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AccessCode {
  id: string;
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  is_active: boolean;
  created_at: string;
  trial_days: number | null;
}

export const useAccessCodes = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching access codes:', error);
      } else {
        setCodes(data || []);
      }
    } catch (err) {
      console.error('Error fetching access codes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const generateCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createCode = async (customCode?: string, trialDays?: number | null): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const code = customCode?.toUpperCase().trim() || generateCode();

    try {
      const { error } = await supabase
        .from('access_codes')
        .insert({
          code,
          created_by: user.id,
          trial_days: trialDays ?? null,
        });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'This code already exists' };
        }
        return { success: false, error: error.message };
      }

      await fetchCodes();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to create code' };
    }
  };

  const toggleCodeStatus = async (codeId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('access_codes')
        .update({ is_active: isActive })
        .eq('id', codeId);

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchCodes();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to update code' };
    }
  };

  const deleteCode = async (codeId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchCodes();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to delete code' };
    }
  };

  return {
    codes,
    loading,
    createCode,
    toggleCodeStatus,
    deleteCode,
    refetch: fetchCodes,
  };
};
