import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, RotateCcw, Check, X } from 'lucide-react';
import { useQuiz } from '@/contexts/QuizContext';
import { cn } from '@/lib/utils';
import { PreviewSkeleton } from './BuilderSkeleton';
import { ButtonSize, ButtonRadius, FontWeight, AnalyzingBar, AnalyzingPopupConfig, CardSliderConfig, getQuizTextSizeVars } from '@/types/quiz';
import { Progress } from '@/components/ui/progress';
import { ProgressChart } from './ProgressChart';
import { SummaryPreview } from './SummaryPreview';
import { TransformationPreview } from './TransformationPreview';
import { CardSlider } from './CardSlider';
import { ProjectionBars } from './ProjectionBars';
import { PhaseTimeline } from './PhaseTimeline';
import { FeatureGrid } from './FeatureGrid';
import { ScoreSlider } from './ScoreSlider';
import { FeedbackPage } from './FeedbackPage';
import { WarningPage, warningGradient } from './WarningPage';
import { sanitizeSvg } from '@/lib/sanitize';

type PreviewScreen = 'question' | 'results';

const fontWeights: Record<FontWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
};

const buttonSizes: Record<ButtonSize, string> = {
  small: 'py-2.5 px-4 text-sm',
  medium: 'py-3 px-6 text-base',
  large: 'py-4 px-8 text-lg',
};

const buttonRadii: Record<ButtonRadius, string> = {
  none: 'rounded-none',
  small: 'rounded-md',
  medium: 'rounded-lg',
  large: 'rounded-xl',
  full: 'rounded-full',
};

// Animated progress bar component for analyzing type
const AnalyzingProgress: React.FC<{
  bars: AnalyzingBar[];
  primaryColor: string;
  popups?: AnalyzingPopupConfig[];
  onComplete: () => void;
}> = ({ bars, primaryColor, popups, onComplete }) => {
  const [currentBarIndex, setCurrentBarIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [activePopup, setActivePopup] = useState<AnalyzingPopupConfig | null>(null);
  const [dismissedBars, setDismissedBars] = useState<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showPopup) return;

    const bar = bars[currentBarIndex];
    if (!bar) {
      onComplete();
      return;
    }

    const duration = bar.duration * 1000;
    const interval = 50;
    const increment = 100 / (duration / interval);

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + increment, 100);

        // Check if any popup should trigger for current bar
        const popupForBar = popups?.find(
          p => p.enabled && (p.triggerBarIndex || 0) === currentBarIndex
        );
        if (
          popupForBar &&
          !dismissedBars.has(currentBarIndex) &&
          prev < (popupForBar.triggerPercent || 50) &&
          next >= (popupForBar.triggerPercent || 50)
        ) {
          if (timerRef.current) clearInterval(timerRef.current);
          setActivePopup(popupForBar);
          setShowPopup(true);
          return popupForBar.triggerPercent || 50;
        }

        if (next >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (currentBarIndex < bars.length - 1) {
            setTimeout(() => {
              setCurrentBarIndex(prev => prev + 1);
              setProgress(0);
            }, 200);
          } else {
            setTimeout(onComplete, 500);
          }
          return 100;
        }
        return next;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentBarIndex, bars, onComplete, showPopup, dismissedBars, popups]);

  const handlePopupAnswer = () => {
    setShowPopup(false);
    setActivePopup(null);
    setDismissedBars(prev => new Set(prev).add(currentBarIndex));
  };

  const currentBar = bars[currentBarIndex];
  if (!currentBar) return null;

  return (
    <div className="space-y-3 relative">
      <div className="flex justify-between items-center text-sm">
        <span>{currentBar.label}</span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: primaryColor + '20' }}>
        <div 
          className="h-full rounded-full transition-all duration-75"
          style={{ width: `${progress}%`, backgroundColor: primaryColor }}
        />
      </div>

      {/* Popup overlay */}
      {showPopup && activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl text-center space-y-4">
            <p className="text-sm text-gray-500">{activePopup.subtitle || 'To move forward, please specify'}</p>
            <p className="text-lg font-semibold text-gray-900">{activePopup.questionText || 'Continue?'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handlePopupAnswer}
                className="px-8 py-2.5 rounded-full text-white font-medium text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {activePopup.noButtonText || 'No'}
              </button>
              <button
                onClick={handlePopupAnswer}
                className="px-8 py-2.5 rounded-full text-white font-medium text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {activePopup.yesButtonText || 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Render SVG icon string
const renderOptionIcon = (iconSvg: string) => {
  if (!iconSvg || !iconSvg.trim().startsWith('<svg')) {
    return <span className="text-lg">{iconSvg}</span>;
  }
  return (
    <div 
      className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconSvg) }}
    />
  );
};

