import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, Legend,
} from 'recharts';
import {
  Users, CheckCircle, Clock, ListChecks, TrendingDown, MapPin, Timer, MessageSquare, ChevronDown,
  Megaphone, Smartphone, Package, MousePointerClick, CalendarDays,
} from 'lucide-react';
import {
  QuizAnalyticsData, computeQuizAnalytics, formatDuration, BreakdownRow,
} from '@/lib/quizAnalytics';

interface Props {
  data: QuizAnalyticsData;
  demo?: boolean;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

const DEVICE_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

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

export const QuizAnalyticsDashboard: React.FC<Props> = ({ data, demo }) => {
  const stats = useMemo(() => computeQuizAnalytics(data), [data]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const metrics = [
    { label: 'Total Starts', value: stats.totalStarts, icon: Users },
    { label: 'Completions', value: stats.totalCompleted, icon: CheckCircle },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: TrendingDown },
    { label: 'Avg. Time', value: stats.avgTimeDisplay, icon: Clock },
    { label: 'Avg. Pages Seen', value: stats.avgQuestions || '—', icon: ListChecks },
    { label: 'CTA Clicks', value: `${stats.totalCtaClicks} (${stats.ctaClickRate}%)`, icon: MousePointerClick },
  ];

  const sessions = useMemo(
    () => [...data.responses].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()).slice(0, 50),
    [data.responses]
  );

