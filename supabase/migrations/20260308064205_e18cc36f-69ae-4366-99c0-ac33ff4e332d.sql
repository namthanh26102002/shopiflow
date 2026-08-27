
-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  order_date timestamptz NOT NULL DEFAULT now(),
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  shipping numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  shipping_method text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  shipping_address text NOT NULL DEFAULT '',
  billing_address text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT 'Cash on delivery',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create order_timeline_events table
CREATE TABLE public.order_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL DEFAULT now(),
  status_marker text NOT NULL DEFAULT 'info',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_timeline_events ENABLE ROW LEVEL SECURITY;

-- Orders RLS: admin CRUD
CREATE POLICY "Admins can select all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert orders" ON public.orders FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view published orders" ON public.orders FOR SELECT USING (published = true);

-- Timeline RLS: admin CRUD + public read for published orders
CREATE POLICY "Admins can select all timeline events" ON public.order_timeline_events FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert timeline events" ON public.order_timeline_events FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update timeline events" ON public.order_timeline_events FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete timeline events" ON public.order_timeline_events FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view published order timeline events" ON public.order_timeline_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_timeline_events.order_id AND orders.published = true)
);

-- Updated_at trigger
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
