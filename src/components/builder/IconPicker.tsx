import React, { useState } from 'react';
import { X, Code } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { sanitizeSvg } from '@/lib/sanitize';

interface IconPickerProps {
  value?: string;
  onChange: (svg: string | undefined) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [svgInput, setSvgInput] = useState(value || '');

  const handleSave = () => {
    const trimmed = svgInput.trim();
    onChange(trimmed || undefined);
    setOpen(false);
  };

  const handleClear = () => {
    setSvgInput('');
    onChange(undefined);
    setOpen(false);
  };

  // Check if value is valid SVG
  const isValidSvg = value && value.trim().startsWith('<svg');

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        setSvgInput(value || '');
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'w-12 h-9 p-0 flex items-center justify-center',
            value && 'border-primary'
          )}
        >
          {isValidSvg ? (
            <div 
              className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(value) }}
            />
          ) : (
            <Code className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Paste SVG Code</label>
            <Textarea
              placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...>'
              value={svgInput}
              onChange={(e) => setSvgInput(e.target.value)}
              className="min-h-[100px] text-xs font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Copy SVG from <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">lucide.dev</a> or any icon library
            </p>
          </div>

          {svgInput.trim().startsWith('<svg') && (
            <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <div 
                className="w-6 h-6 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgInput) }}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Save
            </Button>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
