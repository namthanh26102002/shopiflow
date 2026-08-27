import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, HelpCircle, Newspaper, Trophy, BookOpen, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useInfoTheme } from '@/hooks/useInfoTheme';
import { cn } from '@/lib/utils';

const builders = [
  { id: 'quiz', name: 'Quiz Builder', description: 'Product recommendation quizzes', icon: HelpCircle, path: '/builder' },
  { id: 'advertorial', name: 'Advertorial Builder', description: 'High-converting landing pages', icon: Newspaper, path: '/advertorial-builder' },
  { id: 'winning-products', name: 'Trending Products', description: 'Top dropshipping product picks', icon: Trophy, path: '/winning-products' },
  { id: 'info', name: 'Info', description: 'Classrooms and lessons', icon: BookOpen, path: '/info' },
  { id: 'orders', name: 'Orders', description: 'Tracking simulation', icon: Package, path: '/orders' },
];

export const BuilderSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors } = useInfoTheme();

  const currentBuilder = builders.find(b => location.pathname.startsWith(b.path)) || builders[0];
  const isThemedPage = location.pathname.startsWith('/winning-products') || location.pathname.startsWith('/info');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("gap-2 px-3 h-9 text-sm font-medium", !isThemedPage && "hover:bg-secondary")}
          style={isThemedPage ? { color: colors.text } : undefined}
        >
          <currentBuilder.icon className="w-4 h-4" />
          <span>{currentBuilder.name}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("w-64 border shadow-lg z-50", !isThemedPage && "bg-popover border-border")}
        style={isThemedPage ? { background: colors.headerBg, borderColor: colors.border, color: colors.text, backdropFilter: 'blur(12px)' } : undefined}
      >
        {builders.map((builder) => {
          const isActive = location.pathname.startsWith(builder.path);
          return (
            <DropdownMenuItem
              key={builder.id}
              onClick={() => navigate(builder.path)}
              className={cn('flex items-start gap-3 p-3 cursor-pointer', !isThemedPage && isActive && 'bg-secondary')}
              style={isThemedPage ? { color: colors.text, background: isActive ? colors.card : 'transparent' } : undefined}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  !isThemedPage && (isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')
                )}
                style={isThemedPage ? { background: isActive ? colors.accentMuted : colors.card, color: isActive ? colors.accent : colors.textMuted } : undefined}
              >
                <builder.icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className={cn("font-medium", !isThemedPage && "text-foreground")} style={isThemedPage ? { color: colors.text } : undefined}>{builder.name}</span>
                <span className={cn("text-xs", !isThemedPage && "text-muted-foreground")} style={isThemedPage ? { color: colors.textMuted } : undefined}>{builder.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
