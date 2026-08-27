import React, { useState } from 'react';
import { Copy, Check, Link, Loader2, ExternalLink } from 'lucide-react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AdvertorialPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdvertorialPublishDialog: React.FC<AdvertorialPublishDialogProps> = ({ open, onOpenChange }) => {
  const { advertorial, publishAdvertorial, updatePublishedAdvertorial } = useAdvertorial();
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isPublished = !!advertorial.publishedUrl;
  const liveUrl = `${window.location.origin}/advertorial/${advertorial.id}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    if (advertorial.blocks.length === 0) return;
    setPublishing(true);
    try {
      await publishAdvertorial();
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdate = async () => {
    setPublishing(true);
    try {
      await updatePublishedAdvertorial();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Publish Advertorial</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {!isPublished ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Link className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Ready to publish?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once published, your advertorial will be accessible via a public link.
              </p>
              <Button
                onClick={handlePublish}
                disabled={publishing || advertorial.blocks.length === 0}
                className="w-full"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Advertorial'
                )}
              </Button>
              {advertorial.blocks.length === 0 && (
                <p className="text-xs text-destructive mt-2">Add blocks before publishing</p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-600">Live</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Your advertorial is live. Share this link or update it with your latest changes.
              </p>
              <div className="flex gap-2">
                <Input
                  value={liveUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(liveUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View Live
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={publishing}
                  className="flex-1"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Live Page'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
