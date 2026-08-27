import type { CSSProperties } from 'react';

export type QuestionType = 'multiple-choice' | 'image-selection' | 'yes-no' | 'blank' | 'analyzing' | 'chart' | 'summary' | 'result' | 'score-slider' | 'feedback' | 'warning';

export type FontWeight = 'normal' | 'medium' | 'semibold';

// ============= Quiz text type system =============
export type QuizTextType =
  | 'headline'
  | 'subheadline'
  | 'answer'
  | 'blockHeading'
  | 'blockBody'
  | 'caption'
  | 'button';

export const QUIZ_TEXT_TYPES: { key: QuizTextType; label: string; description: string; min: number; max: number }[] = [
  { key: 'headline', label: 'Headline', description: 'Question text, page titles', min: 14, max: 48 },
  { key: 'subheadline', label: 'Sub-headline', description: 'Description under headlines', min: 10, max: 32 },
  { key: 'answer', label: 'Answer', description: 'Options, choices, slider labels', min: 10, max: 28 },
  { key: 'blockHeading', label: 'Block heading', description: 'Titles of content blocks', min: 10, max: 32 },
  { key: 'blockBody', label: 'Block body', description: 'Text inside content blocks', min: 9, max: 24 },
  { key: 'caption', label: 'Caption', description: 'Small helper text, badges, labels', min: 8, max: 20 },
  { key: 'button', label: 'Button', description: 'Next / CTA / skip labels', min: 10, max: 28 },
];

export const DEFAULT_TEXT_SIZES: Record<QuizTextType, number> = {
  headline: 24,
  subheadline: 16,
  answer: 16,
  blockHeading: 16,
  blockBody: 14,
  caption: 12,
  button: 16,
};

/** Scale applied inside the compact builder preview frame. */
export const COMPACT_TEXT_SCALE = 0.75;

/** Resolve quiz text sizes into CSS custom properties for the quiz root wrapper. */
export const getQuizTextSizeVars = (
  textSizes: Partial<Record<QuizTextType, number>> | undefined,
  compact = false,
): CSSProperties => {
  const scale = compact ? COMPACT_TEXT_SCALE : 1;
  const vars: Record<string, string> = {};
  (Object.keys(DEFAULT_TEXT_SIZES) as QuizTextType[]).forEach((key) => {
    const px = textSizes?.[key] ?? DEFAULT_TEXT_SIZES[key];
    const cssName = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    vars[`--quiz-fs-${cssName}`] = `${Math.round(px * scale * 100) / 100}px`;
  });
  return vars as CSSProperties;
};

export interface AnswerOption {
  id: string;
  text: string;
  imageUrl?: string;
  icon?: string; // lucide icon name or emoji
  iconColor?: string; // custom color for the icon
  productIds: string[];
}

export interface AnalyzingBar {
  id: string;
  label: string;
  duration: number; // seconds
}

export interface AnalyzingPopupConfig {
  enabled: boolean;
  triggerBarIndex: number;       // which bar triggers the popup (0-based)
  triggerPercent: number;        // at what % the popup appears (default 50)
  subtitle: string;              // e.g. "To move forward, please specify"
  questionText: string;          // e.g. "Does a simpler, effective skincare routine sound good to you?"
  noButtonText: string;          // e.g. "No"
  yesButtonText: string;         // e.g. "Yes"
}

export interface ChartPoint {
  id: string;
  label: string;      // Y-axis label (e.g., "Severe", "Mild", "None")
  value: number;      // Y-axis position (0-100 scale)
  daysFromStart: number; // Days from today (0 = today)
}

export interface ChartConfig {
  yAxisTitle: string;           // e.g., "Severity Level"
  startLabel: string;           // Badge text at start (e.g., "You Are Here")
  goalLabel: string;            // Badge text at end (e.g., "Goal")
  goalDays: number;             // Number of days to reach goal
  points: ChartPoint[];         // Data points for the chart
}

export interface SummaryInfoCard {
  id: string;
  icon: string;               // raw SVG string
  iconColor: string;          // icon background color
  title: string;              // e.g. "Aging type"
  subtitle: string;           // e.g. "Extrinsic"
}

