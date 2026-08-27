import React from 'react';
import { SummaryConfig } from '@/types/quiz';
import { Info } from 'lucide-react';
import { sanitizeSvg } from '@/lib/sanitize';

interface SummaryPreviewProps {
  config: SummaryConfig;
  questionText: string;
  compact?: boolean; // for LivePreview (smaller)
}

const renderIcon = (icon: string) => {
  if (!icon || !icon.trim()) return null;
  // If it's an SVG string, sanitize and render
  if (icon.trim().startsWith('<svg')) {
    return (
      <div
        className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(icon) }}
      />
    );
  }
  // Otherwise treat as emoji/text
  return <span className="text-lg leading-none">{icon}</span>;
};

export const SummaryPreview: React.FC<SummaryPreviewProps> = ({ config, questionText, compact }) => {
  const textBase = compact ? 'text-xs' : 'text-sm';
  const textLg = compact ? 'text-sm' : 'text-base';
  const textXl = compact ? 'text-base' : 'text-lg';
  const gap = compact ? 'gap-2' : 'gap-3';
  const p = compact ? 'p-2.5' : 'p-4';
  const iconSize = compact ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <div className={`space-y-${compact ? '3' : '4'}`}>
      {/* Title card with condition badge */}
      <div className={`${p} rounded-xl border`} style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between">
          <span className={`${textLg} font-semibold`}>{config.title}</span>
          <span
            className={`${textBase} font-semibold px-3 py-1 rounded-full`}
            style={{
              backgroundColor: config.conditionColor + '15',
              color: config.conditionColor,
            }}
          >
            {config.conditionText}
          </span>
        </div>
      </div>

      {/* Image */}
      {config.imageUrl && (
        <div className="flex justify-center">
          <img
            src={config.imageUrl}
            alt=""
            className={`rounded-xl w-full object-contain ${compact ? 'max-h-28' : 'max-h-[200px]'}`}
          />
        </div>
      )}

      {/* Gradient level bar */}
      <div className="relative pt-8 pb-2">
        {/* "Your level" tooltip */}
        <div
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${config.levelPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="bg-gray-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap">
            Your level
          </div>
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
        </div>

        {/* Gradient bar */}
        <div className="relative h-3 rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(to right, #93C5FD, #6EE7B7, #FDE047, #FDBA74, #FCA5A5, #EF4444)',
          }}
        >
          {/* Level indicator circle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-md"
            style={{
              left: `${config.levelPosition}%`,
              transform: 'translate(-50%, -50%)',
              borderColor: config.conditionColor,
            }}
          />
        </div>

        {/* Labels below bar */}
        <div className="flex justify-between mt-1.5">
          {config.levelLabels.map((label, i) => (
            <span key={i} className="text-[10px] text-gray-500">{label}</span>
          ))}
        </div>
      </div>

      {/* Detail box */}
      <div
        className={`${p} rounded-xl flex items-start ${gap}`}
        style={{ backgroundColor: config.conditionColor + '10' }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: config.conditionColor + '20' }}
        >
          <Info className="w-3.5 h-3.5" style={{ color: config.conditionColor }} />
        </div>
        <div>
          <p className={`${textBase} font-semibold`} style={{ color: config.conditionColor }}>
            {config.detailTitle}
          </p>
          <p className={`${textBase} mt-0.5`} style={{ color: config.conditionColor + 'CC' }}>
            {config.detailSubtitle}
          </p>
        </div>
      </div>

      {/* 2x2 Info cards grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {config.infoCards.map((card) => (
          <div key={card.id} className={`${p} rounded-xl border flex items-start gap-2.5`} style={{ borderColor: '#e5e7eb' }}>
            <div
              className={`${iconSize} rounded-xl flex items-center justify-center flex-shrink-0`}
              style={{ backgroundColor: card.iconColor + '15', color: card.iconColor }}
            >
              {renderIcon(card.icon) || (
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: card.iconColor + '40' }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: `${(config.textSize || 12) - 2}px` }} className="text-gray-500">{card.title}</p>
              <p style={{ fontSize: `${config.textSize || 12}px` }} className="font-semibold break-words">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
