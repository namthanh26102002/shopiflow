// Theme presets from the Quiz Palettes design. Choosing one writes its values
// into the quiz's settings, so every colour stays editable afterwards and a
// published quiz never shifts because a preset was changed later.
import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuiz } from '@/contexts/QuizContext';
import { QUIZ_THEMES, QuizThemePreset } from '@/types/quizTheme';
import { useT } from '@/i18n';

const Swatch: React.FC<{ theme: QuizThemePreset; selected: boolean; onClick: () => void }> = ({
  theme, selected, onClick,
}) => {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      title={theme.name}
      className={`relative rounded-lg overflow-hidden border transition-colors text-left ${
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border-subtle hover:border-primary/40'
      }`}
    >
      <div
        className="h-16 p-2 flex flex-col justify-between"
        style={{
          background: `linear-gradient(180deg, ${theme.bgFrom} 0%, ${theme.bgVia} 55%, ${theme.bgTo} 100%)`,
        }}
      >
        <div
          className="rounded px-1.5 py-1 text-[8px] font-semibold truncate"
          style={{ background: theme.panelBg, color: theme.heading, border: `1px solid ${theme.panelBorder}` }}
        >
          {t('Question')}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 flex-1 rounded-full" style={{ background: theme.accent }} />
          <span
            className="h-3 w-8 rounded-sm"
            style={{ background: theme.optionBg, border: `1px solid ${theme.optionBorder}` }}
          />
        </div>
      </div>

      <div className="px-2 py-1.5 bg-card">
        <p className="text-[11px] font-medium text-foreground truncate">{theme.name}</p>
      </div>

      {selected && (
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </span>
      )}
    </button>
  );
};

export const ThemePicker: React.FC = () => {
  const t = useT();
  const { quiz, updateSettings } = useQuiz();
  const currentId = quiz.settings.theme?.id;

  const apply = (theme: QuizThemePreset) => {
    // Keep the legacy fields in step so anything still reading them — and any
    // quiz opened in an older client — stays consistent with the theme.
    updateSettings({
      theme: { ...theme },
      primaryColor: theme.accent,
      backgroundColor: theme.bgFrom,
      fontColor: theme.heading,
    });
  };

  const clear = () => updateSettings({ theme: undefined });

  const groups = ['Light', 'Dark'] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{t('Theme')}</p>
          <p className="text-xs text-muted-foreground">
            {t('Sets background, text, options and fonts at once. You can still change any colour below afterwards.')}
          </p>
        </div>
        {currentId && (
          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={clear}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {t('Clear')}
          </Button>
        )}
      </div>

      {groups.map((group) => (
        <div key={group} className="space-y-2">
          <p className="text-xs text-muted-foreground">{t(group)}</p>
          <div className="grid grid-cols-3 gap-2">
            {QUIZ_THEMES.filter((theme) => theme.group === group).map((theme) => (
              <Swatch
                key={theme.id}
                theme={theme}
                selected={currentId === theme.id}
                onClick={() => apply(theme)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
