import React, { useEffect, useRef, useState } from 'react';
import { Upload, X, BarChart3 } from 'lucide-react';
import { useQuiz } from '@/contexts/QuizContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ButtonSize, ButtonRadius, FontWeight, QUIZ_TEXT_TYPES, DEFAULT_TEXT_SIZES, QuizTextType } from '@/types/quiz';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QuizAnalyticsDashboard } from './QuizAnalyticsDashboard';
import { generateDemoQuizAnalytics } from '@/lib/quizAnalytics';

const colorPresets = [
  '#0066FF', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#000000', // Black
];

const bgColorPresets = [
  '#FFFFFF', // White
  '#F8FAFC', // Slate 50
  '#F1F5F9', // Slate 100
  '#FEF3C7', // Amber 100
  '#ECFDF5', // Emerald 50
  '#EFF6FF', // Blue 50
  '#FAF5FF', // Purple 50
  '#FDF2F8', // Pink 50
  '#1A1A1A', // Dark
  '#0F172A', // Slate 900
];

const fontColorPresets = [
  '#1A1A1A', // Near black
  '#374151', // Gray 700
  '#4B5563', // Gray 600
  '#1E3A5F', // Dark blue
  '#7C3AED', // Violet
  '#FFFFFF', // White
  '#F8FAFC', // Slate 50
  '#E2E8F0', // Slate 200
];

const SETTINGS_SECTIONS = [
  { id: 'branding', label: 'Store Branding' },
  { id: 'favicon', label: 'Favicon' },
  { id: 'colors', label: 'Colors' },
  { id: 'next-button', label: 'Next Button' },
  { id: 'typography', label: 'Typography' },
  { id: 'text-sizes', label: 'Text Sizes' },
  { id: 'behaviour', label: 'Behaviour' },
  { id: 'analytics-demo', label: 'Analytics Demo' },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

const SettingsSection: React.FC<{
  id: SettingsSectionId;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ id, title, description, className, children }) => (
  <section
    id={`settings-${id}`}
    data-settings-section={id}
    className={cn(
      'scroll-mt-4 rounded-xl border border-border-subtle bg-card p-5',
      className
    )}
  >
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    {children}
  </section>
);

