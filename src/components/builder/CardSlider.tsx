import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CardSliderConfig } from '@/types/quiz';
import { sanitizeHtml } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

interface CardSliderProps {
  config: CardSliderConfig;
  primaryColor: string;
  compact?: boolean; // true for LivePreview, false for QuizPublic
}

export const CardSlider: React.FC<CardSliderProps> = ({ config, primaryColor, compact = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number>(0);
  const cards = config.cards;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (config.autoPlaySeconds > 0 && cards.length > 1) {
      timerRef.current = setInterval(() => {
        setActiveIndex(prev => (prev + 1) % cards.length);
      }, config.autoPlaySeconds * 1000);
    }
  }, [config.autoPlaySeconds, cards.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (index: number) => {
    setActiveIndex(index);
    resetTimer();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && activeIndex < cards.length - 1) goTo(activeIndex + 1);
      else if (diff < 0 && activeIndex > 0) goTo(activeIndex - 1);
    }
  };

  if (!cards.length) return null;

  const card = cards[activeIndex];

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden rounded-xl shadow-md bg-white"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {cards.map((c) => (
            <div key={c.id} className="w-full flex-shrink-0">
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt={c.headline}
                  className={cn('w-full object-cover', compact ? 'max-h-32' : 'max-h-52')}
                />
              )}
              <div className={cn('px-4 pb-4 pt-2', compact ? 'space-y-1' : 'space-y-2')}>
                <h3 className={cn('qt-block-heading font-bold')}>
                  {c.headline}
                </h3>
                <p
                  className={cn('qt-block-body font-semibold')}
                  style={{ color: primaryColor }}
                >
                  {c.subHeadline}
                </p>
                <div
                  className="text-muted-foreground break-words overflow-hidden"
                  style={{ fontSize: `${c.bodyFontSize || 14}px` }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.bodyHtml) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'rounded-full transition-all',
                compact ? 'w-1.5 h-1.5' : 'w-2 h-2',
                i === activeIndex ? 'scale-125' : 'opacity-40'
              )}
              style={{ backgroundColor: i === activeIndex ? primaryColor : '#9CA3AF' }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
