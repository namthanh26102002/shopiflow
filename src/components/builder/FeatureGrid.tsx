import React from 'react';
import { CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import { FeatureGridConfig } from '@/types/quiz';
import { sanitizeSvg } from '@/lib/sanitize';

interface Props {
  config: FeatureGridConfig;
  textColor: string;
  compact?: boolean;
}

export const FeatureGrid: React.FC<Props> = ({ config, textColor, compact }) => {
  const ba = config.beforeAfter;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'} style={{ color: textColor }}>
      {config.showGrid && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            {config.headingIconSvg ? (
              <div
                className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} flex-shrink-0 [&>svg]:w-full [&>svg]:h-full`}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(config.headingIconSvg) }}
              />
            ) : (
              <Sparkles className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} style={{ opacity: 0.7 }} />
            )}
            <h3 className={'qt-block-heading font-bold'}>{config.heading}</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(config.cards || []).map((card) => (
              <div
                key={card.id}
                className={`rounded-2xl border ${compact ? 'p-2.5' : 'p-3.5'}`}
                style={{ backgroundColor: `${textColor}08`, borderColor: `${textColor}1A` }}
              >
                <div
                  className={`rounded-xl flex items-center justify-center mb-2 ${compact ? 'w-7 h-7' : 'w-9 h-9'}`}
                  style={{ backgroundColor: `${card.iconColor}22`, color: card.iconColor }}
                >
                  {card.iconSvg ? (
                    <div
                      className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} [&>svg]:w-full [&>svg]:h-full`}
                      dangerouslySetInnerHTML={{ __html: sanitizeSvg(card.iconSvg) }}
                    />
                  ) : (
                    <Sparkles className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  )}
                </div>
                <p className={'qt-block-body font-bold leading-tight'}>{card.title}</p>
                {card.description && (
                  <p className={'qt-caption mt-1 leading-snug'} style={{ opacity: 0.55 }}>
                    {card.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {ba?.enabled && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            {ba.headingIconSvg ? (
              <div
                className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} flex-shrink-0 [&>svg]:w-full [&>svg]:h-full`}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(ba.headingIconSvg) }}
              />
            ) : (
              <ArrowRight className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} style={{ color: ba.afterColor }} />
            )}
            <h3 className={'qt-block-heading font-bold'}>{ba.heading}</h3>
          </div>

          <div
            className={`rounded-2xl border ${compact ? 'p-3' : 'p-4'}`}
            style={{ backgroundColor: `${textColor}08`, borderColor: `${textColor}1A` }}
          >
            {/* Column labels */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className={'qt-caption font-bold tracking-wide'} style={{ color: ba.beforeColor }}>
                {ba.beforeLabel}
              </span>
              <ArrowRight className={compact ? 'w-3 h-3' : 'w-4 h-4'} style={{ opacity: 0.4 }} />
              <span className={'qt-caption font-bold tracking-wide'} style={{ color: ba.afterColor }}>
                {ba.afterLabel}
              </span>
            </div>

            <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
              {(ba.rows || []).map((row) => (
                <div key={row.id} className="grid grid-cols-2 gap-2 items-start">
                  <div className="flex items-start gap-1.5">
                    <XCircle
                      className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0 mt-0.5`}
                      style={{ color: ba.beforeColor }}
                    />
                    <span className="qt-block-body" style={{ opacity: 0.55 }}>
                      {row.beforeText}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2
                      className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0 mt-0.5`}
                      style={{ color: ba.afterColor }}
                    />
                    <span className={'qt-block-body font-medium'}>{row.afterText}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
