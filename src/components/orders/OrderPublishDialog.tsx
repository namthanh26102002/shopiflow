import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Order, useOrders } from '@/hooks/useOrders';

interface OrderPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
}

const publishedBase = 'https://shopiflow-quiz.lovable.app';

export const OrderPublishDialog: React.FC<OrderPublishDialogProps> = ({ open, onOpenChange, order }) => {
  const { updateOrder } = useOrders();
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const orderNumber = (order.order_number || '').trim();
  const liveUrl = `${publishedBase}/order/${encodeURIComponent(orderNumber)}`;
  const isPublished = order.published;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    if (!orderNumber) {
      toast({ title: 'Missing order number', description: 'Please add an order number before publishing.', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    try {
      await updateOrder.mutateAsync({ id: order.id, published: true, order_number: orderNumber });
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      toast({ title: 'Order published!', description: 'Public link copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to publish', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      await updateOrder.mutateAsync({ id: order.id, published: false });
      toast({ title: 'Order unpublished' });
    } catch {
      toast({ title: 'Failed to unpublish', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Order</DialogTitle>
        </DialogHeader>

        {!isPublished ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Publishing this order will make it accessible via a public tracking link.
            </p>
            {!orderNumber && (
              <p className="text-sm text-destructive">Please add an order number before publishing.</p>
            )}
            <Button className="w-full gap-2" onClick={handlePublish} disabled={publishing || !orderNumber}>
              <Globe className="w-4 h-4" />
              {publishing ? 'Publishing...' : 'Publish Order'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-foreground">Live</span>
            </div>
            <div className="flex gap-2">
              <Input value={liveUrl} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(liveUrl, '_blank')}>
                <ExternalLink className="w-4 h-4" /> View Live
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={handleUnpublish}>
                Unpublish
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
