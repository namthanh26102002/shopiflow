import React, { useState } from 'react';
import { Download, LogOut, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { ProjectSwitcher } from '@/components/shared/ProjectSwitcher';
import { SaveStatus } from '@/components/shared/SaveStatus';
import { useAuth } from '@/hooks/useAuth';
import { useThemeEditor, type PreviewDevice } from '@/contexts/ThemeEditorContext';
import { exportThemeZip } from '@/lib/shopifyTheme/exportZip';
import { templateLabel } from './SectionTree';
import { ShopifyPanel } from './ShopifyPanel';

const downloadBytes = (bytes: Uint8Array, fileName: string) => {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

export const ThemeHeader: React.FC = () => {
  const { themeId, title, setTitle, data, template, setTemplate, device, setDevice, saving, saveFailed, retrySave } = useThemeEditor();
  const { signOut } = useAuth();
  const [installOpen, setInstallOpen] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleExport = () => {
    const result = exportThemeZip(data, title);
    if ('problems' in result) {
      console.error('Theme export problems:', result.problems);
      toast.error('This theme cannot be exported yet', { description: result.problems.slice(0, 3).join('\n') });
      return;
    }
    downloadBytes(result.bytes, result.fileName);
    setFileName(result.fileName);
    setInstallOpen(true);
  };

  const templates = Object.keys(data.templates).sort((a, b) => (a === 'index' ? -1 : b === 'index' ? 1 : a.localeCompare(b)));

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <BuilderSwitcher />
          <div className="h-6 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-1">
            <Input
              aria-label="Theme name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 w-36 border-transparent bg-transparent px-1.5 text-sm shadow-none hover:border-input focus-visible:border-input lg:w-48"
            />
            <ProjectSwitcher table="shopify_themes" basePath="/theme-builder" noun="theme" currentId={themeId} currentTitle={title} />
          </div>
          <SaveStatus saving={saving} failed={saveFailed} onRetry={retrySave} />
        </div>

        <div className="flex items-center gap-2">
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="h-8 w-44 text-sm" aria-label="Page to edit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((name) => (
                <SelectItem key={name} value={name}>
                  {templateLabel(name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={device}
            onValueChange={(value) => value && setDevice(value as PreviewDevice)}
            className="hidden rounded-md border border-input p-0.5 md:flex"
            aria-label="Preview size"
          >
            <ToggleGroupItem value="desktop" className="h-7 w-8 p-0" aria-label="Desktop preview" title="Desktop">
              <Monitor className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="mobile" className="h-7 w-8 p-0" aria-label="Mobile preview" title="Mobile">
              <Smartphone className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <ShopifyPanel />

          <Button size="sm" className="h-8" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download for Shopify</span>
            <span className="sm:hidden">Download</span>
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your theme is downloading</DialogTitle>
            <DialogDescription>
              {fileName} is in your downloads. To put it on your store:
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            <li>In your Shopify admin, go to <strong>Online Store → Themes</strong>.</li>
            <li>Under Theme library, click <strong>Add theme → Upload zip file</strong> and choose the file.</li>
            <li>Click <strong>Customize</strong> on the new theme to add your logo, images and products.</li>
            <li>When it looks right, click <strong>Publish</strong>.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Uploading does not change your live store. The theme stays unpublished until you publish it.
          </p>
          <DialogFooter>
            <Button onClick={() => setInstallOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
