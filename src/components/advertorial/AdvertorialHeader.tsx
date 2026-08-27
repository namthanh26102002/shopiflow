import React, { useState } from 'react';
import { LogOut, Cloud, CloudOff, ExternalLink, Share2 } from 'lucide-react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { AdvertorialPublishDialog } from '@/components/advertorial/AdvertorialPublishDialog';

export const AdvertorialHeader: React.FC = () => {
  const { advertorial, saving } = useAdvertorial();
  const { signOut, user } = useAuth();
  const [publishOpen, setPublishOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <BuilderSwitcher />
          
          <div className="h-6 w-px bg-border" />
          
          <div className="text-sm">
            <span className="text-muted-foreground">{advertorial.settings.title || 'Untitled'}</span>
          </div>
          
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saving ? (
              <>
                <CloudOff className="w-3.5 h-3.5 animate-pulse" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-green-500" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{user?.email}</span>

          {advertorial.publishedUrl && (
            <Button
              variant="outline"
              className="h-8 px-3 text-sm"
              onClick={() => window.open(advertorial.publishedUrl, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              See Live Preview
            </Button>
          )}

          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-sm"
            onClick={() => setPublishOpen(true)}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            {advertorial.publishedUrl ? 'Update' : 'Publish'}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 text-muted-foreground hover:text-foreground" 
            onClick={signOut} 
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <AdvertorialPublishDialog open={publishOpen} onOpenChange={setPublishOpen} />
    </>
  );
};
