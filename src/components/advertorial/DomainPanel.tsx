import React from 'react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { CustomDomainSetup } from '@/components/shared/CustomDomainSetup';
import { ScrollArea } from '@/components/ui/scroll-area';

export const DomainPanel: React.FC = () => {
  const { advertorial, updateSettings } = useAdvertorial();

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Custom Domain</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Connect your own domain</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <CustomDomainSetup
            customDomain={advertorial.settings.customDomain || ''}
            onDomainChange={(domain) => updateSettings({ customDomain: domain })}
            publishedUrl={advertorial.publishedUrl}
            contentId={advertorial.id}
            contentType="advertorial"
          />
        </div>
      </ScrollArea>
    </div>
  );
};