export interface SummaryConfig {
  title: string;              // e.g. "Aging Level"
  conditionText: string;      // e.g. "High"
  conditionColor: string;     // badge/frame color
  imageUrl?: string;          // uploaded image
  levelPosition: number;      // 0-100, position on the gradient bar
  levelLabels: string[];      // e.g. ["Low", "Normal", "Medium", "High"]
  detailTitle: string;        // e.g. "HIGH level"
  detailSubtitle: string;     // description text
  infoCards: SummaryInfoCard[];
  textSize?: number;          // info card text size (default 12)
}

export interface TransformationMetric {
  id: string;
  label: string;              // e.g. "Swelling"
  nowValue: string;           // e.g. "Heavy"
  goalValue: string;          // e.g. "Normal"
  nowLevel: number;           // 1-3 (segments filled)
  goalLevel: number;          // 1-3 (segments filled)
}

export interface ResultInfoCard {
  id: string;
  type: 'slider' | 'text' | 'highlighted';   // slider = gradient bar with score, text = label+value, highlighted = bordered accent card
  label: string;              // e.g. "Current Swelling"
  value: string;              // e.g. "13/16", "High 🔥", "86% in 4 weeks 📈"
  sliderPosition?: number;    // 0-100, only for slider type
  accentColor?: string;       // border/bg tint for highlighted type
  iconSvg?: string;           // raw SVG string for icon on the right
}

export interface ResultQuestionConfig {
  headlineHtml: string;       // rich text headline
  nowLabel: string;           // e.g. "Now"
  goalLabel: string;          // e.g. "Your Goal"
  nowImageUrl?: string;
  goalImageUrl?: string;
  nowImageFromQuestionId?: string;   // dynamic image from image-selection question
  goalImageFromQuestionId?: string;  // dynamic image from image-selection question
  nowColor: string;           // color for "now" bars
  goalColor: string;          // color for "goal" bars
  metrics: TransformationMetric[];
  infoCards: ResultInfoCard[];
  textSize: number;           // shared text size (px) for metrics & info cards (default 12)
  ctaText: string;
  ctaUrl: string;
  ctaButtonColor?: string;    // custom CTA button color
  ctaButtonRadius?: ButtonRadius; // custom CTA button corner radius
}

export interface SliderCard {
  id: string;
  imageUrl?: string;
  headline: string;
  subHeadline: string;
  bodyHtml: string;
  bodyFontSize?: number; // default 14
}

export interface CardSliderConfig {
  cards: SliderCard[];
  autoPlaySeconds: number; // default 5
}

/* ---------- Optional blank-page content blocks ---------- */

export interface ProjectionBar {
  id: string;
  label: string;        // e.g. "Month 1"
  value: string;        // e.g. "35%"
  fill: number;         // 0-100 height percentage
  valueColor?: string;  // optional override for the value text color
}

export interface ProjectionBarsConfig {
  title: string;
  showBadge: boolean;
  badgeText: string;
  axisHighLabel: string;
  axisMidLabel: string;
  axisLowLabel: string;
  showFootnote: boolean;
  footnoteText: string;
  gradientFrom: string;   // bottom color
  gradientTo: string;     // top color
  bars: ProjectionBar[];
}

export interface TimelinePhase {
  id: string;
  rangeLabel: string;   // e.g. "Weeks 1-3"
  title: string;        // e.g. "Foundation"
  description: string;
  badgeText: string;    // e.g. "25%"
  badgeColor: string;
  progress: number;     // 0-100
  dotColor: string;
}

export interface PhaseTimelineConfig {
  heading: string;
  headingIconSvg?: string;
  gradientFrom: string;
  gradientTo: string;
  phases: TimelinePhase[];
}

export interface FeatureCard {
  id: string;
  iconSvg?: string;
  iconColor: string;
  title: string;
  description: string;
}

export interface BeforeAfterRow {
  id: string;
  beforeText: string;
  afterText: string;
}

