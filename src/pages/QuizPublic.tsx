// Public Quiz Page - responsive quiz experience for end users
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Quiz, Question, Product, QuizSettings, ResultsConfig, ButtonSize, ButtonRadius, FontWeight, AnalyzingBar, AnalyzingPopupConfig, ChartConfig, SummaryConfig, ResultQuestionConfig, CardSliderConfig, getQuizTextSizeVars } from '@/types/quiz';
import { cn } from '@/lib/utils';
import { resolveQuizTheme } from '@/lib/quizTheme';
import { useWebFonts } from '@/hooks/useWebFonts';
import { sanitizeHtml, sanitizeSvg } from '@/lib/sanitize';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { addDays, format } from 'date-fns';
import { Check } from 'lucide-react';
import { SummaryPreview } from '@/components/builder/SummaryPreview';
import { TransformationPreview } from '@/components/builder/TransformationPreview';
import { CardSlider } from '@/components/builder/CardSlider';
import { ProjectionBars } from '@/components/builder/ProjectionBars';
import { PhaseTimeline } from '@/components/builder/PhaseTimeline';
import { FeatureGrid } from '@/components/builder/FeatureGrid';
import { ScoreSlider } from '@/components/builder/ScoreSlider';
import { FeedbackPage } from '@/components/builder/FeedbackPage';
import { WarningPage, warningGradient } from '@/components/builder/WarningPage';
import { getAttribution } from '@/lib/attribution';

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
  textColor: string;
  popups?: AnalyzingPopupConfig[];
  onComplete: () => void;
}> = ({ bars, primaryColor, textColor, popups, onComplete }) => {
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
    <div className="space-y-4">
      <div className="flex justify-between items-center text-base" style={{ color: textColor }}>
        <span>{currentBar.label}</span>
        <span className="font-semibold">{Math.round(progress)}%</span>
      </div>
      <div className="h-4 w-full rounded-full overflow-hidden" style={{ backgroundColor: primaryColor + '20' }}>
        <div 
          className="h-full rounded-full transition-all duration-75"
          style={{ width: `${progress}%`, backgroundColor: primaryColor }}
        />
      </div>

      {showPopup && activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" style={{ animation: 'fadeIn 0.2s ease-out' }}>
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

// Custom dot component for data points
const CustomDot = (props: any) => {
  const { cx, cy, index, dataLength } = props;
  if (cx === undefined || cy === undefined) return null;
  
  const isFirst = index === 0;
  const isLast = index === dataLength - 1;
  
  let fillColor = '#eab308'; // yellow for middle points
  if (isFirst) fillColor = '#ef4444'; // red
  if (isLast) fillColor = '#22c55e'; // green
  
  return (
    <g>
      {/* Glow effect for first and last points */}
      {(isFirst || isLast) && (
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill={fillColor}
          opacity={0.2}
        />
      )}
      {/* White border */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="white"
        stroke={fillColor}
        strokeWidth={0}
      />
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fillColor}
        stroke="white"
        strokeWidth={2}
      />
    </g>
  );
};

// Progress Chart Component for public view
const PublicProgressChart: React.FC<{ config: ChartConfig }> = ({ config }) => {
  const today = new Date();
  
  const sortedPoints = [...config.points].sort((a, b) => a.daysFromStart - b.daysFromStart);
  
  const chartData = sortedPoints.map((point, index) => {
    const date = addDays(today, point.daysFromStart);
    return {
      date: point.daysFromStart === 0 ? 'Today' : format(date, 'MMM d'),
      value: point.value,
      label: point.label,
      daysFromStart: point.daysFromStart,
      index,
      dataLength: sortedPoints.length,
    };
  });

  const yAxisTicks = [...new Set(sortedPoints.map(p => p.value))].sort((a, b) => b - a);
  const yAxisLabels = sortedPoints.reduce((acc, p) => {
    acc[p.value] = p.label;
    return acc;
  }, {} as Record<number, string>);

  return (
    <div className="w-full">
      {/* Badges */}
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm" 
          style={{ backgroundColor: '#dc2626', color: 'white' }}>
          <span className="w-2 h-2 rounded-full bg-white opacity-90" />
          {config.startLabel}
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm" 
          style={{ backgroundColor: '#16a34a', color: 'white' }}>
          <Check className="w-3 h-3" strokeWidth={3} />
          {config.goalLabel}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="publicColorGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="publicFillGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
              <stop offset="50%" stopColor="#eab308" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            horizontal={true}
            vertical={false}
            stroke="#F3F4F6"
            strokeDasharray="4 4"
          />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 400 }}
            dy={8}
          />
          <YAxis 
            domain={[0, 100]}
            ticks={yAxisTicks}
            tickFormatter={(value) => yAxisLabels[value] || ''}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
            width={65}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="url(#publicColorGradient)"
            strokeWidth={2.5}
            fill="url(#publicFillGradient)"
            dot={(props) => <CustomDot {...props} dataLength={chartData.length} />}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Render SVG icon string
const renderOptionIcon = (iconSvg: string) => {
  if (!iconSvg || !iconSvg.trim().startsWith('<svg')) {
    return <span className="text-xl">{iconSvg}</span>;
  }
  return (
    <div 
      className="w-6 h-6 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconSvg) }}
    />
  );
};

const QuizPublic: React.FC<{ overrideId?: string }> = ({ overrideId }) => {
  const { quizId: paramId } = useParams<{ quizId: string }>();
  const quizId = overrideId || paramId;
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<PreviewScreen>('question');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});
  const [analyzingComplete, setAnalyzingComplete] = useState<Record<string, boolean>>({});
  const [sessionId] = useState(() => crypto.randomUUID());
  const [responseId, setResponseId] = useState<string | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());
  const pageEnterRef = React.useRef<number>(Date.now());

  // Reset the per-page timer whenever the visitor moves to another page
  useEffect(() => {
    pageEnterRef.current = Date.now();
  }, [currentQuestionIndex]);

  // Set dynamic page title
  useEffect(() => {
    if (quiz?.settings?.title) {
      document.title = quiz.settings.title;
    }
    if (quiz?.settings?.faviconUrl) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = quiz.settings.faviconUrl;
    }
    return () => { document.title = 'QuizFlow - Product Quiz Builder'; };
  }, [quiz?.settings?.title, quiz?.settings?.faviconUrl]);

  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) {
        setError('Quiz not found');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('quizzes')
          .select('id, title, settings, questions, products, results, analytics, published_url, created_at, updated_at')
          .eq('id', quizId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Quiz not found');
          setLoading(false);
          return;
        }

        // Check if quiz is published
        if (!data.published_url) {
          setError('This quiz is not published');
          setLoading(false);
          return;
        }

        const settings = data.settings as unknown as QuizSettings;

        setQuiz({
          id: data.id,
          settings: {
            ...settings,
            backgroundColor: settings.backgroundColor || '#FFFFFF',
            fontColor: settings.fontColor || '#1A1A1A',
            nextButtonText: settings.nextButtonText || 'Next',
            nextButtonSize: settings.nextButtonSize || 'medium',
            nextButtonRadius: settings.nextButtonRadius || 'large',
          },
          questions: data.questions as unknown as Question[],
          products: data.products as unknown as Product[],
          results: data.results as unknown as ResultsConfig,
          analytics: data.analytics as unknown as Quiz['analytics'],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          publishedUrl: data.published_url || undefined,
        });
        setLoading(false);

        // Fire-and-forget: analytics increment + response tracking
        startTimeRef.current = Date.now();
        const totalQ = (data.questions as unknown as Question[]).length;

        supabase
          .from('quizzes')
          .update({
            analytics: {
              ...(data.analytics as object),
              starts: ((data.analytics as { starts?: number })?.starts || 0) + 1,
            },
          })
          .eq('id', quizId)
          .then(() => {});

        supabase
          .from('quiz_responses')
          .insert({
            quiz_id: quizId,
            session_id: sessionId,
            total_questions: totalQ,
            questions_answered: 0,
            last_question_index: 0,
            ...getAttribution(),
          })
          .select('id')
          .single()
          .then(({ data: responseData }) => {
            if (responseData) setResponseId(responseData.id);
            if (!responseData) return;
            // Coarse location (country + region only), fire-and-forget
            supabase.functions
              .invoke('track-visit')
              .then(({ data: geo }) => {
                const country = (geo as { country?: string | null } | null)?.country;
                const region = (geo as { region?: string | null } | null)?.region;
                if (!country && !region) return;
                supabase
                  .from('quiz_responses')
                  .update({ country: country ?? null, region: region ?? null })
                  .eq('id', responseData.id)
                  .then(() => {});
              })
              .catch(() => {});
          });
      } catch (err) {
        console.error('Error loading quiz:', err);
        setError('Failed to load quiz');
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId]);

  // Resolved before the early returns below: hooks must run on every render,
  // and useWebFonts is a hook.
  const theme = resolveQuizTheme(quiz?.settings ?? ({} as Quiz['settings']));
  useWebFonts(theme.webFonts);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading quiz...</div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground mb-2">{error || 'Quiz not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    );
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
          handleNext();
        }, 300);
      }
    }
  };

  const handleAnalyzingComplete = () => {
    setAnalyzingComplete(prev => ({ ...prev, [currentQuestion.id]: true }));
  };

  const handleNext = async () => {
    const nextIndex = currentQuestionIndex + 1;
    const timeOnPage = Date.now() - pageEnterRef.current;

    // Track how long this page was on screen (every page type)
    if (responseId && currentQuestion) {
      supabase
        .from('quiz_page_views')
        .insert({
          response_id: responseId,
          quiz_id: quiz.id,
          page_index: currentQuestionIndex,
          page_type: currentQuestion.type,
          page_label: currentQuestion.text?.trim() || `Page ${currentQuestionIndex + 1}`,
          time_on_page_ms: timeOnPage,
        })
        .then(({ error }) => { if (error) console.error('Page view tracking error:', error); });
    }

    // Track the answer for the current question
    if (responseId && currentQuestion) {
      const answer = selectedAnswers[currentQuestion.id];
      if (answer) {
        const optionIds = Array.isArray(answer) ? answer : [answer];
        const optionTexts = optionIds.map(id => {
          const opt = currentQuestion.options.find(o => o.id === id);
          return opt?.text || '';
        }).filter(Boolean);

        // Insert answer record (fire-and-forget)
        supabase
          .from('quiz_response_answers')
          .insert({
            response_id: responseId,
            quiz_id: quiz.id,
            question_index: currentQuestionIndex,
            question_text: currentQuestion.text || `Question ${currentQuestionIndex + 1}`,
            selected_option_ids: optionIds,
            selected_option_texts: optionTexts,
            time_on_question_ms: timeOnPage,
          })
          .then(({ error }) => { if (error) console.error('Answer tracking error:', error); });
      }
    }

    if (currentQuestionIndex < quiz.questions.length - 1) {
      const nextQuestion = quiz.questions[nextIndex];
      setCurrentQuestionIndex(nextIndex);

      // Update progress in quiz_responses
      if (responseId) {
        const updateData: Record<string, unknown> = {
          last_question_index: nextIndex,
          questions_answered: nextIndex,
        };

        // Mark completed when reaching a result page
        if (nextQuestion?.type === 'result') {
          updateData.completed_at = new Date().toISOString();
          updateData.time_to_complete_ms = Date.now() - startTimeRef.current;
          const topProduct = getRecommendedProducts()[0];
          updateData.result_product_name =
            topProduct?.name ||
            nextQuestion.text?.trim() ||
            'Result';
        }

        await supabase
          .from('quiz_responses')
          .update(updateData)
          .eq('id', responseId);
      }
    }
  };

  const getRecommendedProducts = () => {
    const productScores: Record<string, number> = {};

    Object.entries(selectedAnswers).forEach(([questionId, answer]) => {
      const question = quiz.questions.find((q) => q.id === questionId);
      const optionIds = Array.isArray(answer) ? answer : [answer];
      
      optionIds.forEach(optionId => {
        const option = question?.options.find((o) => o.id === optionId);
        option?.productIds.forEach((productId) => {
          productScores[productId] = (productScores[productId] || 0) + 1;
        });
      });
    });

    return quiz.products
      .filter((p) => productScores[p.id])
      .sort((a, b) => (productScores[b.id] || 0) - (productScores[a.id] || 0))
      .slice(0, 3);
  };

  const bgColor = theme.background;
  const textColor = theme.heading;
  const mutedTextColor = theme.muted;

  // Button styling
  const buttonColor = theme.buttonBg;
  const buttonSize = buttonSizes[quiz.settings.nextButtonSize || 'medium'];
  const buttonRadius = buttonRadii[quiz.settings.nextButtonRadius || 'large'];

  return (
    <div
      className="min-h-screen flex flex-col quiz-typography"
      style={{
        background: currentQuestion?.type === 'warning'
          ? warningGradient(currentQuestion.warningConfig)
          : bgColor,
        color: textColor,
        fontFamily: theme.bodyFont,
        ...getQuizTextSizeVars(quiz.settings.textSizes),
      }}
    >
      {/* Store Branding */}
      {(quiz.settings.logoUrl || quiz.settings.storeName) && (() => {
        const layout = quiz.settings.logoLayout || 'horizontal';
        const size = quiz.settings.logoSize || 'medium';
        const logoSizes = { small: 'h-6 w-6', medium: 'h-8 w-8', large: 'h-12 w-12' };
        const textSizes = { small: 'text-sm', medium: 'text-lg', large: 'text-xl' };
        return (
          <div 
            className={cn(
              'flex items-center justify-center py-4 px-4 border-b',
              layout === 'vertical' ? 'flex-col gap-1' : 'flex-row gap-3'
            )} 
            style={{ borderColor: textColor + '20' }}
          >
            {quiz.settings.logoUrl && (
              <img
                src={quiz.settings.logoUrl}
                alt={quiz.settings.storeName || 'Store logo'}
                className={cn(logoSizes[size], 'object-contain rounded')}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
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
        <div className="flex gap-1.5 px-4 py-3 max-w-lg mx-auto w-full">
          {quiz.questions.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-2 rounded-full transition-colors"
              style={{
                backgroundColor: index <= currentQuestionIndex 
                  ? quiz.settings.primaryColor 
                  : textColor + '20'
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 pt-4 pb-8">
        <div className="w-full max-w-lg">
          {/* Empty state when no questions */}
          {quiz.questions.length === 0 && (
            <div className="text-center animate-fade-in-up">
              <h1 className="qt-headline font-bold mb-4 text-balance">
                This quiz has no questions yet
              </h1>
              <p className="qt-sub" style={{ color: mutedTextColor }}>
                Please check back later
              </p>
            </div>
          )}

          {/* Question Screen */}
            {screen === 'question' && currentQuestion && (
            <div className="animate-fade-in-up">
              {currentQuestion.type !== 'result' && currentQuestion.type !== 'feedback' && currentQuestion.type !== 'warning' && (
                <>
                  <h2 className="qt-headline font-semibold mb-2 text-center text-balance" style={{ color: textColor }}>
                    {currentQuestion.text || 'Your question here...'}
                  </h2>
                  {currentQuestion.subText && (
                    <div
                      className={cn(
                        'qt-sub mb-8 text-center text-balance',
                        fontWeights[quiz.settings.subTextFontWeight || 'normal']
                      )}
                      style={{ color: textColor }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion.subText) }}
                    />
                  )}
                  {!currentQuestion.subText && <div className="mb-8" />}
                </>
              )}

              {/* Blank question type - show image only */}
              {currentQuestion.type === 'blank' && currentQuestion.imageUrl && (
                <div className="flex justify-center mb-8">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt=""
                    className="max-w-full max-h-64 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Card Slider for blank type */}
              {currentQuestion.type === 'blank' && currentQuestion.cardSliderConfig && currentQuestion.cardSliderConfig.cards.length > 0 && (
                <div className="mb-8">
                  <CardSlider
                    config={currentQuestion.cardSliderConfig}
                    primaryColor={quiz.settings.primaryColor}
                  />
                </div>
              )}

              {/* Optional blank-page blocks */}
              {currentQuestion.type === 'blank' && currentQuestion.projectionBarsConfig && (
                <div className="mb-8">
                  <ProjectionBars config={currentQuestion.projectionBarsConfig} textColor={textColor} />
                </div>
              )}
              {currentQuestion.type === 'blank' && currentQuestion.phaseTimelineConfig && (
                <div className="mb-8">
                  <PhaseTimeline config={currentQuestion.phaseTimelineConfig} textColor={textColor} />
                </div>
              )}
              {currentQuestion.type === 'blank' && currentQuestion.featureGridConfig && (
                <div className="mb-8">
                  <FeatureGrid config={currentQuestion.featureGridConfig} textColor={textColor} />
                </div>
              )}

              {/* Analyzing question type */}
              {currentQuestion.type === 'analyzing' && currentQuestion.analyzingBars && (
                <div className="my-10 space-y-6">
                  <AnalyzingProgress 
                    bars={currentQuestion.analyzingBars}
                    primaryColor={quiz.settings.primaryColor}
                    textColor={textColor}
                    popups={currentQuestion.analyzingPopups || (currentQuestion.analyzingPopup ? [currentQuestion.analyzingPopup] : undefined)}
                    onComplete={handleAnalyzingComplete}
                  />
                  {currentQuestion.imageUrl && (
                    <div className="flex justify-center mt-4">
                      <img 
                        src={currentQuestion.imageUrl} 
                        alt=""
                        className="max-w-full max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Chart question type */}
              {currentQuestion.type === 'chart' && currentQuestion.chartConfig && (
                <div className="my-8">
                  <PublicProgressChart config={currentQuestion.chartConfig} />
                </div>
              )}

              {/* Summary question type */}
              {currentQuestion.type === 'summary' && currentQuestion.summaryConfig && (
                <div className="my-4">
                  <SummaryPreview
                    config={currentQuestion.summaryConfig}
                    questionText={currentQuestion.text}
                  />
                </div>
              )}

              {/* Result question type */}
              {currentQuestion.type === 'result' && currentQuestion.resultConfig && (() => {
                const rc = currentQuestion.resultConfig;
                const resolvedConfig = { ...rc };
                
                // Resolve dynamic "now" image from linked question
                if (rc.nowImageFromQuestionId) {
                  const answer = selectedAnswers[rc.nowImageFromQuestionId];
                  const linkedQ = quiz.questions.find(q => q.id === rc.nowImageFromQuestionId);
                  const selectedOptionId = Array.isArray(answer) ? answer[0] : answer;
                  const selectedOption = linkedQ?.options.find(o => o.id === selectedOptionId);
                  if (selectedOption?.imageUrl) resolvedConfig.nowImageUrl = selectedOption.imageUrl;
                }
                
                // Resolve dynamic "goal" image from linked question
                if (rc.goalImageFromQuestionId) {
                  const answer = selectedAnswers[rc.goalImageFromQuestionId];
                  const linkedQ = quiz.questions.find(q => q.id === rc.goalImageFromQuestionId);
                  const selectedOptionId = Array.isArray(answer) ? answer[0] : answer;
                  const selectedOption = linkedQ?.options.find(o => o.id === selectedOptionId);
                  if (selectedOption?.imageUrl) resolvedConfig.goalImageUrl = selectedOption.imageUrl;
                }
                
                return (
                  <div className="my-4">
                    <TransformationPreview config={resolvedConfig} />
                  </div>
                );
              })()}

              {/* Feedback question type */}
              {currentQuestion.type === 'feedback' && currentQuestion.feedbackConfig && (
                <div className="my-4">
                  <FeedbackPage
                    config={currentQuestion.feedbackConfig}
                    primaryColor={quiz.settings.primaryColor}
                    textColor={textColor}
                    onComplete={handleNext}
                  />
                </div>
              )}

              {/* Score slider question type */}
              {currentQuestion.type === 'warning' && currentQuestion.warningConfig && (
                <WarningPage config={currentQuestion.warningConfig} />
              )}

              {currentQuestion.type === 'score-slider' && currentQuestion.scoreSliderConfig && (
                <div className="my-6">
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
                    textColor={textColor}
                  />
                </div>
              )}

              {/* Regular question types - show options */}
              {currentQuestion.type !== 'blank' && currentQuestion.type !== 'analyzing' && currentQuestion.type !== 'chart' && currentQuestion.type !== 'summary' && currentQuestion.type !== 'result' && currentQuestion.type !== 'score-slider' && currentQuestion.type !== 'feedback' && currentQuestion.type !== 'warning' && (() => {
                const hasAnyImage = currentQuestion.options.some((opt) => opt.imageUrl);
                const answerWeight = fontWeights[quiz.settings.answerFontWeight || 'medium'];
                return (
                  <div>
                    {/* Multi-select hint */}
                    {currentQuestion.allowMultiple && (
                      <p className="qt-caption text-center mb-4" style={{ color: mutedTextColor }}>Select all that apply</p>
                    )}
                    <div
                      className={cn(
                        hasAnyImage ? 'grid grid-cols-2 gap-4' : 'space-y-4'
                      )}
                    >
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
                              hasAnyImage ? 'flex flex-col items-center text-center' : 'p-4 flex items-center gap-3'
                            )}
                            style={{
                              borderColor: isSelected ? theme.accent : theme.optionBorder,
                              background: isSelected ? theme.accent + '22' : theme.optionBg,
                              color: theme.optionText,
                            }}
                          >
                            {/* Yes/No icons */}
                            {currentQuestion.type === 'yes-no' && (
                              <div className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                                isYes ? 'bg-green-100' : 'bg-red-100'
                              )}>
                                {isYes ? (
                                  <Check className="w-6 h-6 text-green-600" />
                                ) : (
                                  <X className="w-6 h-6 text-red-500" />
                                )}
                              </div>
                            )}
                            {/* Option icon for multiple choice */}
                            {currentQuestion.type === 'multiple-choice' && option.icon && !hasAnyImage && (
                              <div 
                                className="w-8 h-8 flex items-center justify-center flex-shrink-0 [&>div]:w-full [&>div]:h-full [&_svg]:w-full [&_svg]:h-full"
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
                            <span className={cn('qt-answer', answerWeight, hasAnyImage && 'p-3')}>{option.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Next Button */}
              <div className={cn('mt-8', currentQuestion?.type === 'feedback' && 'hidden')}>
                {currentQuestion?.type === 'result' && currentQuestion.resultConfig ? (
                  <a
                    href={currentQuestion.resultConfig.ctaUrl && currentQuestion.resultConfig.ctaUrl !== '#' ? currentQuestion.resultConfig.ctaUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      const rc = currentQuestion.resultConfig;
                      // Track the result-page CTA click (fire-and-forget)
                      supabase
                        .from('quiz_cta_events')
                        .insert({
                          quiz_id: quiz.id,
                          response_id: responseId,
                          page_index: currentQuestionIndex,
                          button_text: rc?.ctaText || 'Continue',
                          product_name: getRecommendedProducts()[0]?.name || '',
                          target_url: rc?.ctaUrl || '',
                        })
                        .then(({ error }) => { if (error) console.error('CTA tracking error:', error); });
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
  );
};

export default QuizPublic;