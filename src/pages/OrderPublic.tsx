import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrderProductsTable } from '@/components/orders/OrderProductsTable';

import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Processing: 'bg-blue-100 text-blue-700 border-blue-200',
  Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const OrderPublic: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-public', orderNumber],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('public_orders')
        .select('*')
        .eq('order_number', orderNumber?.trim() || '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderNumber,
    refetchInterval: 60000,
  });

  const { data: allTimelineEvents = [] } = useQuery({
    queryKey: ['order-timeline-public', order?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('public_order_timeline_events')
        .select('*')
        .eq('order_id', order!.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        statusMarker: e.status_marker,
      }));
    },
    enabled: !!order?.id,
    refetchInterval: 60000,
  });

  // Only show events whose scheduled time has passed
  const timelineEvents = allTimelineEvents.filter(
    (e: any) => new Date(e.event_date) <= new Date()
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const products = (order.products || []) as any[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-lg sm:text-xl font-bold">{order.order_number || 'Order'}</h1>
          <Badge className={statusColor[order.status] || 'bg-secondary text-secondary-foreground'}>{order.status}</Badge>
          <span className="text-xs sm:text-sm text-muted-foreground w-full sm:w-auto">{format(new Date(order.order_date), 'MMM dd, yyyy · hh:mm a')}</span>
        </div>

        <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Order Details</h3>
              <OrderProductsTable products={products} onChange={() => {}} />
            </div>

            <OrderTimeline events={timelineEvents} editable={false} />
        </div>
      </div>
    </div>
  );
};

export default OrderPublic;
