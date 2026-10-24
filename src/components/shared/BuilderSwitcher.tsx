import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, ChevronDown, HelpCircle, Languages, Newspaper, BookOpen, Package, LayoutDashboard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
    DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useInfoTheme } from '@/hooks/useInfoTheme';
import { cn } from '@/lib/utils';
import { DASHBOARD_LANGUAGES, msg, useDashboardLanguage, useT } from '@/i18n';
import { useChooseLanguage } from '@/components/shared/LanguageSwitch';

const builders = [
  { id: 'home', name: msg('Home'), description: msg('All your projects'), icon: LayoutDashboard, path: '/home' },
  { id: 'quiz', name: msg('Quiz Builder'), description: msg('Product recommendation quizzes'), icon: HelpCircle, path: '/builder' },
  { id: 'advertorial', name: msg('Advertorial Builder'), description: msg('High-converting landing pages'), icon: Newspaper, path: '/advertorial-builder' },
  { id: 'info', name: msg('Info'), description: msg('Classrooms and lessons'), icon: BookOpen, path: '/info' },
  { id: 'orders', name: msg('Orders'), description: msg('Tracking simulation'), icon: Package, path: '/orders' },
];

export const BuilderSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
    const { colors } = useInfoTheme();
  const t = useT();
  const language = useDashboardLanguage();
  const chooseLanguage = useChooseLanguage();

  const currentBuilder = builders.find(b => location.pathname.startsWith(b.path)) || builders[1];
  const isThemedPage = location.pathname.startsWith('/info');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("gap-2 px-3 h-9 text-sm font-medium", !isThemedPage && "hover:bg-secondary")}
          style={isThemedPage ? { color: colors.text } : undefined}
        >
          <currentBuilder.icon className="w-4 h-4" />
          <span>{t(currentBuilder.name)}</span>
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
                <span className={cn("font-medium", !isThemedPage && "text-foreground")} style={isThemedPage ? { color: colors.text } : undefined}>{t(builder.name)}</span>
                <span className={cn("text-xs", !isThemedPage && "text-muted-foreground")} style={isThemedPage ? { color: colors.textMuted } : undefined}>{t(builder.description)}</span>
              </div>
            </DropdownMenuItem>
                    );
        })}
        <DropdownMenuSeparator style={isThemedPage ? { background: colors.border } : undefined} />
        <DropdownMenuLabel
          className={cn('flex items-center gap-1.5 text-xs font-normal', !isThemedPage && 'text-muted-foreground')}
          style={isThemedPage ? { color: colors.textMuted } : undefined}
        >
          <Languages className="w-3.5 h-3.5" />
          {t('Dashboard language')}
        </DropdownMenuLabel>
        {DASHBOARD_LANGUAGES.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => chooseLanguage(option.value)}
            className="gap-2 cursor-pointer"
            style={isThemedPage ? { color: colors.text } : undefined}
          >
            <Check className={cn('w-3.5 h-3.5', option.value === language ? 'opacity-100' : 'opacity-0')} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
