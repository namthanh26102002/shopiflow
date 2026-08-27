import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useWinningProducts } from '@/hooks/useWinningProducts';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { ProductCard } from '@/components/winning-products/ProductCard';
import { InfoThemeToggle } from '@/components/shared/InfoThemeToggle';
import { useInfoTheme } from '@/hooks/useInfoTheme';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const WinningProducts: React.FC = () => {
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { products, isLoading } = useWinningProducts();
  const navigate = useNavigate();
  const { theme, setTheme, colors } = useInfoTheme();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.bg }}>
      {/* Header */}
      <header
        className="h-14 border-b flex items-center justify-between px-4"
        style={{ background: colors.headerBg, borderColor: colors.border }}
      >
        <div className="flex items-center gap-4">
          <BuilderSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <InfoThemeToggle theme={theme} onToggle={setTheme} colors={colors} />
          {user ? (
            <>
              <span className="text-xs" style={{ color: colors.textMuted }}>{user.email}</span>
              {isAdmin &&
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  style={{ borderColor: colors.border, color: colors.text, background: 'transparent' }}
                  onClick={() => navigate('/winning-products/manage')}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Manage
                </Button>
              }
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                style={{ color: colors.textMuted }}
                onClick={signOut}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: colors.border, color: colors.text }}
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: colors.accentMuted }}
          >
            <Trophy className="w-5 h-5" style={{ color: colors.accent }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>Trending Products</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>Products are updated weekly</p>
          </div>
        </div>

        {/* Table header */}
        <div
          className="flex items-center gap-4 px-3 py-2 text-xs font-medium border-b mb-2"
          style={{ color: colors.textMuted, borderColor: colors.border }}
        >
          <div className="w-12 flex-shrink-0" />
          <div className="min-w-[140px] flex-1">Product</div>
          <div className="hidden sm:block min-w-[80px]">Niche</div>
          <div className="hidden md:block w-[100px] flex-shrink-0">Traffic</div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" style={{ background: colors.card }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20" style={{ color: colors.textMuted }}>
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} colors={colors} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default WinningProducts;
