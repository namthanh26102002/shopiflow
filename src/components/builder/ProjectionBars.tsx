import React from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { ProjectionBarsConfig } from '@/types/quiz';

interface Props {
  config: ProjectionBarsConfig;
  textColor: string;
  compact?: boolean;
}

export const ProjectionBars: React.FC<Props> = ({ config, textColor, compact }) => {
  const bars = config.bars || [];
  const chartHeight = compact ? 110 : 150;

  return (
    <div
      className={`rounded-2xl border ${compact ? 'p-3' : 'p-4'}`}
      style={{ backgroundColor: `${textColor}08`, borderColor: `${textColor}1A`, color: textColor }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <h3 className={'qt-block-heading font-bold'}>{config.title}</h3>
        {config.showBadge && (
          <span
            className={'qt-caption inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium'}
            style={{ backgroundColor: `${config.gradientTo}22`, color: config.gradientTo }}
          >
            <TrendingUp className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            {config.badgeText}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex gap-2">
        {/* Axis labels */}
        <div
          className={'qt-caption flex flex-col justify-between flex-shrink-0'}
          style={{ height: chartHeight, opacity: 0.5 }}
        >
          <span>{config.axisHighLabel}</span>
          <span>{config.axisMidLabel}</span>
          <span>{config.axisLowLabel}</span>
        </div>

        {/* Bars */}
        <div className="flex-1 flex items-end justify-around gap-2">
          {bars.map((bar) => (
            <div key={bar.id} className="flex-1 flex flex-col items-center max-w-[80px]">
              <div
                className="w-full rounded-lg overflow-hidden flex items-end"
                style={{ height: chartHeight, backgroundColor: `${textColor}12` }}
              >
                <div
                  className="w-full rounded-lg transition-all duration-500"
                  style={{
                    height: `${Math.min(Math.max(bar.fill, 0), 100)}%`,
                    background: `linear-gradient(to top, ${config.gradientFrom}, ${config.gradientTo})`,
                  }}
                />
              </div>
              <span className={'qt-caption mt-2'} style={{ opacity: 0.6 }}>
                {bar.label}
              </span>
              <span
                className={'qt-block-body font-bold'}
                style={{ color: bar.valueColor || textColor }}
              >
                {bar.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {config.showFootnote && (
        <div
          className={'qt-caption flex items-center justify-center gap-1.5 mt-4 pt-3 border-t'}
          style={{ borderColor: `${textColor}1A`, opacity: 0.5 }}
        >
          <Info className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          {config.footnoteText}
        </div>
      )}
    </div>
  );
};
