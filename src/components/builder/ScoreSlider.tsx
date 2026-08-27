import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScoreSliderConfig } from '@/types/quiz';
import { cn } from '@/lib/utils';

interface ScoreSliderProps {
  config: ScoreSliderConfig;
  value: number | null;
  onChange: (score: number) => void;
  compact?: boolean;
  textColor?: string;
}

const getRangeForScore = (config: ScoreSliderConfig, score: number) => {
  return (
    config.ranges.find((r) => score >= r.from && score <= r.to) ||
    config.ranges[config.ranges.length - 1]
  );
};

export const ScoreSlider: React.FC<ScoreSliderProps> = ({
  config,
  value,
  onChange,
  compact = false,
  textColor = '#1A1A1A',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const { min, max } = config;
  const count = max - min + 1;
  const activeScore = value ?? min;
  const activeRange = value !== null ? getRangeForScore(config, activeScore) : null;

  const pickFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const idx = Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
      const next = min + idx;
      if (next !== value) onChange(next);
    },
    [count, min, onChange, value],
  );

  // Global listeners while dragging
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      pickFromClientX(e.clientX);
    };
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging, pickFromClientX]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    pickFromClientX(e.clientX);
  };

  const circleSize = compact ? 'w-16 h-16 text-2xl' : 'w-20 h-20 text-3xl';
  const labelSize = 'qt-answer';
  const segmentHeight = compact ? 'h-6' : 'h-7';
  const numberSize = 'qt-caption';
  const endLabelSize = 'qt-caption';

  return (
    <div className="w-full select-none">
      {/* Score circle */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold text-white transition-colors shadow-lg',
            circleSize,
          )}
          style={{
            backgroundColor: activeRange ? activeRange.color : (textColor + '30'),
          }}
        >
          {value !== null ? activeScore : '–'}
        </div>
        <div
          className={cn('mt-3 font-semibold transition-colors', labelSize)}
          style={{ color: activeRange ? activeRange.color : (textColor + '80') }}
        >
          {activeRange ? activeRange.label : 'Drag to score'}
        </div>
      </div>

      {/* Segments */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className={cn('mt-5 flex gap-1.5 touch-none cursor-pointer', segmentHeight)}
        style={{ touchAction: 'none' }}
      >
        {Array.from({ length: count }, (_, i) => {
          const score = min + i;
          const range = getRangeForScore(config, score);
          const isActiveScore = value !== null && score === activeScore;
          const isFilled = value !== null && score <= activeScore;
          return (
            <div
              key={score}
              className={cn(
                'flex-1 rounded-md transition-all',
                isActiveScore && 'ring-2 ring-offset-1',
              )}
              style={{
                backgroundColor: range.color,
                opacity: isFilled ? 1 : 0.25,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ['--tw-ring-color' as any]: range.color,
              }}
            />
          );
        })}
      </div>

      {/* Numbers */}
      <div className="mt-1.5 flex gap-1.5">
        {Array.from({ length: count }, (_, i) => {
          const score = min + i;
          const isActive = value !== null && score === activeScore;
          const range = getRangeForScore(config, score);
          return (
            <div
              key={score}
              className={cn('flex-1 text-center font-medium transition-colors', numberSize)}
              style={{ color: isActive ? range.color : textColor + '80' }}
            >
              {score}
            </div>
          );
        })}
      </div>

      {/* End labels */}
      <div className={cn('mt-3 flex justify-between font-medium uppercase tracking-wide', endLabelSize)} style={{ color: textColor + '80' }}>
        <span>{config.startLabel}</span>
        <span>{config.endLabel}</span>
      </div>
    </div>
  );
};