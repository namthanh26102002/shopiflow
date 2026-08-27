import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface WinningProduct {
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url: string | null;
  niche: string;
  estimated_total_sales_60d: string;
  estimated_daily_sales: string;
  last_month_revenue: number;
  website_traffic: { month: string; visits: number }[];
  product_performance: Record<string, number>;
  customer_state: string[];
  customer_aspirational_identity: string[];
  creative_videos: string[];
  custom_links: { label: string; url: string }[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type WinningProductInsert = Omit<WinningProduct, 'id' | 'created_at' | 'updated_at'>;

export const useWinningProducts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const productsQuery = useQuery({
    queryKey: ['winning-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winning_products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as WinningProduct[];
    },
  });

  const productQuery = (productId: string) => ({
    queryKey: ['winning-products', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winning_products')
        .select('*')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data as unknown as WinningProduct;
    },
    enabled: !!productId,
  });

  const createProduct = useMutation({
    mutationFn: async (product: Partial<WinningProductInsert>) => {
      const { data, error } = await supabase
        .from('winning_products')
        .insert({ user_id: user!.id, ...product } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winning-products'] });
      toast({ title: 'Product created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WinningProductInsert>) => {
      const { data, error } = await supabase
        .from('winning_products')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winning-products'] });
      toast({ title: 'Product updated' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('winning_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winning-products'] });
      toast({ title: 'Product deleted' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-assets').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('product-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    productQuery,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
  };
};
