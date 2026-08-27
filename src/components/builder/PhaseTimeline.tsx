import React from 'react';
import { PhaseTimelineConfig } from '@/types/quiz';
import { sanitizeSvg } from '@/lib/sanitize';

interface Props {
  config: PhaseTimelineConfig;
  textColor: string;
  compact?: boolean;
}

export const PhaseTimeline: React.FC<Props> = ({ config, textColor, compact }) => {
  const phases = config.phases || [];

  return (
    <div style={{ color: textColor }}>
      {/* Heading */}
      <div className="flex items-center gap-2 mb-3">
        {config.headingIconSvg && (
          <div
            className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} flex-shrink-0 [&>svg]:w-full [&>svg]:h-full`}
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(config.headingIconSvg) }}
          />
        )}
        <h3 className={'qt-block-heading font-bold'}>{config.heading}</h3>
      </div>

      <div
        className={`rounded-2xl border ${compact ? 'p-3' : 'p-4'}`}
        style={{ backgroundColor: `${textColor}08`, borderColor: `${textColor}1A` }}
      >
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute top-2 bottom-2 w-px"
            style={{ left: compact ? 4 : 5, backgroundColor: `${textColor}1F` }}
          />

          <div className={compact ? 'space-y-3' : 'space-y-4'}>
            {phases.map((phase) => (
              <div key={phase.id} className={`relative ${compact ? 'pl-5' : 'pl-6'}`}>
                {/* Dot */}
                <div
                  className={`absolute top-1 rounded-full ${compact ? 'w-2 h-2 left-0' : 'w-2.5 h-2.5 left-0'}`}
                  style={{ backgroundColor: phase.dotColor }}
                />

                <div className="flex items-start justify-between gap-2">
                  <span
                    className={'qt-caption font-semibold'}
                    style={{ color: config.gradientFrom }}
                  >
                    {phase.rangeLabel}
                  </span>
                  {phase.badgeText && (
                    <span
                      className={'qt-caption rounded-full px-2 py-0.5 font-medium flex-shrink-0'}
                      style={{ backgroundColor: `${phase.badgeColor}22`, color: phase.badgeColor }}
                    >
                      {phase.badgeText}
                    </span>
                  )}
                </div>

                <p className={'qt-block-body font-bold mt-0.5'}>{phase.title}</p>
                {phase.description && (
                  <p className="qt-caption" style={{ opacity: 0.55 }}>
                    {phase.description}
                  </p>
                )}

                {/* Progress */}
                <div
                  className={`w-full rounded-full mt-2 ${compact ? 'h-1' : 'h-1.5'}`}
                  style={{ backgroundColor: `${textColor}14` }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max(phase.progress, 0), 100)}%`,
                      background: `linear-gradient(to right, ${config.gradientFrom}, ${config.gradientTo})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
