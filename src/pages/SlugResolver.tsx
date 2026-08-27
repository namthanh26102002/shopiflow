import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import QuizPublic from './QuizPublic';
import AdvertorialPublic from './AdvertorialPublic';
import OrderDetail from './OrderDetail';
import NotFound from './NotFound';

interface DomainMapping {
  content_type: string;
  content_id: string;
}

const SlugResolver: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [mapping, setMapping] = useState<DomainMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolve = async () => {
      const hostname = window.location.hostname;
      const path = (slug || '').trim();

      // First check public domain mappings (minimal, non-sensitive projection)
      const { data } = await (supabase as any)
        .from('domain_mappings')
        .select('content_type, content_id')
        .eq('domain', hostname)
        .eq('path', path)
        .maybeSingle();

      if (data) {
        setMapping(data);
        setLoading(false);
        return;
      }

      // Then check if slug is an order number
      if (path) {
        const { data: order } = await (supabase as any)
          .from('public_orders')
          .select('id')
          .eq('order_number', path)
          .maybeSingle();

        if (order) {
          setMapping({ content_type: 'order', content_id: order.id });
          setLoading(false);
          return;
        }
      }

      setNotFound(true);
      setLoading(false);
    };

    resolve();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound || !mapping) {
    return <NotFound />;
  }

  if (mapping.content_type === 'quiz') {
    return <QuizPublic overrideId={mapping.content_id} />;
  }

  if (mapping.content_type === 'advertorial') {
    return <AdvertorialPublic overrideId={mapping.content_id} />;
  }

  if (mapping.content_type === 'order') {
    return <OrderDetail overrideId={mapping.content_id} />;
  }

  return <NotFound />;
};

export default SlugResolver;
