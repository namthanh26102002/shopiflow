import React from 'react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { ProjectDomainAssignment } from '@/components/shared/ProjectDomainAssignment';
import { ScrollArea } from '@/components/ui/scroll-area';

export const DomainPanel: React.FC = () => {
  const { advertorial, updateSettings } = useAdvertorial();

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Domain</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose which domain serves this advertorial
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <ProjectDomainAssignment
            contentId={advertorial.id}
            contentType="advertorial"
            publishedUrl={advertorial.publishedUrl}
            onDomainChange={(domain) => updateSettings({ customDomain: domain })}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
