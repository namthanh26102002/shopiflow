import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface OrderProduct {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  image_url?: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  order_date: string;
  products: OrderProduct[];
  subtotal: number;
  shipping: number;
  total: number;
  shipping_method: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  order_id: string;
  description: string;
  event_date: string;
  status_marker: string;
  sort_order: number;
  created_at: string;
}

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const normalizeOrderPayload = <T extends Record<string, any>>(payload: T): T => ({
    ...payload,
    ...(typeof payload.order_number === 'string' ? { order_number: payload.order_number.trim() } : {}),
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Order[];
    },
  });

  const orderQuery = (orderId: string) => ({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data as unknown as Order;
    },
    enabled: !!orderId,
  });

  const timelineQuery = (orderId: string) => ({
    queryKey: ['order-timeline', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_timeline_events')
        .select('*')
        .eq('order_id', orderId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TimelineEvent[];
    },
    enabled: !!orderId,
  });

  // Public (unauthenticated) reads go through restricted views that exclude
  // customer PII and internal fields.
  const publicOrderQuery = (orderId: string) => ({
    queryKey: ['public-order', orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('public_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Order;
    },
    enabled: !!orderId,
  });

  const publicTimelineQuery = (orderId: string) => ({
    queryKey: ['public-order-timeline', orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('public_order_timeline_events')
        .select('*')
        .eq('order_id', orderId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TimelineEvent[];
    },
    enabled: !!orderId,
  });

  const createOrder = useMutation({
    mutationFn: async (order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const payload = normalizeOrderPayload(order);
      const { error } = await supabase.from('orders').insert({ ...payload, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Order created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Order> & { id: string }) => {
      const payload = normalizeOrderPayload(rest);
      const { error } = await supabase.from('orders').update(payload as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', vars.id] });
      toast({ title: 'Order updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Order deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Timeline mutations
  const createTimelineEvent = useMutation({
    mutationFn: async (event: Omit<TimelineEvent, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('order_timeline_events').insert(event as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['order-timeline', vars.order_id] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTimelineEvent = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<TimelineEvent> & { id: string }) => {
      const { error } = await supabase.from('order_timeline_events').update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-timeline'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteTimelineEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('order_timeline_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-timeline'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return {
    orders,
    isLoading,
    orderQuery,
    timelineQuery,
    publicOrderQuery,
    publicTimelineQuery,
    createOrder,
    updateOrder,
    deleteOrder,
    createTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
  };
};
