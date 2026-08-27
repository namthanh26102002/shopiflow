import React from 'react';
import { AlertCircle, AlertTriangle, AlertOctagon, Info, XCircle, ShieldAlert } from 'lucide-react';
import { WarningConfig, WarningIcon } from '@/types/quiz';
import { cn } from '@/lib/utils';

interface WarningPageProps {
  config: WarningConfig;
  compact?: boolean;
}

const iconMap: Record<WarningIcon, React.ElementType> = {
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'alert-octagon': AlertOctagon,
  'info': Info,
  'x-circle': XCircle,
  'shield-alert': ShieldAlert,
};

export const warningGradient = (config?: WarningConfig) =>
  config
    ? `linear-gradient(${config.gradientAngle ?? 180}deg, ${config.gradientFrom}, ${config.gradientTo})`
    : undefined;

export const WarningPage: React.FC<WarningPageProps> = ({ config, compact = false }) => {
  const IconCmp = iconMap[config.icon] || AlertCircle;

  return (
    <div className={cn('w-full text-center flex flex-col items-center', compact ? 'py-4' : 'py-8')}>
      {config.showBadge && config.badgeText && (
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full font-bold tracking-[0.15em] uppercase',
            'qt-caption ' + (compact ? 'px-3 py-1' : 'px-4 py-2')
          )}
          style={{ backgroundColor: config.badgeBgColor, color: config.badgeTextColor }}
        >
          <span
            className={cn('rounded-full', compact ? 'w-1.5 h-1.5' : 'w-2 h-2')}
            style={{ backgroundColor: config.badgeTextColor }}
          />
          {config.badgeText}
        </div>
      )}

      {config.showIcon && (
        <div
          className={cn('rounded-full flex items-center justify-center', compact ? 'w-16 h-16 mt-4' : 'w-28 h-28 mt-6')}
          style={{
            backgroundColor: config.iconBgColor + '40',
            boxShadow: `0 0 60px ${config.iconBgColor}55`,
          }}
        >
          <div
            className={cn('rounded-full flex items-center justify-center', compact ? 'w-11 h-11' : 'w-20 h-20')}
            style={{ backgroundColor: config.iconBgColor + 'CC' }}
          >
            <IconCmp
              className={compact ? 'w-5 h-5' : 'w-9 h-9'}
              style={{ color: config.iconColor }}
              strokeWidth={2}
            />
          </div>
        </div>
      )}

      {config.showStat && (
        <div className={compact ? 'mt-4' : 'mt-6'}>
          {config.statValue && (
            <div
              className={cn('font-extrabold leading-none tracking-tight', compact ? 'text-4xl' : 'text-6xl')}
              style={{ color: config.statColor }}
            >
              {config.statValue}
            </div>
          )}
          {config.statLabel && (
            <div
              className={cn('qt-sub', compact ? 'mt-1.5' : 'mt-3')}
              style={{ color: config.statLabelColor }}
            >
              {config.statLabel}
            </div>
          )}
        </div>
      )}

      {config.headline && (
        <h2
          className={cn(
            'font-extrabold text-balance tracking-tight',
            'qt-headline ' + (compact ? 'mt-4' : 'mt-8')
          )}
          style={{ color: config.headlineColor }}
        >
          {config.headline}
        </h2>
      )}

      {config.bodyText && (
        <p
          className={cn('qt-sub text-balance max-w-md', compact ? 'mt-3' : 'mt-6')}
          style={{ color: config.bodyColor }}
        >
          {config.bodyText}
        </p>
      )}
    </div>
  );
};