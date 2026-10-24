import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LogOut, ExternalLink, Share2 } from 'lucide-react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { ProjectSwitcher } from '@/components/shared/ProjectSwitcher';
import { SaveStatus } from '@/components/shared/SaveStatus';
import { PublishStatus } from '@/components/shared/PublishStatus';
import { AdvertorialPublishDialog } from '@/components/advertorial/AdvertorialPublishDialog';

export const AdvertorialHeader: React.FC = () => {
  const { advertorial, saving, saveFailed, retrySave } = useAdvertorial();
  const { advertorialId } = useParams<{ advertorialId: string }>();
  const { signOut, user } = useAuth();
  const [publishOpen, setPublishOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <BuilderSwitcher />
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground truncate max-w-[12rem]">
              {advertorial.settings.title || 'Untitled'}
            </span>
            <ProjectSwitcher
              table="advertorials"
              basePath="/advertorial-builder"
              noun="advertorial"
              currentId={advertorialId}
              currentTitle={advertorial.settings.title}
              templateContent={{
                settings: advertorial.settings,
                blocks: advertorial.blocks,
              }}
            />
          </div>
          
          <PublishStatus
            liveUrl={advertorial.publishedUrl ? `${window.location.origin}/advertorial/${advertorialId}` : null}
            noun="page"
          />
          <SaveStatus saving={saving} failed={saveFailed} onRetry={retrySave} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="ml-3 hidden xl:inline text-xs text-muted-foreground">{user?.email}</span>

          {advertorial.publishedUrl && (
            <Button
              variant="outline"
              className="h-8 px-3 text-sm"
              onClick={() => window.open(advertorial.publishedUrl, '_blank')}
              title="See the live page"
            >
              <ExternalLink className="w-3.5 h-3.5 lg:mr-1.5" />
              <span className="hidden lg:inline">See Live Preview</span>
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
