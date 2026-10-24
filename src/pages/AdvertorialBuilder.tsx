// Advertorial Page Builder - drag-and-drop content editor
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AdvertorialProvider, useAdvertorial } from '@/contexts/AdvertorialContext';
import { toast } from 'sonner';
import { AdvertorialHeader } from '@/components/advertorial/AdvertorialHeader';
import { AdvertorialSidebar, AdvertorialTab } from '@/components/advertorial/AdvertorialSidebar';
import { ComponentLibrary } from '@/components/advertorial/ComponentLibrary';
import { SettingsPanel } from '@/components/advertorial/SettingsPanel';
import { DomainPanel } from '@/components/advertorial/DomainPanel';
import { BlocksList } from '@/components/advertorial/BlocksList';
import { BlockEditor } from '@/components/advertorial/BlockEditor';
import { LivePreview } from '@/components/advertorial/LivePreview';
import { PreviewDrawer } from '@/components/shared/PreviewDrawer';
import { AdvertorialAnalyticsPanel } from '@/components/advertorial/AdvertorialAnalyticsPanel';

const AdvertorialBuilderContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdvertorialTab>('components');
  const { notFound } = useAdvertorial();

  // Deleted (possibly in another tab), or someone else's. Say why before
  // sending them back, rather than ejecting silently.
  useEffect(() => {
    if (notFound) toast.error('That advertorial project no longer exists.');
  }, [notFound]);

  if (notFound) return <Navigate to="/advertorial-builder" replace />;

  return (
    <div className="h-screen flex flex-col bg-background">
      <AdvertorialHeader />
      
      <div className="flex-1 flex overflow-hidden">
        <AdvertorialSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === 'domain' ? (
          <div className="flex-1 overflow-hidden">
            <DomainPanel />
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="flex-1 overflow-hidden">
            <AdvertorialAnalyticsPanel />
          </div>
        ) : activeTab === 'settings' ? (
          /* Settings workspace — wide settings area + fixed preview */
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 min-w-0 border-r border-border bg-secondary/20 overflow-y-auto">
              <div className="p-6">
                <SettingsPanel />
              </div>
            </div>

            <div className="hidden xl:flex w-[420px] flex-shrink-0 bg-card overflow-hidden flex-col">
              <LivePreview />
            </div>
            <PreviewDrawer><LivePreview /></PreviewDrawer>
          </div>
        ) : (
          <>
            {/* Left Panel - Component Library or Settings */}
            <div className="w-44 lg:w-48 shrink-0 border-r border-border bg-card overflow-hidden">
              {activeTab === 'components' && <ComponentLibrary />}
            </div>

            {/* Blocks List */}
            <div className="w-56 lg:w-72 2xl:w-80 shrink-0 border-r border-border bg-card overflow-hidden">
              <BlocksList />
            </div>

            {/* Edit Properties */}
            <div className="flex-1 min-w-0 border-r border-border bg-card overflow-hidden">
              <BlockEditor />
            </div>

            {/* Right Panel - Live Preview (mobile only) */}
            <div className="hidden xl:block w-[380px] 2xl:w-[420px] flex-shrink-0 overflow-hidden">
              <LivePreview />
            </div>
            <PreviewDrawer><LivePreview /></PreviewDrawer>
          </>
        )}
      </div>
    </div>
  );
};

const AdvertorialBuilder: React.FC = () => {
  const { advertorialId } = useParams<{ advertorialId: string }>();


  if (!advertorialId) return <Navigate to="/advertorial-builder" replace />;

  return (
    <AdvertorialProvider advertorialId={advertorialId}>
      <AdvertorialBuilderContent />
    </AdvertorialProvider>
  );
};

export default AdvertorialBuilder;
