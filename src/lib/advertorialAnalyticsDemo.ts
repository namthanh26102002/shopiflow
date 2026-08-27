// Deterministic sample advertorial analytics data for the demo dashboard.

export interface DemoAdvertorialEvent {
  id: string;
  advertorial_id: string;
  session_id: string;
  event_type: string;
  block_id: string | null;
  target_url: string | null;
  time_on_page_ms: number | null;
  created_at: string;
  country: string | null;
  region: string | null;
  device_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  percent: number | null;
}

const LOCATIONS: Array<[string, string]> = [
  ['United States', 'California'],
  ['United States', 'Florida'],
  ['United Kingdom', 'England'],
  ['Canada', 'Ontario'],
  ['Australia', 'Victoria'],
  ['Vietnam', 'Ha Noi'],
  ['Germany', 'Berlin'],
  ['Philippines', 'Metro Manila'],
];

const SOURCES: Array<[string, string, string]> = [
  ['facebook', 'paid_social', 'advertorial_cold'],
  ['facebook', 'paid_social', 'retargeting'],
  ['instagram', 'paid_social', 'creator_ugc'],
  ['tiktok', 'paid_social', 'viral_hook'],
  ['google', 'cpc', 'brand_search'],
];
const REFERRERS = ['google.com', 'reddit.com', 'news.ycombinator.com'];
const DEVICES: Array<[string, number]> = [['mobile', 0.78], ['desktop', 0.95], ['tablet', 1]];

const makeRandom = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

export const generateDemoAdvertorialEvents = (
  advertorialId: string,
  blockIds: string[] = [],
  allBlockIds: string[] = [],
  sessionCount = 1800
): DemoAdvertorialEvent[] => {
  const rand = makeRandom(13);
  const ctaBlocks = blockIds.length ? blockIds.slice(0, 3) : ['demo-cta-top', 'demo-cta-middle', 'demo-cta-bottom'];
  const contentBlocks = allBlockIds.length
    ? allBlockIds.slice(0, 8)
    : ['demo-hero', 'demo-text-1', 'demo-image', 'demo-video', 'demo-text-2', 'demo-comments'];
  const videoBlock = contentBlocks.find(b => b.includes('video')) || contentBlocks[3] || contentBlocks[0];
  const events: DemoAdvertorialEvent[] = [];

  for (let i = 0; i < sessionCount; i++) {
    const sessionId = `demo-session-${i}`;
    const [country, region] = LOCATIONS[Math.floor(rand() * LOCATIONS.length)];
    const start = new Date(Date.now() - Math.floor(rand() * 30 * 86400000));
    const timeOnPage = Math.round(15000 + Math.pow(rand(), 2) * 240000);

    const srcRoll = rand();
    let utm_source: string | null = null;
    let utm_medium: string | null = null;
    let utm_campaign: string | null = null;
    let referrer: string | null = null;
    if (srcRoll < 0.75) {
      const [s, m, c] = SOURCES[Math.floor(rand() * SOURCES.length)];
      utm_source = s; utm_medium = m; utm_campaign = c;
    } else if (srcRoll < 0.9) {
      referrer = REFERRERS[Math.floor(rand() * REFERRERS.length)];
    }
    const deviceRoll = rand();
    const device_type = (DEVICES.find(([, max]) => deviceRoll <= max) || DEVICES[0])[0];

    const base = {
      advertorial_id: advertorialId,
      session_id: sessionId,
      country,
      region,
      device_type,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
    };

    const push = (
      suffix: string,
      event_type: string,
      offsetMs: number,
      extra: Partial<DemoAdvertorialEvent> = {}
    ) => {
      events.push({
        id: `${sessionId}-${suffix}`,
        event_type,
        block_id: null,
        target_url: null,
        time_on_page_ms: 0,
        percent: null,
        created_at: new Date(start.getTime() + offsetMs).toISOString(),
        ...base,
        ...extra,
      });
    };

    push('view', 'page_view', 0);

    // Scroll depth: deeper scroll for longer sessions
    const depthRoll = rand();
    const maxDepth = depthRoll < 0.2 ? 25 : depthRoll < 0.45 ? 50 : depthRoll < 0.72 ? 75 : 100;
    [25, 50, 75, 100].filter(m => m <= maxDepth).forEach((m, idx) => {
      push(`scroll-${m}`, 'scroll_depth', timeOnPage * (0.15 + idx * 0.2), {
        percent: m,
        time_on_page_ms: Math.round(timeOnPage * (0.15 + idx * 0.2)),
      });
    });

    // Per-block visible time for the blocks reached at this scroll depth
    const reachedCount = Math.max(1, Math.round((maxDepth / 100) * contentBlocks.length));
    contentBlocks.slice(0, reachedCount).forEach((block_id, idx) => {
      push(`block-${idx}`, 'block_view', timeOnPage, {
        block_id,
        time_on_page_ms: Math.round(3000 + rand() * 22000),
      });
    });

    // Video engagement for sessions that reached the video block
    if (reachedCount >= 4 && rand() < 0.62) {
      push('video-play', 'video_play', timeOnPage * 0.3, { block_id: videoBlock, percent: 0 });
      const watched = rand();
      const stop = watched < 0.35 ? 25 : watched < 0.6 ? 50 : watched < 0.82 ? 75 : 100;
      [25, 50, 75, 100].filter(m => m <= stop).forEach(m => {
        push(`video-${m}`, 'video_progress', timeOnPage * 0.3 + m * 200, { block_id: videoBlock, percent: m });
      });
    }

    // ~9% of readers click a CTA, weighted towards the first one
    if (rand() < 0.09) {
      const blockIndex = Math.floor(Math.pow(rand(), 1.5) * ctaBlocks.length);
      push('click', 'cta_click', timeOnPage * 0.7, {
        block_id: ctaBlocks[Math.min(blockIndex, ctaBlocks.length - 1)],
        target_url: 'https://example.com/offer',
        time_on_page_ms: Math.round(timeOnPage * 0.7),
      });
    }

    push('exit', 'page_exit', timeOnPage, { time_on_page_ms: timeOnPage });
  }

  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};