  return (
    <div className="space-y-6">
      {demo && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary">
          Sample data — this is a preview of how your analytics will look once real visitors take your quiz.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </Card>
        ))}
      </div>

      {/* Sessions over time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Sessions over time (last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.overTime}>
              <defs>
                <linearGradient id="quizStartsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="starts" name="Starts" stroke="hsl(var(--primary))" fill="url(#quizStartsFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="completions" name="Completions" stroke="hsl(var(--destructive))" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drop-off funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> Drop-off by page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={stats.funnel}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval={0} height={50} angle={-20} textAnchor="end" />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="reached" name="Reached" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dropOffs" name="Quit here" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-1">
            {stats.funnel.map(row => (
              <div key={row.index} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate mr-3">{row.index + 1}. {row.label}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {row.reached} reached ({row.reachRate}%) · {row.dropOffs} quit
                  {row.dropOffs > 0 && <span className="text-destructive"> ({row.dropOffRate}%)</span>}
                </span>
              </div>
            ))}
          </div>

          {stats.topExitPages.length > 0 && (
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs font-medium text-foreground mb-1">Biggest exit points</p>
              {stats.topExitPages.map(p => (
                <p key={p.index} className="text-xs text-muted-foreground">
                  {p.label} — {p.dropOffs} sessions quit ({p.dropOffRate}% of those who reached it)
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time per page */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Timer className="w-4 h-4" /> Average time on each page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={stats.pageTimes}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval={0} height={50} angle={-20} textAnchor="end" />
              <YAxis unit="s" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}s`, 'Avg. time']} />
              <Bar dataKey="avgSeconds" radius={[4, 4, 0, 0]}>
                {stats.pageTimes.map(p => (
                  <Cell
                    key={p.index}
                    fill={stats.slowestPage && p.index === stats.slowestPage.index ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {stats.slowestPage && stats.slowestPage.avgSeconds > 0 && (
            <p className="text-xs text-muted-foreground">
              Slowest page: <span className="text-foreground font-medium">{stats.slowestPage.label}</span> at {stats.slowestPage.avgSeconds}s average.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Top locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.locations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No location data collected yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">By country</p>
                {stats.countries.slice(0, 8).map(c => (
                  <div key={c.country} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate mr-2">{c.country}</span>
                      <span className="text-foreground font-medium whitespace-nowrap">{c.sessions} · {c.share}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${c.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">By region</p>
                {stats.locations.slice(0, 8).map(l => (
                  <div key={`${l.country}-${l.region}`} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate mr-2">{l.region}, {l.country}</span>
                    <span className="text-foreground font-medium whitespace-nowrap">{l.sessions} · {l.share}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answer distribution */}
      {/* Traffic sources & devices */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Traffic sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarList rows={stats.sources} />
            {stats.campaigns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Campaigns</p>
                <BarList rows={stats.campaigns} limit={6} />
              </div>
            )}
            {stats.mediums.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Mediums</p>
                <BarList rows={stats.mediums} limit={5} />
              </div>
            )}
            {stats.sourcePerformance.length > 0 && (
              <div className="rounded-lg bg-secondary p-3 space-y-1">
                <p className="text-xs font-medium text-foreground">Completion rate by source</p>
                {stats.sourcePerformance.slice(0, 6).map(s => (
                  <p key={s.label} className="text-xs text-muted-foreground">
                    {s.label} — {s.completions}/{s.starts} finished ({s.completionRate}%)
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.devices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No device data collected yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.devices}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {stats.devices.map((d, i) => (
                        <Cell key={d.label} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <BarList rows={stats.devices} limit={3} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results / products + CTA clicks */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" /> Result & product breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={stats.results} empty="No completed sessions with a result yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" /> Result page CTA clicks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {stats.totalCtaClicks} clicks · {stats.ctaClickRate}% of finishers clicked through
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">By button</p>
              <BarList rows={stats.ctaByButton} limit={6} empty="No CTA clicks yet." />
            </div>
            {stats.ctaByProduct.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">By product</p>
                <BarList rows={stats.ctaByProduct} limit={6} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {Object.keys(stats.answersByQuestion).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Answer distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.answersByQuestion)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([idx, { questionText, dist }]) => {
                const total = Object.values(dist).reduce((s, c) => s + c, 0);
                return (
                  <div key={idx} className="space-y-2">
                    <p className="text-xs font-medium text-foreground">{questionText}</p>
                    {Object.entries(dist)
                      .sort(([, a], [, b]) => b - a)
                      .map(([text, count]) => {
                        const pct = total ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={text} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground truncate mr-2">{text}</span>
                              <span className="text-foreground font-medium whitespace-nowrap">{count} · {pct}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sessions.map(r => {
            const rowAnswers = stats.answersByResponse[r.id] || [];
            const exitPage = data.pages.find(p => p.index === r.last_question_index);
            return (
              <Collapsible key={r.id} open={expanded.has(r.id)}>
                <CollapsibleTrigger
                  className="w-full flex items-center justify-between py-2 px-2 rounded hover:bg-secondary text-left"
                  onClick={() => toggle(r.id)}
                >
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {new Date(r.started_at).toLocaleDateString()} {new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {r.country && (
                      <span className="text-muted-foreground">{r.region ? `${r.region}, ` : ''}{r.country}</span>
                    )}
                    <span className="text-muted-foreground">{r.utm_source || r.referrer || 'Direct'}</span>
                    {r.device_type && <span className="text-muted-foreground">{r.device_type}</span>}
                    <span className={r.completed_at ? 'text-primary' : 'text-destructive'}>
                      {r.completed_at ? 'Completed' : `Quit at: ${exitPage?.label || `page ${r.last_question_index + 1}`}`}
                    </span>
                    {r.result_product_name && (
                      <span className="text-foreground">{r.result_product_name}</span>
                    )}
                    {stats.ctaSessionIds.has(r.id) && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">CTA clicked</span>
                    )}
                    {r.time_to_complete_ms && (
                      <span className="text-muted-foreground">{formatDuration(r.time_to_complete_ms)}</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.has(r.id) ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pb-2 space-y-1">
                  {data.pageViews
                    .filter(pv => pv.response_id === r.id)
                    .sort((a, b) => a.page_index - b.page_index)
                    .map(pv => {
                      const answer = rowAnswers.find(a => a.question_index === pv.page_index);
                      return (
                        <div key={pv.id} className="flex items-center justify-between text-xs text-muted-foreground py-0.5">
                          <span className="truncate mr-2">
                            {pv.page_index + 1}. {pv.page_label || data.pages.find(p => p.index === pv.page_index)?.label}
                            {answer && <span className="text-foreground"> — {answer.selected_option_texts.join(', ')}</span>}
                          </span>
                          <span className="whitespace-nowrap">{pv.time_on_page_ms ? formatDuration(pv.time_on_page_ms) : '—'}</span>
                        </div>
                      );
                    })}
                  {rowAnswers.length === 0 && data.pageViews.every(pv => pv.response_id !== r.id) && (
                    <p className="text-xs text-muted-foreground">No page detail recorded.</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
