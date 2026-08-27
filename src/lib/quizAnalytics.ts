// Shared analytics data model for quiz reporting (live + demo data).

export interface QuizResponseRow {
  id: string;
  session_id: string;
  started_at: string;
  completed_at: string | null;
  last_question_index: number;
  time_to_complete_ms: number | null;
  questions_answered: number;
  total_questions: number;
  country: string | null;
  region: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  device_type?: string | null;
  result_product_name?: string | null;
}

export interface QuizAnswerRow {
  id: string;
  response_id: string;
  question_index: number;
  question_text: string;
  selected_option_texts: string[];
  time_on_question_ms: number | null;
  answered_at: string;
}

export interface QuizPageViewRow {
  id: string;
  response_id: string;
  page_index: number;
  page_type: string;
  page_label: string;
  time_on_page_ms: number | null;
}

export interface QuizPageMeta {
  index: number;
  label: string;
  type: string;
}

export interface QuizCtaRow {
  id: string;
  response_id: string | null;
  page_index: number;
  button_text: string;
  product_name: string;
  target_url: string;
  created_at: string;
}

export interface QuizAnalyticsData {
  pages: QuizPageMeta[];
  responses: QuizResponseRow[];
  answers: QuizAnswerRow[];
  pageViews: QuizPageViewRow[];
  ctaEvents?: QuizCtaRow[];
}

export interface BreakdownRow {
  label: string;
  count: number;
  share: number;
}

export const toBreakdown = (counts: Record<string, number>): BreakdownRow[] => {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, share: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
};

export const formatDuration = (ms: number): string => {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
};

export interface FunnelRow {
  index: number;
  label: string;
  type: string;
  reached: number;
  dropOffs: number;
  dropOffRate: number;
  reachRate: number;
}

export interface LocationRow {
  country: string;
  region: string;
  sessions: number;
  share: number;
}

export interface PageTimeRow {
  index: number;
  label: string;
  avgSeconds: number;
  samples: number;
}

