import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, BarChart3, Play, ExternalLink } from 'lucide-react';
import { useWinningProducts } from '@/hooks/useWinningProducts';
import { useInfoTheme } from '@/hooks/useInfoTheme';
import { InfoThemeToggle } from '@/components/shared/InfoThemeToggle';
import { ProductPerformanceChart } from '@/components/winning-products/ProductPerformanceChart';
import { TrafficChart } from '@/components/winning-products/TrafficChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const WinningProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { productQuery } = useWinningProducts();
  const { data: product, isLoading } = useQuery(productQuery(productId!));
  const { theme, setTheme, colors } = useInfoTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-6" style={{ background: colors.bg }}>
        <Skeleton className="h-10 w-40" style={{ background: colors.card }} />
        <Skeleton className="h-40" style={{ background: colors.card }} />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80" style={{ background: colors.card }} />
          <Skeleton className="h-80" style={{ background: colors.card }} />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <p style={{ color: colors.textMuted }}>Product not found</p>
      </div>
    );
  }

  const perfValues = Object.values(product.product_performance);
  const avgRating = perfValues.length > 0 ? perfValues.reduce((a, b) => a + b, 0) / perfValues.length : 0;

  const renderVideoEmbed = (url: string, index: number) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      return (
        <iframe
          key={index}
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full aspect-[3/4] rounded-lg"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    }
    return (
      <video key={index} src={url} controls className="w-full h-auto rounded-lg" style={{ background: colors.card }} />
    );
  };

  const cardStyle = { borderColor: colors.border, background: colors.card };

  return (
    <div className="min-h-screen" style={{ background: colors.bg, color: colors.text }}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            style={{ color: colors.textMuted }}
            onClick={() => navigate('/winning-products')}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Trending Products
          </Button>
          <InfoThemeToggle theme={theme} onToggle={setTheme} colors={colors} />
        </div>

        {/* Info Bar */}
        <div className="rounded-xl border p-5" style={cardStyle}>
          <div className="flex flex-col md:flex-row gap-5">
            {product.image_url && (
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0" style={{ background: colors.border }}>
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold" style={{ color: colors.text }}>{product.name}</h1>
                {product.niche && (
                  <Badge style={{ background: colors.accentMuted, color: colors.accent, borderColor: colors.accent + '4d' }}>
                    {product.niche}
                  </Badge>
                )}
              </div>
              {product.description && (
                <p className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>{product.description}</p>
              )}
              {avgRating > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4"
                      style={{
                        color: i < Math.round(avgRating) ? colors.accent : colors.border,
                        fill: i < Math.round(avgRating) ? colors.accent : 'none',
                      }}
                    />
                  ))}
                  <span className="text-xs ml-1" style={{ color: colors.textMuted }}>{avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {product.custom_links?.filter((l: any) => l.label && l.url).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
              {product.custom_links.filter((l: any) => l.label && l.url).map((link: any, i: number) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                  style={{ background: colors.cardHover, color: colors.text }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Charts 50/50 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(product.product_performance).length > 0 && (
            <div className="rounded-xl border p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: colors.text }}>
                <BarChart3 className="w-4 h-4" style={{ color: colors.accent }} /> Product Analysis
              </h3>
              <ProductPerformanceChart performance={product.product_performance} colors={colors} />
            </div>
          )}

          {product.website_traffic?.length > 0 && (
            <div className="rounded-xl border p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: colors.text }}>Website Traffic (Last 5 Months)</h3>
              <TrafficChart data={product.website_traffic} colors={colors} />
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="grid md:grid-cols-2 gap-4">
          {product.customer_state?.length > 0 && (
            <div className="rounded-xl border p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>Customer State</h3>
              <ul className="space-y-1.5">
                {product.customer_state.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.textMuted }}>
                    <span className="mt-1" style={{ color: colors.accent }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {product.customer_aspirational_identity?.length > 0 && (
            <div className="rounded-xl border p-5" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>Aspirational Identity</h3>
              <ul className="space-y-1.5">
                {product.customer_aspirational_identity.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.textMuted }}>
                    <span className="mt-1" style={{ color: colors.accent }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Top Creative Frameworks */}
        {product.creative_videos?.filter(Boolean).length > 0 && (
          <div className="rounded-xl border p-5" style={cardStyle}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: colors.text }}>
              <Play className="w-4 h-4" style={{ color: colors.accent }} /> Top Creative Frameworks
            </h3>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {product.creative_videos.filter(Boolean).map((url, i) => renderVideoEmbed(url, i))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WinningProductDetail;