export interface BeforeAfterConfig {
  enabled: boolean;
  heading: string;
  headingIconSvg?: string;
  beforeLabel: string;
  beforeColor: string;
  afterLabel: string;
  afterColor: string;
  rows: BeforeAfterRow[];
}

export interface FeatureGridConfig {
  showGrid: boolean;
  heading: string;
  headingIconSvg?: string;
  cards: FeatureCard[];
  beforeAfter: BeforeAfterConfig;
}

export interface ScoreSliderRange {
  from: number;          // inclusive
  to: number;            // inclusive
  color: string;         // hex
  label: string;         // e.g. "Low impact"
}

export interface ScoreSliderConfig {
  min: number;           // typically 1
  max: number;           // typically 10
  startLabel: string;    // e.g. "Not at all"
  endLabel: string;      // e.g. "Severely"
  ranges: ScoreSliderRange[];
}

export interface FeedbackConfig {
  videoUrl?: string;       // uploaded or pasted video URL
  caption?: string;        // caption shown under/over the video
  headline: string;        // e.g. "Checking for updates"
  subHeadline: string;     // e.g. "Almost there!"
  durationSeconds: number; // spinner duration before auto-advance
}

export type WarningIcon = 'alert-circle' | 'alert-triangle' | 'alert-octagon' | 'info' | 'x-circle' | 'shield-alert';

export interface WarningConfig {
  // Background gradient
  gradientFrom: string;   // top color
  gradientTo: string;     // bottom color
  gradientAngle: number;  // degrees, e.g. 180 (top -> bottom)
  // Badge / pill
  showBadge: boolean;
  badgeText: string;
  badgeTextColor: string;
  badgeBgColor: string;
  // Icon
  showIcon: boolean;
  icon: WarningIcon;
  iconColor: string;
  iconBgColor: string;
  // Stat
  showStat: boolean;
  statValue: string;
  statLabel: string;
  statColor: string;
  statLabelColor: string;
  // Copy
  headline: string;
  headlineColor: string;
  bodyText: string;
  bodyColor: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  subText?: string;
  options: AnswerOption[];
  required: boolean;
  imageUrl?: string; // For blank question type
  analyzingBars?: AnalyzingBar[]; // For analyzing question type
  analyzingPopup?: AnalyzingPopupConfig; // DEPRECATED: single popup (kept for backward compat)
  analyzingPopups?: AnalyzingPopupConfig[]; // For analyzing: one popup per bar
  analyzingButtonText?: string; // Custom button text for analyzing page
  chartConfig?: ChartConfig; // For chart question type
  summaryConfig?: SummaryConfig; // For summary question type
  resultConfig?: ResultQuestionConfig; // For result question type
  allowMultiple?: boolean; // For multiple-choice and image-selection: allow selecting multiple answers
  cardSliderConfig?: CardSliderConfig; // For blank question type: optional card slider
  projectionBarsConfig?: ProjectionBarsConfig; // For blank question type: optional projection bars
  phaseTimelineConfig?: PhaseTimelineConfig;   // For blank question type: optional phase timeline
  featureGridConfig?: FeatureGridConfig;       // For blank question type: optional feature grid + before/after
  scoreSliderConfig?: ScoreSliderConfig; // For score-slider question type
  feedbackConfig?: FeedbackConfig; // For feedback question type
  warningConfig?: WarningConfig; // For warning question type
}

export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonRadius = 'none' | 'small' | 'medium' | 'large' | 'full';

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  url: string;
}

export interface ResultsConfig {
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
}

export type LogoLayout = 'horizontal' | 'vertical';
export type LogoSize = 'small' | 'medium' | 'large';