export const LivePreview: React.FC = () => {
  const { quiz, loading } = useQuiz();
  const [screen, setScreen] = useState<PreviewScreen>('question');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});
  const [analyzingComplete, setAnalyzingComplete] = useState<Record<string, boolean>>({});

  if (loading) {
    return <PreviewSkeleton />;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = quiz.questions.length > 0 
    ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 
    : 0;

  // Check if current question has a selected answer, is blank, analyzing is complete, or is chart
  const canProceed = currentQuestion?.type === 'blank' || 
    currentQuestion?.type === 'chart' ||
    currentQuestion?.type === 'summary' ||
    currentQuestion?.type === 'result' ||
    (currentQuestion?.type === 'analyzing' && analyzingComplete[currentQuestion.id]) ||
    (currentQuestion && (() => {
      const answer = selectedAnswers[currentQuestion.id];
      if (Array.isArray(answer)) return answer.length > 0;
      return !!answer;
    })());

  // Helper to check if an option is selected
  const isOptionSelected = (optionId: string) => {
    if (!currentQuestion) return false;
    const answer = selectedAnswers[currentQuestion.id];
    if (Array.isArray(answer)) return answer.includes(optionId);
    return answer === optionId;
  };

  const handleSelectAnswer = (optionId: string) => {
    if (!currentQuestion) return;
    
    if (currentQuestion.allowMultiple) {
      // Toggle behavior for multi-select
      setSelectedAnswers(prev => {
        const current = prev[currentQuestion.id];
        const currentArray = Array.isArray(current) ? current : current ? [current] : [];
        
        if (currentArray.includes(optionId)) {
          // Remove if already selected
          const updated = currentArray.filter(id => id !== optionId);
          return { ...prev, [currentQuestion.id]: updated };
        } else {
          // Add to selection
          return { ...prev, [currentQuestion.id]: [...currentArray, optionId] };
        }
      });
    } else {
      // Single select
      setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
      // Auto-advance if enabled
      if (quiz.settings.autoAdvanceSingleAnswer) {
        setTimeout(() => {
          if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
          }
        }, 300);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleAnalyzingComplete = () => {
    setAnalyzingComplete(prev => ({ ...prev, [currentQuestion.id]: true }));
  };

  const handleReset = () => {
    setScreen('question');
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setAnalyzingComplete({});
  };

  const getRecommendedProducts = () => {
    const productScores: Record<string, number> = {};
    
    Object.entries(selectedAnswers).forEach(([questionId, answer]) => {
      const question = quiz.questions.find(q => q.id === questionId);
      const optionIds = Array.isArray(answer) ? answer : [answer];
      
      optionIds.forEach(optionId => {
        const option = question?.options.find(o => o.id === optionId);
        option?.productIds.forEach(productId => {
          productScores[productId] = (productScores[productId] || 0) + 1;
        });
      });
    });

    return quiz.products
      .filter(p => productScores[p.id])
      .sort((a, b) => (productScores[b.id] || 0) - (productScores[a.id] || 0))
      .slice(0, 3);
  };

  // Button styling
  const buttonColor = quiz.settings.nextButtonColor || quiz.settings.primaryColor;
  const buttonSize = buttonSizes[quiz.settings.nextButtonSize || 'medium'];
  const buttonRadius = buttonRadii[quiz.settings.nextButtonRadius || 'large'];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          title="Reset preview"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 bg-secondary/30 overflow-auto">
        <div 
          className={cn(
            "preview-frame max-w-sm mx-auto flex flex-col quiz-typography",
            (currentQuestion?.type === 'result' || currentQuestion?.type === 'summary') ? 'min-h-[640px]' : 'aspect-[9/16]'
          )}
          style={{ 
            '--brand-color': quiz.settings.primaryColor,
            backgroundColor: quiz.settings.backgroundColor || '#FFFFFF',
            backgroundImage: currentQuestion?.type === 'warning'
              ? warningGradient(currentQuestion.warningConfig)
              : undefined,
            color: quiz.settings.fontColor || '#1A1A1A',
            ...getQuizTextSizeVars(quiz.settings.textSizes, true),
          } as React.CSSProperties}
        >
          {/* Store Branding */}
          {(quiz.settings.logoUrl || quiz.settings.storeName) && (() => {
            const layout = quiz.settings.logoLayout || 'horizontal';
            const size = quiz.settings.logoSize || 'medium';
            const logoSizes = { small: 'h-5 w-5', medium: 'h-7 w-7', large: 'h-10 w-10' };
            const textSizes = { small: 'text-xs', medium: 'text-sm', large: 'text-base' };
            return (
              <div 
                className={cn(
                  'flex items-center justify-center py-3 px-4 border-b',
                  layout === 'vertical' ? 'flex-col gap-1' : 'flex-row gap-2'
                )} 
                style={{ borderColor: (quiz.settings.fontColor || '#1A1A1A') + '20' }}
              >
                {quiz.settings.logoUrl && (
                  <img
                    src={quiz.settings.logoUrl}
                    alt={quiz.settings.storeName || 'Store logo'}
                    className={cn(logoSizes[size], 'object-contain rounded')}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {quiz.settings.storeName && (
                  <span className={cn('font-semibold', textSizes[size])}>{quiz.settings.storeName}</span>
                )}
              </div>
            );
          })()}

          {/* Segmented Progress Bar */}
          {screen === 'question' && quiz.questions.length > 0 && (
            <div className="flex gap-1.5 px-4 py-3">
              {quiz.questions.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 h-2 rounded-full transition-colors"
                  style={{
                    backgroundColor: index <= currentQuestionIndex 
                      ? quiz.settings.primaryColor 
                      : (quiz.settings.fontColor || '#1A1A1A') + '20'
                  }}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto preview-scroll flex flex-col px-6 pt-2 pb-6">
            {/* Empty state when no questions */}
            {quiz.questions.length === 0 && (
              <div className="flex-1 flex flex-col justify-center text-center animate-fade-in-up">
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: `${quiz.settings.primaryColor}20` }}
                >
                  <span className="text-2xl">📝</span>
                </div>
                <h1 className="text-xl font-bold text-foreground mb-3 text-balance">
                  Your Quiz Preview
                </h1>
                <p className="text-sm text-muted-foreground mb-4 text-balance">
                  Add questions to see the preview
                </p>
              </div>
            )}

            {/* Question Screen */}
            {screen === 'question' && currentQuestion && (
              <div className="flex-1 flex flex-col animate-fade-in-up">
                <div className="flex-1">
                  {currentQuestion.type !== 'result' && currentQuestion.type !== 'feedback' && currentQuestion.type !== 'warning' && (
                    <>
                      <h2
                        className="qt-headline font-semibold mb-1 text-center text-balance"
                        style={{ color: quiz.settings.fontColor || '#1A1A1A' }}
                      >
                        {currentQuestion.text || 'Your question here...'}
                      </h2>
                      {currentQuestion.subText && (
                        <div
                          className={cn(
                            'qt-sub mb-6 text-center text-balance',
                            fontWeights[quiz.settings.subTextFontWeight || 'normal']
                          )}
                          style={{ color: quiz.settings.fontColor || '#1A1A1A' }}
                          dangerouslySetInnerHTML={{ __html: currentQuestion.subText }}
                        />
                      )}
                      {!currentQuestion.subText && <div className="mb-6" />}
                    </>
                  )}

                  {/* Blank question type - show image only */}
                  {currentQuestion.type === 'blank' && currentQuestion.imageUrl && (
                    <div className="flex justify-center mb-6">
                      <img 
                        src={currentQuestion.imageUrl} 
                        alt=""
                        className="max-w-full max-h-48 object-contain rounded-lg"
                      />
                    </div>
                  )}

                  {/* Card Slider for blank type */}
                  {currentQuestion.type === 'blank' && currentQuestion.cardSliderConfig && currentQuestion.cardSliderConfig.cards.length > 0 && (
                    <div className="mb-6">
                      <CardSlider
                        config={currentQuestion.cardSliderConfig}
                        primaryColor={quiz.settings.primaryColor}
                        compact
                      />
                    </div>
                  )}

                  {/* Optional blank-page blocks */}
                  {currentQuestion.type === 'blank' && currentQuestion.projectionBarsConfig && (
                    <div className="mb-6">
                      <ProjectionBars
                        config={currentQuestion.projectionBarsConfig}
                        textColor={quiz.settings.fontColor || '#1A1A1A'}
                        compact
                      />
                    </div>
                  )}
                  {currentQuestion.type === 'blank' && currentQuestion.phaseTimelineConfig && (
                    <div className="mb-6">
                      <PhaseTimeline
                        config={currentQuestion.phaseTimelineConfig}
                        textColor={quiz.settings.fontColor || '#1A1A1A'}
                        compact
                      />
                    </div>
                  )}
                  {currentQuestion.type === 'blank' && currentQuestion.featureGridConfig && (
                    <div className="mb-6">
                      <FeatureGrid
                        config={currentQuestion.featureGridConfig}
                        textColor={quiz.settings.fontColor || '#1A1A1A'}
                        compact
                      />
                    </div>
                  )}

                  {/* Analyzing question type */}
                  {currentQuestion.type === 'analyzing' && currentQuestion.analyzingBars && (
                    <div className="my-8 space-y-4">
                      <AnalyzingProgress 
                        bars={currentQuestion.analyzingBars}
                        primaryColor={quiz.settings.primaryColor}
                        popups={currentQuestion.analyzingPopups || (currentQuestion.analyzingPopup ? [currentQuestion.analyzingPopup] : undefined)}
                        onComplete={handleAnalyzingComplete}
                      />
                      {currentQuestion.imageUrl && (
                        <div className="flex justify-center mt-4">
                          <img 
                            src={currentQuestion.imageUrl} 
                            alt=""
                            className="max-w-full max-h-40 object-contain rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chart question type */}
                  {currentQuestion.type === 'chart' && currentQuestion.chartConfig && (
                    <div className="my-4">
                      <ProgressChart 
                        config={currentQuestion.chartConfig}
                        primaryColor={quiz.settings.primaryColor}
                      />
                    </div>
                  )}

                  {/* Summary question type */}
                  {currentQuestion.type === 'summary' && currentQuestion.summaryConfig && (
                    <div className="my-2">
                      <SummaryPreview
                        config={currentQuestion.summaryConfig}
                        questionText={currentQuestion.text}
                        compact
                      />
                    </div>
                  )}

                  {/* Result question type */}
                  {currentQuestion.type === 'result' && currentQuestion.resultConfig && (() => {
                    const rc = currentQuestion.resultConfig;
                    const resolvedConfig = { ...rc };
                    
                    // Resolve dynamic images from selected answers (fall back to first option)
                    if (rc.nowImageFromQuestionId) {
                      const answer = selectedAnswers[rc.nowImageFromQuestionId];
                      const linkedQ = quiz.questions.find(q => q.id === rc.nowImageFromQuestionId);
                      if (answer && linkedQ) {
                        const selectedOptionId = Array.isArray(answer) ? answer[0] : answer;
                        const selectedOption = linkedQ.options.find(o => o.id === selectedOptionId);
                        if (selectedOption?.imageUrl) resolvedConfig.nowImageUrl = selectedOption.imageUrl;
                      } else if (linkedQ?.options?.[0]?.imageUrl) {
                        resolvedConfig.nowImageUrl = linkedQ.options[0].imageUrl;
                      }
                    }
                    if (rc.goalImageFromQuestionId) {
                      const answer = selectedAnswers[rc.goalImageFromQuestionId];
                      const linkedQ = quiz.questions.find(q => q.id === rc.goalImageFromQuestionId);
                      if (answer && linkedQ) {
                        const selectedOptionId = Array.isArray(answer) ? answer[0] : answer;
                        const selectedOption = linkedQ.options.find(o => o.id === selectedOptionId);
                        if (selectedOption?.imageUrl) resolvedConfig.goalImageUrl = selectedOption.imageUrl;
                      } else if (linkedQ?.options?.[0]?.imageUrl) {
                        resolvedConfig.goalImageUrl = linkedQ.options[0].imageUrl;
                      }
                    }
                    
                    return (
                      <div className="my-2">
                        <TransformationPreview config={resolvedConfig} compact />
                      </div>
                    );
                  })()}

                  {/* Feedback question type */}
                  {currentQuestion.type === 'feedback' && currentQuestion.feedbackConfig && (
                    <div className="my-2">
                      <FeedbackPage
                        config={currentQuestion.feedbackConfig}
                        primaryColor={quiz.settings.primaryColor}
                        textColor={quiz.settings.fontColor || '#1A1A1A'}
                        compact
                      />
                    </div>
                  )}

                  {/* Score slider question type */}
                  {currentQuestion.type === 'warning' && currentQuestion.warningConfig && (
                    <WarningPage config={currentQuestion.warningConfig} compact />
                  )}

                  {currentQuestion.type === 'score-slider' && currentQuestion.scoreSliderConfig && (
                    <div className="my-4">
                      <ScoreSlider
                        config={currentQuestion.scoreSliderConfig}
                        value={(() => {
                          const a = selectedAnswers[currentQuestion.id];
                          const v = Array.isArray(a) ? a[0] : a;
                          const n = v ? parseInt(v, 10) : NaN;
                          return Number.isFinite(n) ? n : null;
                        })()}
                        onChange={(score) => {
                          setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: String(score) }));
                        }}
                        compact
                        textColor={quiz.settings.fontColor || '#1A1A1A'}
                      />
                    </div>
                  )}

                  {/* Regular question types - show options */}
                  {currentQuestion.type !== 'blank' && currentQuestion.type !== 'analyzing' && currentQuestion.type !== 'chart' && currentQuestion.type !== 'summary' && currentQuestion.type !== 'result' && currentQuestion.type !== 'score-slider' && currentQuestion.type !== 'feedback' && currentQuestion.type !== 'warning' && (() => {
                    const hasAnyImage = currentQuestion.options.some(opt => opt.imageUrl);
                    const answerWeight = fontWeights[quiz.settings.answerFontWeight || 'medium'];
                    return (
                      <div>
                        {/* Multi-select hint */}
                        {currentQuestion.allowMultiple && (
                          <p className="qt-caption text-muted-foreground text-center mb-3">Select all that apply</p>
                        )}
                        <div className={cn(
                          hasAnyImage ? 'grid grid-cols-2 gap-3' : 'space-y-3'
                        )}>
                          {currentQuestion.options.map((option) => {
                            const isSelected = isOptionSelected(option.id);
                            const isYes = option.text.toLowerCase() === 'yes';
                            const isNo = option.text.toLowerCase() === 'no';
                            return (
                              <button
                                key={option.id}
                                onClick={() => handleSelectAnswer(option.id)}
                                className={cn(
                                  'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
                                  hasAnyImage ? 'flex flex-col items-center text-center' : 'p-3 flex items-center gap-3',
                                  isSelected && 'selected'
                                )}
                                style={{
                                  borderColor: isSelected 
                                    ? quiz.settings.primaryColor 
                                    : (quiz.settings.fontColor || '#1A1A1A') + '20',
                                  backgroundColor: isSelected 
                                    ? `${quiz.settings.primaryColor}10` 
                                    : undefined,
                                }}
                              >
                                {/* Yes/No icons */}
                                {currentQuestion.type === 'yes-no' && (
                                  <div className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                    isYes ? 'bg-green-100' : 'bg-red-100'
                                  )}>
                                    {isYes ? (
                                      <Check className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <X className="w-5 h-5 text-red-500" />
                                    )}
                                  </div>
                                )}
                                {/* Option icon for multiple choice */}
                                {currentQuestion.type === 'multiple-choice' && option.icon && !hasAnyImage && (
                                  <div 
                                    className="w-7 h-7 flex items-center justify-center flex-shrink-0 [&>div]:w-full [&>div]:h-full [&_svg]:w-full [&_svg]:h-full"
                                    style={{ color: option.iconColor || '#6B7280' }}
                                  >
                                    {renderOptionIcon(option.icon)}
                                  </div>
                                )}
                                {option.imageUrl && (
                                  <img 
                                    src={option.imageUrl} 
                                    alt={option.text}
                                    className="w-full aspect-square object-cover"
                                  />
                                )}
                                <span className={cn('qt-answer', answerWeight, hasAnyImage && 'p-2')}>{option.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Next Button */}
                <div className={cn('mt-6', currentQuestion?.type === 'feedback' && 'hidden')}>
                  {currentQuestion?.type === 'result' && currentQuestion.resultConfig ? (
                    <a
                      href={currentQuestion.resultConfig.ctaUrl && currentQuestion.resultConfig.ctaUrl !== '#' ? currentQuestion.resultConfig.ctaUrl : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!currentQuestion.resultConfig?.ctaUrl || currentQuestion.resultConfig.ctaUrl === '#' || currentQuestion.resultConfig.ctaUrl === '') {
                          e.preventDefault();
                        }
                      }}
                      className={cn(
                        'qt-button block w-full text-center font-medium text-white transition-all hover:opacity-90',
                        buttonSizes[quiz.settings.nextButtonSize || 'medium'],
                        buttonRadii[currentQuestion.resultConfig.ctaButtonRadius || quiz.settings.nextButtonRadius || 'large']
                      )}
                      style={{ backgroundColor: currentQuestion.resultConfig.ctaButtonColor || buttonColor }}
                    >
                      {currentQuestion.resultConfig.ctaText || 'Continue'}
                    </a>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={!canProceed}
                      className={cn(
                        'qt-button w-full font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
                        buttonSize,
                        buttonRadius
                      )}
                      style={{ backgroundColor: buttonColor }}
                    >
                      {(currentQuestion?.type === 'analyzing' && currentQuestion.analyzingButtonText) || quiz.settings.nextButtonText || 'Next'}
                    </button>
                  )}
                  {currentQuestionIndex === 0 && quiz.settings?.showSkipButton && quiz.settings?.skipButtonUrl && (
                    <a
                      href={quiz.settings.skipButtonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="qt-caption block w-full text-center mt-3 underline opacity-60 hover:opacity-100 transition-opacity"
                      style={{ color: quiz.settings.fontColor || '#1A1A1A' }}
                    >
                      {quiz.settings.skipButtonText || 'Skip Quiz'}
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};