export const computeQuizAnalytics = (data: QuizAnalyticsData) => {
  const { pages, responses, answers, pageViews } = data;
  const ctaEvents = data.ctaEvents || [];

  const totalStarts = responses.length;
  const completed = responses.filter((r) => r.completed_at !== null);
  const totalCompleted = completed.length;
  const completionRate = totalStarts > 0 ? Math.round((totalCompleted / totalStarts) * 100) : 0;

  const avgTimeMs = completed.length
    ? completed.reduce((s, r) => s + (r.time_to_complete_ms || 0), 0) / completed.length
    : 0;

  const avgQuestions = totalStarts
    ? Math.round((responses.reduce((s, r) => s + r.questions_answered, 0) / totalStarts) * 10) / 10
    : 0;

  // Funnel: how many sessions reached each page and how many quit there.
  const funnel: FunnelRow[] = pages.map((page) => {
    const reached = responses.filter((r) => r.last_question_index >= page.index).length;
    const dropOffs = responses.filter(
      (r) => r.completed_at === null && r.last_question_index === page.index
    ).length;
    return {
      index: page.index,
      label: page.label,
      type: page.type,
      reached,
      dropOffs,
      dropOffRate: reached > 0 ? Math.round((dropOffs / reached) * 100) : 0,
      reachRate: totalStarts > 0 ? Math.round((reached / totalStarts) * 100) : 0,
    };
  });

  const topExitPages = [...funnel].filter((f) => f.dropOffs > 0).sort((a, b) => b.dropOffs - a.dropOffs).slice(0, 5);

  // Time on each page: page-view rows plus answer timings as a fallback.
  const timeBuckets: Record<number, number[]> = {};
  pageViews.forEach((pv) => {
    if (pv.time_on_page_ms && pv.time_on_page_ms > 0) {
      (timeBuckets[pv.page_index] ||= []).push(pv.time_on_page_ms);
    }
  });
  answers.forEach((a) => {
    if (a.time_on_question_ms && a.time_on_question_ms > 0) {
      (timeBuckets[a.question_index] ||= []).push(a.time_on_question_ms);
    }
  });

  const pageTimes: PageTimeRow[] = pages.map((page) => {
    const samples = timeBuckets[page.index] || [];
    const avg = samples.length ? samples.reduce((s, v) => s + v, 0) / samples.length : 0;
    return {
      index: page.index,
      label: page.label,
      avgSeconds: Math.round((avg / 1000) * 10) / 10,
      samples: samples.length,
    };
  });

  const slowestPage = [...pageTimes].sort((a, b) => b.avgSeconds - a.avgSeconds)[0];

  // Locations (country + region only).
  const locMap: Record<string, LocationRow> = {};
  responses.forEach((r) => {
    if (!r.country) return;
    const key = `${r.country}|${r.region || ''}`;
    locMap[key] ||= { country: r.country, region: r.region || '—', sessions: 0, share: 0 };
    locMap[key].sessions++;
  });
  const locatedTotal = Object.values(locMap).reduce((s, l) => s + l.sessions, 0);
  const locations = Object.values(locMap)
    .map((l) => ({ ...l, share: locatedTotal ? Math.round((l.sessions / locatedTotal) * 100) : 0 }))
    .sort((a, b) => b.sessions - a.sessions);

  const countryMap: Record<string, number> = {};
  locations.forEach((l) => {
    countryMap[l.country] = (countryMap[l.country] || 0) + l.sessions;
  });
  const countries = Object.entries(countryMap)
    .map(([country, sessions]) => ({
      country,
      sessions,
      share: locatedTotal ? Math.round((sessions / locatedTotal) * 100) : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  // Answer distribution per question.
  const answersByQuestion: Record<number, { questionText: string; dist: Record<string, number> }> = {};
  answers.forEach((a) => {
    answersByQuestion[a.question_index] ||= { questionText: a.question_text, dist: {} };
    a.selected_option_texts.forEach((t) => {
      answersByQuestion[a.question_index].dist[t] =
        (answersByQuestion[a.question_index].dist[t] || 0) + 1;
    });
  });

  const answersByResponse: Record<string, QuizAnswerRow[]> = {};
  answers.forEach((a) => {
    (answersByResponse[a.response_id] ||= []).push(a);
  });

  // Traffic sources, campaigns and devices.
  const srcCounts: Record<string, number> = {};
  const mediumCounts: Record<string, number> = {};
  const campaignCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  responses.forEach((r) => {
    const src = r.utm_source || r.referrer || 'Direct';
    srcCounts[src] = (srcCounts[src] || 0) + 1;
    if (r.utm_medium) mediumCounts[r.utm_medium] = (mediumCounts[r.utm_medium] || 0) + 1;
    if (r.utm_campaign) campaignCounts[r.utm_campaign] = (campaignCounts[r.utm_campaign] || 0) + 1;
    if (r.device_type) deviceCounts[r.device_type] = (deviceCounts[r.device_type] || 0) + 1;
  });

  const sources = toBreakdown(srcCounts);
  const mediums = toBreakdown(mediumCounts);
  const campaigns = toBreakdown(campaignCounts);
  const devices = toBreakdown(deviceCounts);

  // Completion rate per source (which traffic converts best).
  const sourcePerformance = sources.map((s) => {
    const rows = responses.filter((r) => (r.utm_source || r.referrer || 'Direct') === s.label);
    const done = rows.filter((r) => r.completed_at).length;
    return {
      label: s.label,
      starts: rows.length,
      completions: done,
      completionRate: rows.length ? Math.round((done / rows.length) * 100) : 0,
    };
  });

  // Result / product breakdown across completed sessions.
  const resultCounts: Record<string, number> = {};
  completed.forEach((r) => {
    if (r.result_product_name) resultCounts[r.result_product_name] = (resultCounts[r.result_product_name] || 0) + 1;
  });
  const results = toBreakdown(resultCounts);

  // Result-page CTA clicks.
  const totalCtaClicks = ctaEvents.length;
  const uniqueCtaSessions = new Set(ctaEvents.map((e) => e.response_id).filter(Boolean)).size;
  const ctaClickRate = totalCompleted > 0 ? Math.round((uniqueCtaSessions / totalCompleted) * 100) : 0;
  const ctaButtonCounts: Record<string, number> = {};
  const ctaProductCounts: Record<string, number> = {};
  ctaEvents.forEach((e) => {
    const b = e.button_text || 'Button';
    ctaButtonCounts[b] = (ctaButtonCounts[b] || 0) + 1;
    if (e.product_name) ctaProductCounts[e.product_name] = (ctaProductCounts[e.product_name] || 0) + 1;
  });
  const ctaByButton = toBreakdown(ctaButtonCounts);
  const ctaByProduct = toBreakdown(ctaProductCounts);
  const ctaSessionIds = new Set(ctaEvents.map((e) => e.response_id).filter(Boolean) as string[]);

  // Sessions over time (last 30 days).
  const dayMap: Record<string, { starts: number; completions: number }> = {};
  for (let d = 29; d >= 0; d--) {
    const key = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    dayMap[key] = { starts: 0, completions: 0 };
  }
  responses.forEach((r) => {
    const key = r.started_at.slice(0, 10);
    if (!dayMap[key]) return;
    dayMap[key].starts++;
    if (r.completed_at) dayMap[key].completions++;
  });
  const overTime = Object.entries(dayMap).map(([date, v]) => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    ...v,
  }));

  return {
    totalStarts,
    totalCompleted,
    completionRate,
    avgTimeMs,
    avgTimeDisplay: totalCompleted > 0 ? formatDuration(avgTimeMs) : '—',
    avgQuestions,
    funnel,
    topExitPages,
    pageTimes,
    slowestPage,
    locations,
    countries,
    answersByQuestion,
    answersByResponse,
    sources,
    mediums,
    campaigns,
    devices,
    sourcePerformance,
    results,
    totalCtaClicks,
    ctaClickRate,
    ctaByButton,
    ctaByProduct,
    ctaSessionIds,
    overTime,
  };
};

/* ---------------------------------------------------------------- demo data */

const DEMO_LOCATIONS: Array<[string, string]> = [
  ['United States', 'California'],
  ['United States', 'Texas'],
  ['United States', 'New York'],
  ['United Kingdom', 'England'],
  ['Canada', 'Ontario'],
  ['Australia', 'New South Wales'],
  ['Vietnam', 'Ho Chi Minh'],
  ['Germany', 'Bavaria'],
  ['France', 'Ile-de-France'],
  ['Philippines', 'Metro Manila'],
];

const DEMO_PAGES: QuizPageMeta[] = [
  { index: 0, label: 'Intro', type: 'blank' },
  { index: 1, label: 'What is your main goal?', type: 'multiple-choice' },
  { index: 2, label: 'How long has this been an issue?', type: 'multiple-choice' },
  { index: 3, label: 'The problem', type: 'warning' },
  { index: 4, label: 'How much does this affect your confidence?', type: 'score-slider' },
  { index: 5, label: 'Have you tried anything before?', type: 'multiple-choice' },
  { index: 6, label: 'Checking for updates', type: 'feedback' },
  { index: 7, label: 'Your plan', type: 'chart' },
  { index: 8, label: 'Your result', type: 'result' },
];

const DEMO_OPTIONS: Record<number, string[]> = {
  1: ['Feel more confident', 'Improve performance', 'Fix a specific issue', 'Just curious'],
  2: ['Less than 3 months', '3-12 months', '1-3 years', 'More than 3 years'],
  4: ['Score 1-3', 'Score 4-6', 'Score 7-10'],
  5: ['Yes, several things', 'Yes, one thing', 'No, this is my first try'],
};

const DEMO_SOURCES: Array<[string, string | null, string | null]> = [
  ['facebook', 'paid_social', 'summer_promo'],
  ['facebook', 'paid_social', 'retargeting'],
  ['instagram', 'paid_social', 'creator_ugc'],
  ['tiktok', 'paid_social', 'viral_hook'],
  ['google', 'cpc', 'brand_search'],
  ['newsletter', 'email', 'weekly_digest'],
];

const DEMO_REFERRERS = ['google.com', 'reddit.com', 'youtube.com'];
const DEMO_DEVICES: Array<[string, number]> = [['mobile', 0.72], ['desktop', 0.94], ['tablet', 1]];
const DEMO_PRODUCTS = ['Starter Routine Kit', 'Advanced Repair Set', 'Daily Essentials Bundle'];

// Deterministic pseudo-random so the demo looks identical on every open.
const makeRandom = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

export const generateDemoQuizAnalytics = (sessionCount = 2400): QuizAnalyticsData => {
  const rand = makeRandom(7);
  const pages = DEMO_PAGES;
  const lastIndex = pages.length - 1;

  // Share of sessions still present at each page (plausible funnel decay).
  const retention = [1, 0.94, 0.83, 0.76, 0.68, 0.58, 0.52, 0.47, 0.41];

  const responses: QuizResponseRow[] = [];
  const answers: QuizAnswerRow[] = [];
  const pageViews: QuizPageViewRow[] = [];
  const ctaEvents: QuizCtaRow[] = [];

  const baseTimes = [4200, 9800, 11200, 7600, 14500, 10400, 6200, 12800, 9100];

  for (let i = 0; i < sessionCount; i++) {
    const r = rand();
    let stopIndex = lastIndex;
    for (let p = 1; p <= lastIndex; p++) {
      if (r > retention[p]) {
        stopIndex = p - 1;
        break;
      }
    }

    const completedFlag = stopIndex === lastIndex;
    const startedAt = new Date(Date.now() - Math.floor(rand() * 30 * 86400000));
    const [country, region] = DEMO_LOCATIONS[Math.floor(rand() * DEMO_LOCATIONS.length)];
    const id = `demo-${i}`;

    // Attribution: 70% campaign traffic, 15% organic referral, 15% direct.
    const srcRoll = rand();
    let utm_source: string | null = null;
    let utm_medium: string | null = null;
    let utm_campaign: string | null = null;
    let referrer: string | null = null;
    if (srcRoll < 0.7) {
      const [s, m, c] = DEMO_SOURCES[Math.floor(rand() * DEMO_SOURCES.length)];
      utm_source = s;
      utm_medium = m;
      utm_campaign = c;
    } else if (srcRoll < 0.85) {
      referrer = DEMO_REFERRERS[Math.floor(rand() * DEMO_REFERRERS.length)];
    }

    const deviceRoll = rand();
    const device_type = (DEMO_DEVICES.find(([, max]) => deviceRoll <= max) || DEMO_DEVICES[0])[0];

    let totalMs = 0;
    for (let p = 0; p <= stopIndex; p++) {
      const ms = Math.round(baseTimes[p] * (0.6 + rand() * 0.9));
      totalMs += ms;
      pageViews.push({
        id: `${id}-pv-${p}`,
        response_id: id,
        page_index: p,
        page_type: pages[p].type,
        page_label: pages[p].label,
        time_on_page_ms: ms,
      });

      const options = DEMO_OPTIONS[p];
      if (options) {
        const weighted = Math.floor(Math.pow(rand(), 1.6) * options.length);
        answers.push({
          id: `${id}-a-${p}`,
          response_id: id,
          question_index: p,
          question_text: pages[p].label,
          selected_option_texts: [options[Math.min(weighted, options.length - 1)]],
          time_on_question_ms: ms,
          answered_at: new Date(startedAt.getTime() + totalMs).toISOString(),
        });
      }
    }

    responses.push({
      id,
      session_id: id,
      started_at: startedAt.toISOString(),
      completed_at: completedFlag ? new Date(startedAt.getTime() + totalMs).toISOString() : null,
      last_question_index: stopIndex,
      time_to_complete_ms: completedFlag ? totalMs : null,
      questions_answered: stopIndex,
      total_questions: pages.length,
      country,
      region,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      device_type,
      result_product_name: completedFlag
        ? DEMO_PRODUCTS[Math.floor(Math.pow(rand(), 1.4) * DEMO_PRODUCTS.length) % DEMO_PRODUCTS.length]
        : null,
    });

    // ~34% of finishers click the result CTA.
    if (completedFlag && rand() < 0.34) {
      ctaEvents.push({
        id: `${id}-cta`,
        response_id: id,
        page_index: lastIndex,
        button_text: 'Get my plan',
        product_name: DEMO_PRODUCTS[Math.floor(rand() * DEMO_PRODUCTS.length)],
        target_url: 'https://example.com/checkout',
        created_at: new Date(startedAt.getTime() + totalMs + 4000).toISOString(),
      });
    }
  }

  return { pages, responses, answers, pageViews, ctaEvents };
};
