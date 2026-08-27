import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { WinningProduct } from '@/hooks/useWinningProducts';
import type { InfoThemeColors } from '@/hooks/useInfoTheme';

interface ProductCardProps {
  product: WinningProduct;
  colors: InfoThemeColors;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, colors }) => {
  const navigate = useNavigate();

  return (
    <div
      className="gap-4 p-3 rounded-lg border cursor-pointer transition-colors items-center justify-start flex flex-row"
      style={{
        borderColor: colors.border,
        background: colors.card,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = colors.cardHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = colors.card)}
      onClick={() => navigate(`/winning-products/${product.id}`)}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: colors.border }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: colors.textMuted }}>N/A</div>
        )}
      </div>

      {/* Name */}
      <div className="min-w-[140px] flex-1">
        <p className="font-medium text-sm truncate" style={{ color: colors.text }}>{product.name}</p>
      </div>

      {/* Niche badge */}
      <div className="hidden sm:block min-w-[80px]">
        {product.niche ? (
          <Badge
            className="text-xs"
            style={{
              background: colors.accentMuted,
              color: colors.accent,
              borderColor: colors.accent + '4d',
            }}
          >
            {product.niche}
          </Badge>
        ) : (
          <span className="text-xs" style={{ color: colors.textMuted }}>—</span>
        )}
      </div>

      {/* Traffic sparkline */}
      <div className="hidden md:block w-[100px] h-8 flex-shrink-0">
        {product.website_traffic?.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={product.website_traffic}>
              <Line type="monotone" dataKey="visits" stroke={colors.accent} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <span className="text-xs" style={{ color: colors.textMuted }}>—</span>
        )}
      </div>
    </div>
  );
};