export interface QuizSettings {
  title: string;
  welcomeText: string;
  welcomeButtonText: string;
  primaryColor: string;
  backgroundColor: string;
  fontColor: string;
  logoUrl?: string;
  storeName?: string;
  logoLayout?: LogoLayout;
  logoSize?: LogoSize;
  // Next button customization
  nextButtonText: string;
  nextButtonColor?: string;
  nextButtonSize?: ButtonSize;
  nextButtonRadius?: ButtonRadius;
  // Typography
  subTextFontWeight?: FontWeight;
  answerFontWeight?: FontWeight;
  // Text sizes per text type (px)
  textSizes?: Partial<Record<QuizTextType, number>>;
  // Custom domain
  customDomain?: string;
  // Favicon
  faviconUrl?: string;
  // Auto-advance
  autoAdvanceSingleAnswer?: boolean;
  // Skip button
  showSkipButton?: boolean;
  skipButtonText?: string;
  skipButtonUrl?: string;
}

export interface QuizAnalytics {
  starts: number;
  completions: number;
  topProducts: { productId: string; count: number }[];
}

export interface Quiz {
  id: string;
  settings: QuizSettings;
  questions: Question[];
  products: Product[];
  results: ResultsConfig;
  analytics: QuizAnalytics;
  createdAt: Date;
  updatedAt: Date;
  publishedUrl?: string;
}

