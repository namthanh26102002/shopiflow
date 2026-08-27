import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Share2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useOrders, Order } from '@/hooks/useOrders';
import { OrderForm } from '@/components/orders/OrderForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const OrderManage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { orders, isLoading, createOrder, updateOrder, deleteOrder } = useOrders();
  const [editing, setEditing] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-32" /></div>;
  if (!isAdmin) { navigate('/orders'); return null; }

  const handleCreate = (data: any) => {
    createOrder.mutate(data, { onSuccess: () => setShowForm(false) });
  };

  const handleUpdate = (data: any) => {
    if (!editing) return;
    updateOrder.mutate({ id: editing.id, ...data }, { onSuccess: () => { setEditing(null); setShowForm(false); } });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button className="gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Add Order
          </Button>
        </div>

        <h1 className="text-xl font-bold text-foreground">Manage Orders</h1>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No orders yet. Create your first one!</p>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{order.order_number || 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.order_date), 'MMM dd, yyyy')} · ${Number(order.total).toFixed(2)}
                    </p>
                  </div>
                  <Badge variant={order.published ? 'default' : 'secondary'} className="gap-1 shrink-0">
                    {order.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {order.published ? 'Live' : 'Draft'}
                  </Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" title="Share tracking link" onClick={async () => {
                      const normalizedOrderNumber = (order.order_number || '').trim();
                      if (!normalizedOrderNumber) {
                        toast({ title: 'Missing order number', description: 'Please add an order number before sharing.', variant: 'destructive' });
                        return;
                      }
                      await updateOrder.mutateAsync({ id: order.id, published: true, order_number: normalizedOrderNumber });
                      const url = `https://shopiflow-quiz.lovable.app/order/${encodeURIComponent(normalizedOrderNumber)}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: 'Tracking link copied' });
                    }}>
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setEditing(order); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete order?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOrder.mutate(order.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Order' : 'Add Order'}</DialogTitle>
            </DialogHeader>
            <OrderForm
              order={editing ?? undefined}
              onSubmit={editing ? handleUpdate : handleCreate}
              isSubmitting={createOrder.isPending || updateOrder.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OrderManage;
