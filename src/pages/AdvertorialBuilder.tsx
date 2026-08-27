// Advertorial Page Builder - drag-and-drop content editor
import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AdvertorialProvider, useAdvertorial } from '@/contexts/AdvertorialContext';
import { AdvertorialHeader } from '@/components/advertorial/AdvertorialHeader';
import { AdvertorialSidebar, AdvertorialTab } from '@/components/advertorial/AdvertorialSidebar';
import { ComponentLibrary } from '@/components/advertorial/ComponentLibrary';
import { SettingsPanel } from '@/components/advertorial/SettingsPanel';
import { DomainPanel } from '@/components/advertorial/DomainPanel';
import { BlocksList } from '@/components/advertorial/BlocksList';
import { BlockEditor } from '@/components/advertorial/BlockEditor';
import { LivePreview } from '@/components/advertorial/LivePreview';
import { AdvertorialAnalyticsPanel } from '@/components/advertorial/AdvertorialAnalyticsPanel';

const AdvertorialBuilderContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdvertorialTab>('components');
  const { notFound } = useAdvertorial();

  // Deleted, or someone else's — send them back to the project list.
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

            <div className="w-[420px] flex-shrink-0 bg-card overflow-hidden flex flex-col">
              <LivePreview />
            </div>
          </div>
        ) : (
          <>
            {/* Left Panel - Component Library or Settings */}
            <div className="w-48 border-r border-border bg-card overflow-hidden">
              {activeTab === 'components' && <ComponentLibrary />}
            </div>

            {/* Blocks List */}
            <div className="w-80 border-r border-border bg-card overflow-hidden">
              <BlocksList />
            </div>

            {/* Edit Properties */}
            <div className="flex-1 min-w-[400px] border-r border-border bg-card overflow-hidden">
              <BlockEditor />
            </div>

            {/* Right Panel - Live Preview (mobile only) */}
            <div className="w-[420px] flex-shrink-0 overflow-hidden">
              <LivePreview />
            </div>
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
