import React from 'react';
import { Moon, Sun, Sunset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoTheme } from '@/hooks/useInfoTheme';
import { useT, type MessageKey } from '@/i18n';

const themeOrder: InfoTheme[] = ['dark', 'light', 'warm'];
const themeNames: Record<InfoTheme, MessageKey> = { dark: 'Dark', light: 'Light', warm: 'Warm' };
const themeIcons: Record<InfoTheme, React.ElementType> = {
  dark: Moon,
  light: Sun,
  warm: Sunset,
};

interface InfoThemeToggleProps {
  theme: InfoTheme;
  onToggle: (next: InfoTheme) => void;
  colors: { text: string; textMuted: string };
}

export const InfoThemeToggle: React.FC<InfoThemeToggleProps> = ({ theme, onToggle, colors }) => {
    const t = useT();
  const Icon = themeIcons[theme];
  const next = () => {
    const idx = themeOrder.indexOf(theme);
    onToggle(themeOrder[(idx + 1) % themeOrder.length]);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8"
      style={{ color: colors.textMuted }}
      onClick={next}
      title={t('Theme: {name}', { name: t(themeNames[theme]) })}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
};
