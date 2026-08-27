import React, { useState } from 'react';
import { Order, OrderProduct } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderProductsTable } from './OrderProductsTable';

interface Props {
  order?: Order;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

const STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled'];
const PAYMENT_METHODS = ['Cash on delivery', 'PayPal', 'Credit card'];

export const OrderForm: React.FC<Props> = ({ order, onSubmit, isSubmitting }) => {
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState(order?.order_number || '');
  const [status, setStatus] = useState(order?.status || 'Pending');
  const [orderDate, setOrderDate] = useState(order?.order_date ? new Date(order.order_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [products, setProducts] = useState<OrderProduct[]>((order?.products as OrderProduct[]) || []);
  const [shipping, setShipping] = useState(order?.shipping ?? 0);
  const [shippingMethod, setShippingMethod] = useState(order?.shipping_method || '');
  const [published, setPublished] = useState(order?.published ?? false);

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('quiz-assets').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('quiz-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const subtotal = products.reduce((s, p) => s + p.total, 0);
  const total = subtotal + Number(shipping);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      order_number: orderNumber,
      status,
      order_date: new Date(orderDate).toISOString(),
      products,
      subtotal,
      shipping: Number(shipping),
      total,
      shipping_method: shippingMethod,
      published,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Order Number</Label>
          <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="e.g. SPRITE-100063" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Order Date & Time</Label>
        <Input type="datetime-local" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
      </div>

      <div>
        <Label className="mb-2 block">Products</Label>
        <OrderProductsTable products={products} onChange={setProducts} editable onUploadImage={uploadImage} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Shipping Cost</Label>
          <Input type="number" step="0.01" value={shipping} onChange={e => setShipping(Number(e.target.value))} />
        </div>
        <div>
          <Label>Shipping Method</Label>
          <Input value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} placeholder="e.g. DHL Express" />
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-1 p-3 rounded-lg bg-secondary/50">
        <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>${Number(shipping).toFixed(2)}</span></div>
        <div className="flex justify-between font-semibold text-foreground"><span>Total</span><span>${total.toFixed(2)}</span></div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={published} onCheckedChange={setPublished} />
        <Label>Published</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !orderNumber}>
        {isSubmitting ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
      </Button>
    </form>
  );
};
