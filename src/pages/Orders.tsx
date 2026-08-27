import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useOrders } from '@/hooks/useOrders';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Processing: 'bg-blue-100 text-blue-700 border-blue-200',
  Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const Orders: React.FC = () => {
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { orders, isLoading } = useOrders();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <BuilderSwitcher />
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground">{user.email}</span>
              {isAdmin && (
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => navigate('/orders/manage')}>
                  <Settings className="w-3.5 h-3.5" /> Manage
                </Button>
              )}
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={signOut} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>Sign In</Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground">Tracking simulation orders</p>
          </div>
        </div>

        {/* Table header */}
        <div className="flex items-center gap-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border mb-2">
          <div className="min-w-[140px] flex-1">Order #</div>
          <div className="hidden sm:block w-[120px]">Date</div>
          <div className="w-[100px]">Status</div>
          <div className="hidden md:block w-[140px]">Customer</div>
          <div className="w-[80px] text-right">Total</div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="min-w-[140px] flex-1">
                  <p className="text-sm font-medium text-foreground">{order.order_number || 'Untitled'}</p>
                </div>
                <div className="hidden sm:block w-[120px] text-xs text-muted-foreground">
                  {format(new Date(order.order_date), 'MMM dd, yyyy')}
                </div>
                <div className="w-[100px]">
                  <Badge className={statusColor[order.status] || 'bg-secondary text-secondary-foreground'}>
                    {order.status}
                  </Badge>
                </div>
                <div className="w-[80px] text-right text-sm font-medium text-foreground">
                  ${Number(order.total).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;
