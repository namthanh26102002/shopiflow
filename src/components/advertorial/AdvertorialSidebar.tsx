import React from 'react';
import { Settings, LayoutGrid, Globe, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdvertorialTab = 'components' | 'settings' | 'domain' | 'analytics';

interface AdvertorialSidebarProps {
  activeTab: AdvertorialTab;
  onTabChange: (tab: AdvertorialTab) => void;
}

const tabs = [
  { id: 'components' as AdvertorialTab, label: 'Blocks', icon: LayoutGrid },
  { id: 'settings' as AdvertorialTab, label: 'Settings', icon: Settings },
  { id: 'domain' as AdvertorialTab, label: 'Domain', icon: Globe },
  { id: 'analytics' as AdvertorialTab, label: 'Analytics', icon: BarChart3 },
];

export const AdvertorialSidebar: React.FC<AdvertorialSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="w-16 border-r border-border bg-card flex flex-col items-center py-4 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors',
            activeTab === tab.id
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <tab.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </aside>
  );
};
