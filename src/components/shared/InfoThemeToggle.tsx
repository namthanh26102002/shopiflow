import React from 'react';
import { Moon, Sun, Sunset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoTheme } from '@/hooks/useInfoTheme';

const themeOrder: InfoTheme[] = ['dark', 'light', 'warm'];
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
      title={`Theme: ${theme}`}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
};