// Helper function to generate IDs
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// Default quiz factory
export const createDefaultQuiz = (): Quiz => ({
  id: generateId(),
  settings: {
    title: 'Find Your Perfect Product',
    welcomeText: 'Answer a few quick questions and we\'ll recommend the perfect product for you.',
    welcomeButtonText: 'Start Quiz',
    primaryColor: '#0066FF',
    backgroundColor: '#FFFFFF',
    fontColor: '#1A1A1A',
    nextButtonText: 'Next',
    nextButtonSize: 'medium',
    nextButtonRadius: 'large',
  },
  questions: [],
  products: [
    {
      id: generateId(),
      name: 'Product A',
      description: 'Perfect for beginners',
      imageUrl: '',
      price: '$29',
      url: '#',
    },
    {
      id: generateId(),
      name: 'Product B',
      description: 'Best for advanced users',
      imageUrl: '',
      price: '$49',
      url: '#',
    },
  ],
  results: {
    title: 'Your Perfect Match',
    description: 'Based on your answers, we recommend:',
    ctaText: 'Shop Now',
    ctaUrl: '#',
  },
  analytics: {
    starts: 0,
    completions: 0,
    topProducts: [],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createDefaultQuestion = (type: QuestionType = 'multiple-choice'): Question => {
  const baseQuestion = {
    id: generateId(),
    type,
    text: '',
    required: true,
  };

  if (type === 'blank') {
    return {
      ...baseQuestion,
      text: 'Welcome!',
      subText: 'Add your welcome message or informational content here.',
      options: [],
    };
  }

  if (type === 'analyzing') {
    return {
      ...baseQuestion,
      text: 'Creating your profile',
      subText: '',
      options: [],
      analyzingBars: [
        { id: generateId(), label: 'Analyzing your preferences...', duration: 2 },
        { id: generateId(), label: 'Finding your matches...', duration: 2 },
      ],
    };
  }

  if (type === 'chart') {
    return {
      ...baseQuestion,
      text: 'Your Personalized Timeline',
      subText: 'Based on your answers, here\'s when you can expect to see results',
      options: [],
      chartConfig: {
        yAxisTitle: 'Severity',
        startLabel: 'You Are Here',
        goalLabel: 'Goal',
        goalDays: 28,
        points: [
          { id: generateId(), label: 'Severe', value: 100, daysFromStart: 0 },
          { id: generateId(), label: 'Moderate', value: 60, daysFromStart: 7 },
          { id: generateId(), label: 'Mild', value: 30, daysFromStart: 14 },
          { id: generateId(), label: 'None', value: 0, daysFromStart: 28 },
        ],
      },
    };
  }

  if (type === 'summary') {
    return {
      ...baseQuestion,
      text: 'Summary Of Your Skin Profile',
      subText: '',
      options: [],
      summaryConfig: {
        title: 'Aging Level',
        conditionText: 'High',
        conditionColor: '#EF4444',
        levelPosition: 85,
        levelLabels: ['Low', 'Normal', 'Medium', 'High'],
        detailTitle: 'HIGH level',
        detailSubtitle: 'High levels can lead to significant changes in skin texture and appearance over time.',
        infoCards: [
          { id: generateId(), icon: '', iconColor: '#3B82F6', title: 'Aging type', subtitle: 'Extrinsic' },
          { id: generateId(), icon: '', iconColor: '#8B5CF6', title: 'Skin concern', subtitle: 'Wrinkles' },
          { id: generateId(), icon: '', iconColor: '#F59E0B', title: 'Skin type', subtitle: 'Combination' },
          { id: generateId(), icon: '', iconColor: '#10B981', title: 'Goal', subtitle: 'Anti-aging' },
        ],
        textSize: 12,
      },
    };
  }

  if (type === 'result') {
    return {
      ...baseQuestion,
      text: '',
      options: [],
      resultConfig: {
          headlineHtml: '<p style="color: #888; font-size: 14px;">Based on answers, we know</p><p style="font-size: 22px;"><strong>You\'re Just 6–8 Weeks Away From Your Goal.</strong></p>',
        nowLabel: 'Now',
        goalLabel: 'Your Goal',
        nowColor: '#F97316',
        goalColor: '#2DD4BF',
        metrics: [
          { id: generateId(), label: 'Swelling', nowValue: 'Heavy', goalValue: 'Normal', nowLevel: 1, goalLevel: 3 },
          { id: generateId(), label: 'Water Retention', nowValue: 'High', goalValue: 'Low', nowLevel: 1, goalLevel: 3 },
          { id: generateId(), label: 'Blood Flow', nowValue: 'Moderate', goalValue: 'Optimal', nowLevel: 2, goalLevel: 3 },
        ],
        infoCards: [
          { id: generateId(), type: 'slider', label: 'Current Swelling', value: '13/16', sliderPosition: 81 },
          { id: generateId(), type: 'text', label: 'Your Main Goal', value: 'Feel less swollen and more comfortable' },
          { id: generateId(), type: 'text', label: 'Eligibility', value: 'Yes, this plan will work for you! ✅' },
          { id: generateId(), type: 'text', label: 'Urgency', value: 'High 🔥' },
          { id: generateId(), type: 'highlighted', label: 'Likelihood of Success', value: '86% in 4 weeks 📈', accentColor: '#2DD4BF' },
        ],
        textSize: 12,
        ctaText: 'Continue',
        ctaUrl: '',
      },
    };
  }

  if (type === 'yes-no') {
    return {
      ...baseQuestion,
      text: 'Do you prefer...?',
      options: [
        { id: generateId(), text: 'Yes', productIds: [] },
        { id: generateId(), text: 'No', productIds: [] },
      ],
    };
  }

  if (type === 'feedback') {
    return {
      ...baseQuestion,
      text: '',
      options: [],
      feedbackConfig: {
        videoUrl: '',
        caption: 'Sample caption text',
        headline: 'Checking for updates',
        subHeadline: 'Almost there!',
        durationSeconds: 5,
      },
    };
  }

  if (type === 'score-slider') {
    return {
      ...baseQuestion,
      text: 'How much does this affect your confidence?',
      options: [],
      scoreSliderConfig: {
        min: 1,
        max: 10,
        startLabel: 'Not at all',
        endLabel: 'Severely',
        ranges: [
          { from: 1, to: 3, color: '#10B981', label: 'Low impact' },
          { from: 4, to: 6, color: '#8B5CF6', label: 'Moderate impact' },
          { from: 7, to: 10, color: '#EF4444', label: 'High impact' },
        ],
      },
    };
  }

  if (type === 'warning') {
    return {
      ...baseQuestion,
      text: '',
      options: [],
      warningConfig: {
        gradientFrom: '#7F1D2E',
        gradientTo: '#0F172A',
        gradientAngle: 180,
        showBadge: true,
        badgeText: 'THE PROBLEM',
        badgeTextColor: '#F87171',
        badgeBgColor: '#EF444426',
        showIcon: true,
        icon: 'alert-circle',
        iconColor: '#FCA5A5',
        iconBgColor: '#EF4444',
        showStat: true,
        statValue: '30%',
        statLabel: 'of men affected',
        statColor: '#EF4444',
        statLabelColor: '#9CA3AF',
        headline: "It's more than the bedroom",
        headlineColor: '#EF4444',
        bodyText: "Most men don't realize how much lack of control quietly affects their entire life.",
        bodyColor: '#9CA3AF',
      },
    };
  }

  return {
    ...baseQuestion,
    text: 'What do you prefer?',
    options: [
      { id: generateId(), text: 'Option 1', productIds: [] },
      { id: generateId(), text: 'Option 2', productIds: [] },
    ],
  };
};

/* ---------- Defaults for optional blank-page blocks ---------- */

export const createDefaultProjectionBars = (): ProjectionBarsConfig => ({
  title: 'Your Control Level Over Time',
  showBadge: true,
  badgeText: 'Projected',
  axisHighLabel: 'High',
  axisMidLabel: 'Med',
  axisLowLabel: 'Low',
  showFootnote: true,
  footnoteText: 'Based on 2.3M+ user results',
  gradientFrom: '#7C3AED',
  gradientTo: '#22C55E',
  bars: [
    { id: generateId(), label: 'Month 1', value: '35%', fill: 35 },
    { id: generateId(), label: 'Month 2', value: '65%', fill: 65 },
    { id: generateId(), label: 'Month 3', value: '90%+', fill: 100, valueColor: '#22C55E' },
  ],
});

export const createDefaultPhaseTimeline = (): PhaseTimelineConfig => ({
  heading: 'Your 90-Day Transformation',
  gradientFrom: '#7C3AED',
  gradientTo: '#22C55E',
  phases: [
    { id: generateId(), rangeLabel: 'Weeks 1-3', title: 'Foundation', description: 'Build awareness & basic control', badgeText: '25%', badgeColor: '#22C55E', progress: 25, dotColor: '#7C3AED' },
    { id: generateId(), rangeLabel: 'Weeks 4-6', title: 'Strengthening', description: 'Deepen neural connections', badgeText: '50%', badgeColor: '#22C55E', progress: 50, dotColor: '#7C3AED' },
    { id: generateId(), rangeLabel: 'Weeks 7-9', title: 'Advanced Control', description: 'Master arousal management', badgeText: '75%', badgeColor: '#22C55E', progress: 75, dotColor: '#22C55E' },
    { id: generateId(), rangeLabel: 'Weeks 10-12', title: 'Mastery', description: '90%+ improvement achieved', badgeText: '100%', badgeColor: '#22C55E', progress: 100, dotColor: '#7C3AED' },
  ],
});

export const createDefaultFeatureGrid = (): FeatureGridConfig => ({
  showGrid: true,
  heading: "What You'll Master",
  cards: [
    { id: generateId(), iconColor: '#7C3AED', title: 'Pelvic Floor Control', description: 'Strengthen the muscles that control ejaculation' },
    { id: generateId(), iconColor: '#7C3AED', title: 'Arousal Awareness', description: 'Recognize and manage your arousal levels' },
    { id: generateId(), iconColor: '#7C3AED', title: 'Mental Techniques', description: 'Overcome anxiety and stay present' },
    { id: generateId(), iconColor: '#7C3AED', title: 'Edging Mastery', description: 'Train your body to delay climax naturally' },
  ],
  beforeAfter: {
    enabled: true,
    heading: 'Your Transformation',
    beforeLabel: 'BEFORE',
    beforeColor: '#EF4444',
    afterLabel: 'AFTER',
    afterColor: '#22C55E',
    rows: [
      { id: generateId(), beforeText: 'Lasting 1-3 minutes', afterText: '15+ minutes of control' },
      { id: generateId(), beforeText: 'Performance anxiety', afterText: 'Calm confidence' },
      { id: generateId(), beforeText: 'Unpredictable timing', afterText: 'You decide when' },
      { id: generateId(), beforeText: 'Avoiding intimacy', afterText: 'Looking forward to it' },
    ],
  },
});
