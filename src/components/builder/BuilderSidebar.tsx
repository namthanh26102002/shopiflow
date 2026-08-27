import React from 'react';
import { Settings, ListChecks, BarChart3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BuilderTab = 'questions' | 'products' | 'settings' | 'analytics' | 'domain';

interface BuilderSidebarProps {
  activeTab: BuilderTab;
  onTabChange: (tab: BuilderTab) => void;
}

const tabs = [
  { id: 'questions' as BuilderTab, label: 'Questions', icon: ListChecks },
  { id: 'settings' as BuilderTab, label: 'Settings', icon: Settings },
  { id: 'analytics' as BuilderTab, label: 'Analytics', icon: BarChart3 },
  { id: 'domain' as BuilderTab, label: 'Domain', icon: Globe },
];

export const BuilderSidebar: React.FC<BuilderSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="w-16 border-r border-border-subtle bg-card flex flex-col items-center py-4 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors',
            activeTab === tab.id
              ? 'bg-primary-light text-primary'
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
