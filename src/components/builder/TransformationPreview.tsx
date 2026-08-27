import React from 'react';
import { ResultQuestionConfig, TransformationMetric, ResultInfoCard } from '@/types/quiz';
import { ChevronRight } from 'lucide-react';

interface TransformationPreviewProps {
  config: ResultQuestionConfig;
  compact?: boolean;
}

const MetricBar: React.FC<{ level: number; color: string }> = ({ level, color }) => (
  <div className="flex gap-1 mt-0.5">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="flex-1 h-1.5 rounded-full"
        style={{ backgroundColor: i <= level ? color : '#E5E7EB' }}
      />
    ))}
  </div>
);

const MetricRow: React.FC<{ metric: TransformationMetric; color: string; side: 'now' | 'goal'; textSize: number; compact?: boolean }> = ({ metric, color, side, textSize, compact }) => (
  <div className={compact ? 'mb-1.5' : 'mb-2'}>
    <p className="text-muted-foreground" style={{ fontSize: `${Math.max(textSize - 2, 7)}px` }}>{metric.label}</p>
    <p className="font-bold" style={{ fontSize: `${textSize}px` }}>
      {side === 'now' ? metric.nowValue : metric.goalValue}
    </p>
    <MetricBar level={side === 'now' ? metric.nowLevel : metric.goalLevel} color={color} />
  </div>
);

// Gradient slider for "slider" info card type
const GradientSlider: React.FC<{ position: number; compact?: boolean }> = ({ position, compact }) => (
  <div className="relative w-full">
    <div className={`w-full rounded-full ${compact ? 'h-2' : 'h-2.5'}`} style={{
      background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)',
    }} />
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-white border-2 border-gray-400`}
      style={{ left: `${Math.min(Math.max(position, 5), 95)}%`, transform: 'translate(-50%, -50%)' }}
    />
  </div>
);

const InfoCardItem: React.FC<{ card: ResultInfoCard; textSize: number; compact?: boolean }> = ({ card, textSize, compact }) => {
  const isHighlighted = card.type === 'highlighted';
  const borderColor = isHighlighted && card.accentColor ? card.accentColor : '#E5E7EB';
  const bgColor = isHighlighted && card.accentColor ? card.accentColor + '10' : undefined;

  const renderIcon = () => {
    if (!card.iconSvg) return null;
    return (
      <div 
        className="w-5 h-5 flex-shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: card.iconSvg }}
      />
    );
  };

  return (
    <div
      className={`rounded-xl border ${compact ? 'p-2.5' : 'p-3.5'} flex items-center justify-between gap-2`}
      style={{
        borderColor,
        backgroundColor: bgColor,
        borderWidth: isHighlighted ? 2 : 1,
      }}
    >
      <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: `${textSize}px` }}>
        {card.label}
      </span>
      <div className="flex-1 flex items-center justify-end gap-2">
        {card.type === 'slider' && (
          <div className="flex-1 max-w-[100px]">
            <GradientSlider position={card.sliderPosition || 50} compact={compact} />
          </div>
        )}
        <span className="font-semibold text-right" style={{ fontSize: `${textSize}px` }}>
          {card.value}
        </span>
        {renderIcon()}
      </div>
    </div>
  );
};

export const TransformationPreview: React.FC<TransformationPreviewProps> = ({ config, compact }) => {
  const infoCards = config.infoCards || [];
  const textSize = config.textSize || 12;

  return (
    <div className="space-y-4">
      {/* Headline */}
      <div
        className={`text-center ${compact ? 'text-xs' : 'text-base'}`}
        dangerouslySetInnerHTML={{ __html: config.headlineHtml }}
      />

      {/* Transformation Cards */}
      <div className="flex items-start gap-1.5">
        {/* Now Card */}
        <div className="flex-1 rounded-xl border border-border-subtle bg-card overflow-hidden">
          <div className={`text-center font-medium border-b border-border-subtle ${compact ? 'py-1 text-[10px]' : 'py-1.5 text-xs'}`} style={{ color: config.nowColor }}>
            {config.nowLabel}
          </div>
          <div className={compact ? 'p-1.5' : 'p-2'}>
            {config.nowImageUrl && (
              <img src={config.nowImageUrl} alt="" className="w-full object-contain rounded-lg mb-1.5" />
            )}
            {config.metrics.map((m) => (
              <MetricRow key={m.id} metric={m} color={config.nowColor} side="now" textSize={textSize} compact={compact} />
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className={`flex-shrink-0 flex items-center ${compact ? 'pt-8' : 'pt-12'}`}>
          <div className="flex" style={{ color: config.goalColor }}>
            <ChevronRight className={compact ? 'w-3 h-3 -mr-1.5' : 'w-4 h-4 -mr-2'} />
            <ChevronRight className={compact ? 'w-3 h-3 -mr-1.5' : 'w-4 h-4 -mr-2'} />
            <ChevronRight className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </div>
        </div>

        {/* Goal Card */}
        <div className="flex-1 rounded-xl border-2 bg-card overflow-hidden" style={{ borderColor: config.goalColor + '40' }}>
          <div className={`text-center font-medium border-b ${compact ? 'py-1 text-[10px]' : 'py-1.5 text-xs'}`} style={{ color: config.goalColor, borderColor: config.goalColor + '40' }}>
            {config.goalLabel}
          </div>
          <div className={compact ? 'p-1.5' : 'p-2'}>
            {config.goalImageUrl && (
              <img src={config.goalImageUrl} alt="" className="w-full object-contain rounded-lg mb-1.5" />
            )}
            {config.metrics.map((m) => (
              <MetricRow key={m.id} metric={m} color={config.goalColor} side="goal" textSize={textSize} compact={compact} />
            ))}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      {infoCards.length > 0 && (
        <div className={`space-y-2 ${compact ? 'mt-2' : 'mt-4'}`}>
          {infoCards.map((card) => (
            <InfoCardItem key={card.id} card={card} textSize={textSize} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
};
