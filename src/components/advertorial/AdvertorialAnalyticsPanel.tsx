import React, { useState, useEffect, useCallback } from 'react';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Eye, MousePointerClick, Clock, ChevronDown, TrendingUp, MapPin, Megaphone, Smartphone, ArrowDownWideNarrow, PlayCircle, Layers } from 'lucide-react';
import { toBreakdown, BreakdownRow, formatDuration } from '@/lib/quizAnalytics';

interface AdvertorialEvent {
  id: string;
  advertorial_id: string;
  session_id: string;
  event_type: string;
  block_id: string | null;
  target_url: string | null;
  time_on_page_ms: number | null;
  created_at: string;
  country?: string | null;
  region?: string | null;
  device_type?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  percent?: number | null;
}

const BarList: React.FC<{ rows: BreakdownRow[]; limit?: number; empty?: string }> = ({ rows, limit = 8, empty = 'No data yet.' }) => {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {rows.slice(0, limit).map(row => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground truncate mr-2">{row.label}</span>
            <span className="text-foreground font-medium whitespace-nowrap">{row.count} · {row.share}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${row.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

interface AdvertorialAnalyticsPanelProps {
  /** When provided, the panel renders this data instead of querying the database. */
  events?: AdvertorialEvent[];
  demo?: boolean;
}

export const AdvertorialAnalyticsPanel: React.FC<AdvertorialAnalyticsPanelProps> = ({ events: providedEvents, demo }) => {
  const { advertorial } = useAdvertorial();
  const [fetchedEvents, setFetchedEvents] = useState<AdvertorialEvent[]>([]);
  const [loading, setLoading] = useState(!providedEvents);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const events = providedEvents ?? fetchedEvents;

  const fetchEvents = useCallback(async () => {
    if (providedEvents || !advertorial.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('advertorial_events')
        .select('*')
        .eq('advertorial_id', advertorial.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setFetchedEvents((data as AdvertorialEvent[]) || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [advertorial.id, providedEvents]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const pageViews = events.filter(e => e.event_type === 'page_view');
  const ctaClicks = events.filter(e => e.event_type === 'cta_click');
  const pageExits = events.filter(e => e.event_type === 'page_exit' && e.time_on_page_ms);

  const totalViews = pageViews.length;
  const totalClicks = ctaClicks.length;
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';
  const avgTimeMs = pageExits.length > 0
    ? pageExits.reduce((sum, e) => sum + (e.time_on_page_ms || 0), 0) / pageExits.length
    : 0;

  const formatTime = (ms: number) => {
    if (ms < 1000) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Clicks per CTA block
  const clicksByBlock = ctaClicks.reduce<Record<string, { count: number; url: string }>>((acc, e) => {
    const key = e.block_id || 'unknown';
    if (!acc[key]) acc[key] = { count: 0, url: e.target_url || '' };
    acc[key].count++;
    return acc;
  }, {});

  // Locations (country + region only) from page views
  const locationRows = Object.values(
    pageViews.reduce<Record<string, { country: string; region: string; sessions: number }>>((acc, e) => {
      if (!e.country) return acc;
      const key = `${e.country}|${e.region || ''}`;
      acc[key] ||= { country: e.country, region: e.region || '—', sessions: 0 };
      acc[key].sessions++;
      return acc;
    }, {})
  ).sort((a, b) => b.sessions - a.sessions);
  const locatedTotal = locationRows.reduce((s, l) => s + l.sessions, 0);

  /* --- traffic sources & devices (from page views) --- */
  const srcCounts: Record<string, number> = {};
  const campaignCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  pageViews.forEach(e => {
    const s = e.utm_source || e.referrer || 'Direct';
    srcCounts[s] = (srcCounts[s] || 0) + 1;
    if (e.utm_campaign) campaignCounts[e.utm_campaign] = (campaignCounts[e.utm_campaign] || 0) + 1;
    if (e.device_type) deviceCounts[e.device_type] = (deviceCounts[e.device_type] || 0) + 1;
  });
  const sources = toBreakdown(srcCounts);
  const campaigns = toBreakdown(campaignCounts);
  const devices = toBreakdown(deviceCounts);

  /* --- scroll depth: share of sessions that reached each milestone --- */
  const scrollSessions: Record<number, Set<string>> = { 25: new Set(), 50: new Set(), 75: new Set(), 100: new Set() };
  events.filter(e => e.event_type === 'scroll_depth').forEach(e => {
    if (e.percent && scrollSessions[e.percent]) scrollSessions[e.percent].add(e.session_id);
  });
  const scrollRows = [25, 50, 75, 100].map(m => ({
    milestone: m,
    sessions: scrollSessions[m].size,
    share: totalViews ? Math.round((scrollSessions[m].size / totalViews) * 100) : 0,
  }));

  /* --- per-block visibility time --- */
  const blockTime: Record<string, { total: number; samples: number }> = {};
  events.filter(e => e.event_type === 'block_view' && e.block_id).forEach(e => {
    const k = e.block_id as string;
    blockTime[k] ||= { total: 0, samples: 0 };
    blockTime[k].total += e.time_on_page_ms || 0;
    blockTime[k].samples++;
  });
  const blockRows = Object.entries(blockTime)
    .map(([blockId, v]) => ({ blockId, avgMs: v.total / v.samples, samples: v.samples }))
    .sort((a, b) => b.avgMs - a.avgMs);

  /* --- video engagement --- */
  const videoPlays = new Set(events.filter(e => e.event_type === 'video_play').map(e => e.session_id));
  const videoMilestones: Record<number, Set<string>> = { 25: new Set(), 50: new Set(), 75: new Set(), 100: new Set() };
  events.filter(e => e.event_type === 'video_progress').forEach(e => {
    if (e.percent && videoMilestones[e.percent]) videoMilestones[e.percent].add(e.session_id);
  });
  const videoRows = [25, 50, 75, 100].map(m => ({
    milestone: m,
    sessions: videoMilestones[m].size,
    share: videoPlays.size ? Math.round((videoMilestones[m].size / videoPlays.size) * 100) : 0,
  }));
  const videoPlayRate = totalViews ? Math.round((videoPlays.size / totalViews) * 100) : 0;

  // Group events by session
  const sessionMap = events.reduce<Record<string, AdvertorialEvent[]>>((acc, e) => {
    if (!acc[e.session_id]) acc[e.session_id] = [];
    acc[e.session_id].push(e);
    return acc;
  }, {});
  const sessions = Object.entries(sessionMap)
    .sort(([, a], [, b]) => new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime())
    .slice(0, 50);

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Find the block label from advertorial blocks
  const getBlockLabel = (blockId: string | null) => {
    if (!blockId) return 'Unknown';
    const block = advertorial.blocks.find(b => b.id === blockId);
    if (!block) return blockId.slice(0, 8);
    if (block.type === 'cta-button') return (block as any).text || 'CTA Button';
    if (block.type === 'important-update') return (block as any).buttonText || 'Important Update';
    return block.type;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
        {!demo && (
          <Button variant="outline" size="sm" onClick={fetchEvents}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        )}
      </div>

      {demo && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary">
          Sample data — a preview of how your advertorial analytics will look with real traffic.
        </div>
      )}

      {totalViews === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Publish your advertorial and share the link to start tracking.</p>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium">Page Views</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalViews}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MousePointerClick className="w-4 h-4" />
                  <span className="text-xs font-medium">CTA Clicks</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Click-Through Rate</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{ctr}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Avg. Time on Page</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatTime(avgTimeMs)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Clicks per CTA */}
          {locationRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Top locations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {locationRows.slice(0, 10).map(l => {
                  const share = locatedTotal ? Math.round((l.sessions / locatedTotal) * 100) : 0;
                  return (
                    <div key={`${l.country}-${l.region}`} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">{l.region}, {l.country}</span>
                        <span className="text-foreground font-medium whitespace-nowrap">{l.sessions} · {share}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Traffic sources & devices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Traffic sources
                </CardTitle>
              </CardHeader>
              <CardContent><BarList rows={sources} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent><BarList rows={campaigns} empty="No UTM campaigns tagged yet." /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Devices
                </CardTitle>
              </CardHeader>
              <CardContent><BarList rows={devices} /></CardContent>
            </Card>
          </div>

          {/* Scroll depth */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowDownWideNarrow className="w-4 h-4" /> Scroll depth
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scrollRows.map(r => (
                <div key={r.milestone} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Reached {r.milestone}% of the page</span>
                    <span className="text-foreground font-medium">{r.sessions} · {r.share}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${r.share}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Attention per block */}
          {blockRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Attention per section
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {blockRows.slice(0, 10).map(r => {
                  const max = blockRows[0].avgMs || 1;
                  return (
                    <div key={r.blockId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">{getBlockLabel(r.blockId)}</span>
                        <span className="text-foreground font-medium whitespace-nowrap">{formatDuration(r.avgMs)} avg</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((r.avgMs / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Video engagement */}
          {videoPlays.size > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> Video engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {videoPlays.size} sessions played a video ({videoPlayRate}% of visitors)
                </p>
                {videoRows.map(r => (
                  <div key={r.milestone} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Watched {r.milestone}%</span>
                      <span className="text-foreground font-medium">{r.sessions} · {r.share}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${r.share}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {Object.keys(clicksByBlock).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clicks per CTA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(clicksByBlock)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([blockId, data]) => (
                    <div key={blockId} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate max-w-[60%]">{getBlockLabel(blockId)}</span>
                      <span className="font-medium text-foreground">{data.count} clicks</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Sessions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Sessions ({sessions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {sessions.map(([sessionId, sessionEvents]) => {
                const firstEvent = sessionEvents[sessionEvents.length - 1];
                const exitEvent = sessionEvents.find(e => e.event_type === 'page_exit');
                const clickCount = sessionEvents.filter(e => e.event_type === 'cta_click').length;
                const timeOnPage = exitEvent?.time_on_page_ms;

                return (
                  <Collapsible key={sessionId} open={expandedSessions.has(sessionId)}>
                    <CollapsibleTrigger
                      className="w-full flex items-center justify-between py-2 px-2 rounded hover:bg-secondary text-sm text-left"
                      onClick={() => toggleSession(sessionId)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs">
                          {new Date(firstEvent.created_at).toLocaleDateString()} {new Date(firstEvent.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {clickCount > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {clickCount} click{clickCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {timeOnPage && (
                          <span className="text-xs text-muted-foreground">{formatTime(timeOnPage)}</span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSessions.has(sessionId) ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pb-2 space-y-1">
                      {[...sessionEvents].reverse().map(event => (
                        <div key={event.id} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                          <span className="font-mono">{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className={`font-medium ${event.event_type === 'cta_click' ? 'text-primary' : ''}`}>
                            {event.event_type === 'page_view' && '👁 Page View'}
                            {event.event_type === 'cta_click' && `🖱 Click → ${getBlockLabel(event.block_id)}`}
                            {event.event_type === 'page_exit' && `🚪 Exit (${formatTime(event.time_on_page_ms || 0)})`}
                          </span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
