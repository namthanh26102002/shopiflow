import React, { useEffect, useRef } from 'react';
import { FeedbackConfig } from '@/types/quiz';
import { cn } from '@/lib/utils';

interface FeedbackPageProps {
  config: FeedbackConfig;
  primaryColor?: string;
  textColor?: string;
  compact?: boolean;
  /** Fired once the spinner duration elapses. Omit to disable auto-advance (builder preview). */
  onComplete?: () => void;
}

export const FeedbackPage: React.FC<FeedbackPageProps> = ({
  config,
  primaryColor = '#3B82F6',
  textColor = '#1A1A1A',
  compact = false,
  onComplete,
}) => {
  const completedRef = useRef(false);

  useEffect(() => {
    if (!onComplete) return;
    completedRef.current = false;
    const ms = Math.max(1, config.durationSeconds || 5) * 1000;
    const timer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    }, ms);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.durationSeconds, config.videoUrl, onComplete]);

  return (
    <div className={cn('w-full', compact ? 'space-y-4' : 'space-y-8')}>
      {/* Video */}
      <div className="relative rounded-2xl overflow-hidden bg-black/90">
        {config.videoUrl ? (
          <video
            src={config.videoUrl}
            controls
            playsInline
            className={cn('w-full object-cover', compact ? 'max-h-64' : 'max-h-[420px]')}
          />
        ) : (
          <div
            className={cn(
              'w-full flex items-center justify-center qt-caption',
              compact ? 'h-40' : 'h-56'
            )}
            style={{ color: '#FFFFFF80' }}
          >
            No video added yet
          </div>
        )}

        {config.caption && (
          <div className="px-3 pb-3 pt-2">
            <div
              className={cn(
                'rounded-xl px-4 py-3 font-bold',
                'qt-caption'
              )}
              style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#FFFFFF' }}
            >
              {config.caption}
            </div>
          </div>
        )}
      </div>

      {/* Loading section */}
      <div className={cn('text-center', compact ? 'py-4' : 'py-8')}>
        {config.headline && (
          <h2
            className={cn('qt-headline font-bold text-balance')}
            style={{ color: textColor }}
          >
            {config.headline}
          </h2>
        )}
        {config.subHeadline && (
          <p
            className={cn('qt-sub mt-2')}
            style={{ color: textColor + 'A0' }}
          >
            {config.subHeadline}
          </p>
        )}
        <div className={cn('flex justify-center', compact ? 'mt-4' : 'mt-8')}>
          <div
            className={cn(
              'rounded-full animate-spin',
              compact ? 'w-8 h-8 border-[3px]' : 'w-12 h-12 border-4'
            )}
            style={{
              borderColor: textColor + '25',
              borderTopColor: primaryColor,
            }}
          />
        </div>
      </div>
    </div>
  );
};