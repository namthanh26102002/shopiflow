import React, { useEffect, useRef, useState } from 'react';
import { Upload, X, BarChart3 } from 'lucide-react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdvertorialAnalyticsPanel } from './AdvertorialAnalyticsPanel';
import { generateDemoAdvertorialEvents } from '@/lib/advertorialAnalyticsDemo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL_SECTIONS = [
  { id: 'page-info', label: 'Page Info' },
  { id: 'branding', label: 'Branding' },
  { id: 'typography', label: 'Typography' },
  { id: 'cta-style', label: 'CTA Button Style' },
  { id: 'sticky-cta', label: 'Sticky Footer CTA' },
  { id: 'footer', label: 'Footer' },
  { id: 'analytics-demo', label: 'Analytics Demo' },
] as const;

const SettingsSection: React.FC<{
  id: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ id, title, description, className, children }) => (
  <section
    id={`adv-settings-${id}`}
    data-settings-section={id}
    className={cn('scroll-mt-4 rounded-xl border border-border bg-card p-5', className)}
  >
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {children}
  </section>
);

const SettingsSectionNav: React.FC<{ sections: { id: string; label: string }[] }> = ({ sections }) => {
  const [active, setActive] = useState<string>(sections[0]?.id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const nodes = sections
      .map(({ id }) => document.getElementById(`adv-settings-${id}`))
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
  }, [sections]);

  return (
    <nav className="hidden lg:block w-44 shrink-0 sticky top-0">
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sections
      </p>
      <ul className="space-y-0.5">
        {sections.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(`adv-settings-${id}`)
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
  const { advertorial, updateSettings, isLesson } = useAdvertorial();
  const { settings } = advertorial;
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 1 * 1024 * 1024) { toast.error('Favicon must be less than 1MB'); return; }

    setUploadingFavicon(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `${advertorial.id}-favicon-${Date.now()}.${fileExt}`;
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
      setUploadingFavicon(false);
    }
  };

  return (
    <div className="flex items-start gap-6 animate-fade-in">
      <SettingsSectionNav
        sections={ALL_SECTIONS.filter((s) => (isLesson ? s.id !== 'sticky-cta' : true))}
      />

      <div className="flex-1 min-w-0 grid gap-4 xl:grid-cols-2 items-start">
          {/* Page Info */}
          <SettingsSection id="page-info" title="Page Info" description="Title, SEO description and favicon" className="space-y-3">

            <div className="space-y-1.5">
              <Label className="text-xs">Page Title</Label>
              <Input
                value={settings.title}
                onChange={(e) => updateSettings({ title: e.target.value })}
                placeholder="Enter page title"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Meta Description</Label>
              <Textarea
                value={settings.metaDescription}
                onChange={(e) => updateSettings({ metaDescription: e.target.value })}
                placeholder="SEO description"
                className="text-sm min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Favicon</Label>
              {settings.faviconUrl ? (
                <div className="relative inline-block">
                  <img src={settings.faviconUrl} alt="Favicon" className="h-10 w-10 object-contain rounded border border-border bg-secondary/50" />
                  <button
                    onClick={() => updateSettings({ faviconUrl: '' })}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-full hover:opacity-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{uploadingFavicon ? 'Uploading...' : 'Upload favicon'}</span>
                  <input type="file" accept="image/*" onChange={handleFaviconUpload} disabled={uploadingFavicon} className="hidden" />
                </label>
              )}
              <p className="text-xs text-muted-foreground">Max 1MB. Shows in browser tab.</p>
            </div>
          </SettingsSection>

          {/* Branding */}
          <SettingsSection id="branding" title="Branding" description="Primary brand color" className="space-y-3">

            <div className="space-y-1.5">
              <Label className="text-xs">Brand Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.brandColor}
                  onChange={(e) => updateSettings({ brandColor: e.target.value })}
                  className="w-10 h-9 rounded-md border border-input cursor-pointer"
                />
                <Input
                  value={settings.brandColor}
                  onChange={(e) => updateSettings({ brandColor: e.target.value })}
                  className="h-9 text-sm font-mono flex-1"
                />
              </div>
            </div>
          </SettingsSection>

          {/* Typography */}
          <SettingsSection id="typography" title="Typography" description="Headline and body fonts" className="space-y-3">

            <div className="space-y-1.5">
              <Label className="text-xs">Headline Font</Label>
              <Select
                value={settings.headlineFont}
                onValueChange={(value) => updateSettings({ headlineFont: value })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system-ui">System (Default)</SelectItem>
                  <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Body Font</Label>
              <Select
                value={settings.bodyFont}
                onValueChange={(value) => updateSettings({ bodyFont: value })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system-ui">System (Default)</SelectItem>
                  <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingsSection>

          {/* CTA Style */}
          <SettingsSection id="cta-style" title="CTA Button Style" description="Shape and size of call-to-action buttons" className="space-y-3">

            <div className="space-y-1.5">
              <Label className="text-xs">Button Shape</Label>
              <Select
                value={settings.ctaButtonStyle}
                onValueChange={(value: 'rounded' | 'square' | 'pill') => updateSettings({ ctaButtonStyle: value })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Button Size</Label>
              <Select
                value={settings.ctaButtonSize}
                onValueChange={(value: 'small' | 'medium' | 'large') => updateSettings({ ctaButtonSize: value })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingsSection>

          {/* Sticky Footer CTA - only for advertorials, not lessons */}
          {!isLesson && (
            <SettingsSection id="sticky-cta" title="Sticky Footer CTA" description="Persistent bottom conversion bar" className="space-y-3">

              <div className="flex items-center justify-between">
                <Label className="text-xs">Enable Sticky CTA</Label>
                <Switch
                  checked={settings.stickyCtaEnabled || false}
                  onCheckedChange={(checked) => updateSettings({ stickyCtaEnabled: checked })}
                />
              </div>

              {settings.stickyCtaEnabled && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Button Text</Label>
                    <Input
                      value={settings.stickyCtaText || 'Shop Now'}
                      onChange={(e) => updateSettings({ stickyCtaText: e.target.value })}
                      placeholder="Shop Now"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Button URL</Label>
                    <Input
                      value={settings.stickyCtaUrl || ''}
                      onChange={(e) => updateSettings({ stickyCtaUrl: e.target.value })}
                      placeholder="https://..."
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Button Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.stickyCtaColor || '#0066FF'}
                        onChange={(e) => updateSettings({ stickyCtaColor: e.target.value })}
                        className="w-10 h-9 rounded-md border border-input cursor-pointer"
                      />
                      <Input
                        value={settings.stickyCtaColor || '#0066FF'}
                        onChange={(e) => updateSettings({ stickyCtaColor: e.target.value })}
                        className="h-9 text-sm font-mono flex-1"
                      />
                    </div>
                  </div>
                </>
              )}
            </SettingsSection>
          )}

          {/* Footer */}
          <SettingsSection id="footer" title="Footer" description="Disclaimer shown at the bottom of the page" className="space-y-3">

            <div className="space-y-1.5">
              <Label className="text-xs">Footer Text / Disclaimer</Label>
              <Textarea
                value={settings.footerText}
                onChange={(e) => updateSettings({ footerText: e.target.value })}
                placeholder="Add footer disclaimer text"
                className="text-sm min-h-[110px] resize-none"
              />
            </div>
          </SettingsSection>

          {/* Analytics demo */}
          <SettingsSection id="analytics-demo" title="Analytics Demo" description="Preview the report with sample data" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Preview the analytics report with sample data before you have real traffic.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-1" /> Open demo dashboard
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Analytics demo (sample data)</DialogTitle>
                </DialogHeader>
                <AdvertorialAnalyticsPanel
                  demo
                  events={generateDemoAdvertorialEvents(
                    advertorial.id || 'demo',
                    advertorial.blocks
                      .filter(b => b.type === 'cta-button' || b.type === 'important-update')
                      .map(b => b.id),
                    advertorial.blocks.map(b => b.id)
                  )}
                />
              </DialogContent>
            </Dialog>
          </SettingsSection>
      </div>
    </div>
  );
};
