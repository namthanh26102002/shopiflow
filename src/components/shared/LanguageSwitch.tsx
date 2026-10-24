import React from 'react';
import { Check, Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DASHBOARD_LANGUAGES,
  DashboardLanguage,
  setDashboardLanguage,
  useDashboardLanguage,
  useT,
} from '@/i18n';

/** Applies a dashboard language and, when signed in, remembers it on the account. */
export const useChooseLanguage = () => {
  const { user } = useAuth();
  return (language: DashboardLanguage) => {
    setDashboardLanguage(language);
    if (user && user.user_metadata?.dashboard_language !== language) {
      void supabase.auth.updateUser({ data: { dashboard_language: language } });
    }
  };
};

/** Compact language menu for page headers. */
export const LanguageSwitch: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  const t = useT();
  const language = useDashboardLanguage();
  const choose = useChooseLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className ?? 'h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground'}
          style={style}
          aria-label={t('Dashboard language')}
          title={t('Dashboard language')}
        >
          <Languages className="w-4 h-4" />
          <span className="text-xs font-medium uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {DASHBOARD_LANGUAGES.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => choose(option.value)} className="gap-2">
            <Check className={`w-3.5 h-3.5 ${option.value === language ? 'opacity-100' : 'opacity-0'}`} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
