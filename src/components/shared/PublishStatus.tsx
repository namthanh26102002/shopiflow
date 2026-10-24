import React, { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PublishStatusProps {
  /** The public URL when published, otherwise null. */
  liveUrl: string | null;
  noun: string;
}

/**
 * Draft or Live, always in view. Once a project is live, autosave publishes
 * every edit, which surprised people when it was only said inside the
 * Publish dialog.
 */
export const PublishStatus: React.FC<PublishStatusProps> = ({ liveUrl, noun }) => {
  const [copied, setCopied] = useState(false);

  if (!liveUrl) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            Draft
          </span>
        </TooltipTrigger>
        <TooltipContent>Only you can see this {noun} until you publish it.</TooltipContent>
      </Tooltip>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={copy}
          aria-label={`Live. Copy the ${noun} link`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
            'border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400',
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Live
          <span className="hidden lg:inline text-green-700/70 dark:text-green-400/70">·</span>
          {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
          <span className="hidden lg:inline">{copied ? 'Copied' : 'Copy link'}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Visitors see this {noun} now. Your edits go live as soon as they save.
      </TooltipContent>
    </Tooltip>
  );
};
