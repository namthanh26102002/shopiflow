// The Shopify stores the signed-in user has connected (no tokens: those stay
// server-side in shopify_store_tokens).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ShopifyStore {
  id: string;
  shop_domain: string;
  shop_name: string | null;
  connected_at: string;
}

export const useShopifyStores = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStores([]);
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, shop_name, connected_at')
      .eq('user_id', userId)
      .order('connected_at', { ascending: false });
    if (loadError) {
      console.error('Error loading Shopify stores:', loadError);
      setError(true);
    } else {
      setStores((data ?? []) as ShopifyStore[]);
      setError(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stores, loading, error, refresh };
};