const SettingsSectionNav: React.FC = () => {
  const [active, setActive] = useState<string>(SETTINGS_SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const nodes = SETTINGS_SECTIONS
      .map(({ id }) => document.getElementById(`settings-${id}`))
      .filter((el): el is HTMLElement => !!el);
    if (!nodes.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = visible?.target.getAttribute('data-settings-section');
        if (id) setActive(id);
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: [0, 0.25, 1] }
    );
    nodes.forEach((node) => observerRef.current?.observe(node));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <nav className="hidden lg:block w-44 shrink-0 sticky top-0">
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sections
      </p>
      <ul className="space-y-0.5">
        {SETTINGS_SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(`settings-${id}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                active === id
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              )}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export const SettingsPanel: React.FC = () => {
  const { quiz, updateSettings } = useQuiz();
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `${quiz.id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('quiz-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('quiz-assets').getPublicUrl(filePath);
      updateSettings({ logoUrl: data.publicUrl });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 1 * 1024 * 1024) { toast.error('Favicon must be less than 1MB'); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `${quiz.id}-favicon-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/favicons/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('quiz-assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('quiz-assets').getPublicUrl(filePath);
      updateSettings({ faviconUrl: data.publicUrl });
      toast.success('Favicon uploaded');
    } catch (error) {
      console.error('Error uploading favicon:', error);
      toast.error('Failed to upload favicon');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFavicon = () => {
    updateSettings({ faviconUrl: undefined });
  };

  const logoLayout = quiz.settings.logoLayout || 'horizontal';
  const logoSize = quiz.settings.logoSize || 'medium';
  const handleRemoveLogo = () => {
    updateSettings({ logoUrl: undefined });
  };


  return (
    <div className="flex items-start gap-6 animate-fade-in-up">
      <SettingsSectionNav />

      <div className="flex-1 min-w-0 grid gap-4 xl:grid-cols-2 items-start">
      {/* Store Branding Section */}
      <SettingsSection id="branding" title="Store Branding" description="Logo, store name and placement" className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-foreground">Store Logo</Label>
          <div className="mt-2">
            {quiz.settings.logoUrl ? (
              <div className="relative inline-block">
                <img
                  src={quiz.settings.logoUrl}
                  alt="Store logo"
                  className="h-16 w-16 object-contain rounded-lg border border-border-subtle bg-secondary/50"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-90"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Click to upload logo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Max 2MB. Displayed above progress bar.</p>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">Store Name</Label>
          <Input
            value={quiz.settings.storeName || ''}
            onChange={(e) => updateSettings({ storeName: e.target.value })}
            placeholder="Your Store Name"
            className="mt-1.5 input-clean"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">Logo Layout</Label>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant={logoLayout === 'horizontal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ logoLayout: 'horizontal' })}
              className="flex-1"
            >
              Horizontal
            </Button>
            <Button
              type="button"
              variant={logoLayout === 'vertical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ logoLayout: 'vertical' })}
              className="flex-1"
            >
              Vertical
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">Logo Size</Label>
          <div className="mt-2 flex gap-2">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <Button
                key={size}
                type="button"
                variant={logoSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ logoSize: size })}
                className="flex-1 capitalize"
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Favicon Section */}
      <SettingsSection id="favicon" title="Favicon" description="Icon shown in the browser tab">
        <div>
          {quiz.settings.faviconUrl ? (
            <div className="relative inline-block">
              <img src={quiz.settings.faviconUrl} alt="Favicon" className="h-10 w-10 object-contain rounded border border-border-subtle bg-secondary/50" />
              <button
                onClick={handleRemoveFavicon}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-full hover:opacity-90"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">{uploading ? 'Uploading...' : 'Upload favicon'}</span>
              <input type="file" accept="image/*" onChange={handleFaviconUpload} disabled={uploading} className="hidden" />
            </label>
          )}
          <p className="text-xs text-muted-foreground mt-1.5">Max 1MB. Shows in browser tab.</p>
        </div>
      </SettingsSection>

      <SettingsSection id="colors" title="Colors" description="Brand, background and text colors">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Brand Color</Label>
            <p className="text-xs text-muted-foreground mb-2">Used for buttons and accents</p>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => updateSettings({ primaryColor: color })}
                  className={cn(
                    'color-swatch',
                    quiz.settings.primaryColor === color && 'active'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="color"
                value={quiz.settings.primaryColor}
                onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                className="w-10 h-10 p-1 rounded-lg cursor-pointer"
              />
              <Input
                value={quiz.settings.primaryColor}
                onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                placeholder="#0066FF"
                className="flex-1 input-clean font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Background Color</Label>
            <p className="text-xs text-muted-foreground mb-2">Quiz page background</p>
            <div className="flex flex-wrap gap-2">
              {bgColorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => updateSettings({ backgroundColor: color })}
                  className={cn(
                    'color-swatch',
                    quiz.settings.backgroundColor === color && 'active'
                  )}
                  style={{ backgroundColor: color, border: color === '#FFFFFF' ? '1px solid #E2E8F0' : undefined }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="color"
                value={quiz.settings.backgroundColor || '#FFFFFF'}
                onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                className="w-10 h-10 p-1 rounded-lg cursor-pointer"
              />
              <Input
                value={quiz.settings.backgroundColor || '#FFFFFF'}
                onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                placeholder="#FFFFFF"
                className="flex-1 input-clean font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Font Color</Label>
            <p className="text-xs text-muted-foreground mb-2">Text color on the quiz</p>
            <div className="flex flex-wrap gap-2">
              {fontColorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => updateSettings({ fontColor: color })}
                  className={cn(
                    'color-swatch',
                    quiz.settings.fontColor === color && 'active'
                  )}
                  style={{ backgroundColor: color, border: ['#FFFFFF', '#F8FAFC', '#E2E8F0'].includes(color) ? '1px solid #E2E8F0' : undefined }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="color"
                value={quiz.settings.fontColor || '#1A1A1A'}
                onChange={(e) => updateSettings({ fontColor: e.target.value })}
                className="w-10 h-10 p-1 rounded-lg cursor-pointer"
              />
              <Input
                value={quiz.settings.fontColor || '#1A1A1A'}
                onChange={(e) => updateSettings({ fontColor: e.target.value })}
                placeholder="#1A1A1A"
                className="flex-1 input-clean font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Next Button Customization */}
      <SettingsSection id="next-button" title="Next Button Style" description="Label, color, size and corners">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Button Text</Label>
            <Input
              value={quiz.settings.nextButtonText || 'Next'}
              onChange={(e) => updateSettings({ nextButtonText: e.target.value })}
              placeholder="Next"
              className="mt-1.5 input-clean"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Button Color</Label>
            <p className="text-xs text-muted-foreground mb-2">Leave empty to use brand color</p>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={quiz.settings.nextButtonColor || quiz.settings.primaryColor}
                onChange={(e) => updateSettings({ nextButtonColor: e.target.value })}
                className="w-10 h-10 p-1 rounded-lg cursor-pointer"
              />
              <Input
                value={quiz.settings.nextButtonColor || ''}
                onChange={(e) => updateSettings({ nextButtonColor: e.target.value || undefined })}
                placeholder="Use brand color"
                className="flex-1 input-clean font-mono text-sm"
              />
              {quiz.settings.nextButtonColor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateSettings({ nextButtonColor: undefined })}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Button Size</Label>
            <div className="mt-2 flex gap-2">
              {(['small', 'medium', 'large'] as ButtonSize[]).map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={(quiz.settings.nextButtonSize || 'medium') === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ nextButtonSize: size })}
                  className="flex-1 capitalize"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Button Corners</Label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {([
                { value: 'none', label: 'Square' },
                { value: 'small', label: 'Sm' },
                { value: 'medium', label: 'Md' },
                { value: 'large', label: 'Lg' },
                { value: 'full', label: 'Full' },
              ] as { value: ButtonRadius; label: string }[]).map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={(quiz.settings.nextButtonRadius || 'large') === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ nextButtonRadius: value })}
                  className="flex-1"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Typography Section */}
      <SettingsSection id="typography" title="Typography" description="Font weights for quiz text">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Sub-text Weight</Label>
            <div className="mt-2 flex gap-2">
              {([
                { value: 'normal', label: 'Normal' },
                { value: 'medium', label: 'Medium' },
                { value: 'semibold', label: 'Semi-bold' },
              ] as { value: FontWeight; label: string }[]).map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={(quiz.settings.subTextFontWeight || 'normal') === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ subTextFontWeight: value })}
                  className="flex-1"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Answer Options Weight</Label>
            <div className="mt-2 flex gap-2">
              {([
                { value: 'normal', label: 'Normal' },
                { value: 'medium', label: 'Medium' },
                { value: 'semibold', label: 'Semi-bold' },
              ] as { value: FontWeight; label: string }[]).map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={(quiz.settings.answerFontWeight || 'medium') === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ answerFontWeight: value })}
                  className="flex-1"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Text Sizes */}
      <SettingsSection
        id="text-sizes"
        title="Text Sizes"
        description="Applies to every quiz page, including blank/info pages"
        className="xl:col-span-2"
      >
          <div>
            <div className="flex items-center justify-end mb-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ textSizes: { ...DEFAULT_TEXT_SIZES } })}
              >
                Reset to defaults
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {QUIZ_TEXT_TYPES.map(({ key, label, description, min, max }) => {
                const current = quiz.settings.textSizes?.[key] ?? DEFAULT_TEXT_SIZES[key];
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium text-foreground">{label}</span>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">{current}px</span>
                    </div>
                    <Slider
                      className="mt-2"
                      min={min}
                      max={max}
                      step={1}
                      value={[current]}
                      onValueChange={([val]) =>
                        updateSettings({
                          textSizes: {
                            ...(quiz.settings.textSizes || {}),
                            [key as QuizTextType]: val,
                          },
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
      </SettingsSection>

      {/* Behaviour */}
      <SettingsSection id="behaviour" title="Behaviour" description="Navigation and skip options" className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">Auto-advance single-answer</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically move to the next question when a single answer is selected
              </p>
            </div>
            <Switch
              checked={quiz.settings.autoAdvanceSingleAnswer ?? false}
              onCheckedChange={(checked) => updateSettings({ autoAdvanceSingleAnswer: checked })}
            />
          </div>
        </div>

        {/* Skip Button */}
        <div className="pt-4 border-t border-border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">Show Skip Button on First Step</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display a skip link on the first question that redirects to an external URL
              </p>
            </div>
            <Switch
              checked={quiz.settings.showSkipButton ?? false}
              onCheckedChange={(checked) => updateSettings({ showSkipButton: checked })}
            />
          </div>
          {quiz.settings.showSkipButton && (
            <div className="space-y-3 pl-1">
              <div>
                <Label className="text-xs text-muted-foreground">Button Text</Label>
                <Input
                  value={quiz.settings.skipButtonText ?? 'Skip Quiz'}
                  onChange={(e) => updateSettings({ skipButtonText: e.target.value })}
                  placeholder="Skip Quiz"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Destination URL</Label>
                <Input
                  value={quiz.settings.skipButtonUrl ?? ''}
                  onChange={(e) => updateSettings({ skipButtonUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Analytics demo */}
      <SettingsSection
        id="analytics-demo"
        title="Analytics Demo"
        description="Preview the full analytics report with sample data — locations, time on each page and drop-off points."
      >
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-1" /> Open demo dashboard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Analytics demo (sample data)</DialogTitle>
              </DialogHeader>
              <QuizAnalyticsDashboard data={generateDemoQuizAnalytics()} demo />
            </DialogContent>
          </Dialog>
      </SettingsSection>
      </div>
    </div>
  );
};
