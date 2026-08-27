import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, Check, Pencil } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useAdmin } from '@/hooks/useAdmin';
import { OrderProductsTable } from '@/components/orders/OrderProductsTable';

import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderForm } from '@/components/orders/OrderForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderPublishDialog } from '@/components/orders/OrderPublishDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Processing: 'bg-blue-100 text-blue-700 border-blue-200',
  Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

interface OrderDetailProps {
  overrideId?: string;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ overrideId }) => {
  const { orderId: paramId } = useParams<{ orderId: string }>();
  const orderId = overrideId || paramId;
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const isPublicView = !!overrideId;
  const { orderQuery, timelineQuery, publicOrderQuery, publicTimelineQuery, createTimelineEvent, updateTimelineEvent, deleteTimelineEvent, updateOrder } = useOrders();
  const { data: order, isLoading } = useQuery(
    isPublicView ? publicOrderQuery(orderId!) : orderQuery(orderId!)
  );
  const { data: timelineEvents = [] } = useQuery(
    isPublicView ? publicTimelineQuery(orderId!) : timelineQuery(orderId!)
  );
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

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
        <div className="flex items-center justify-between">
          {!isPublicView && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2" onClick={() => navigate('/orders')}>
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Orders</span><span className="sm:hidden">Back</span>
            </Button>
          )}
          {!isPublicView && <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEditForm(true)}>
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPublishDialog(true)}>
              <Share2 className="w-3.5 h-3.5" />
              {order.published ? 'Published' : 'Publish'}
            </Button>
          </div>}
        </div>

        {/* Header */}
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-lg sm:text-xl font-bold">{order.order_number || 'Order'}</h1>
          <Badge className={statusColor[order.status] || 'bg-secondary text-secondary-foreground'}>{order.status}</Badge>
          <span className="text-xs sm:text-sm text-muted-foreground w-full sm:w-auto">{format(new Date(order.order_date), 'MMM dd, yyyy · hh:mm a')}</span>
        </div>

        <div className="space-y-6">
            {/* Order Details */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Order Details</h3>
              <OrderProductsTable products={products} onChange={() => {}} />
            </div>

            {/* Timeline */}
            <OrderTimeline
              events={timelineEvents}
              editable={isAdmin && !isPublicView}
              orderDate={order.order_date}
              onAdd={(desc, date) => createTimelineEvent.mutate({
                order_id: orderId!,
                description: desc,
                event_date: date,
                status_marker: 'info',
                sort_order: timelineEvents.length,
              })}
              onUpdate={(id, desc, date) => updateTimelineEvent.mutate({ id, description: desc, event_date: date })}
              onDelete={(id) => deleteTimelineEvent.mutate(id)}
            />
        </div>
        {isAdmin && (
          <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Order</DialogTitle>
              </DialogHeader>
              <OrderForm
                order={order}
                onSubmit={(data) => {
                  updateOrder.mutate({ id: order.id, ...data }, {
                    onSuccess: () => setShowEditForm(false),
                  });
                }}
                isSubmitting={updateOrder.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
        {isAdmin && (
          <OrderPublishDialog open={showPublishDialog} onOpenChange={setShowPublishDialog} order={order} />
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
