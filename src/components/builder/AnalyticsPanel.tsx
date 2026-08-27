import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuizAnalyticsDashboard } from './QuizAnalyticsDashboard';
import {
  QuizAnalyticsData, QuizAnswerRow, QuizPageViewRow, QuizResponseRow, QuizPageMeta, QuizCtaRow,
} from '@/lib/quizAnalytics';

export const AnalyticsPanel: React.FC = () => {
  const { quiz } = useQuiz();
  const [responses, setResponses] = useState<QuizResponseRow[]>([]);
  const [answers, setAnswers] = useState<QuizAnswerRow[]>([]);
  const [pageViews, setPageViews] = useState<QuizPageViewRow[]>([]);
  const [ctaEvents, setCtaEvents] = useState<QuizCtaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!quiz.id) return;

    const [responsesRes, answersRes, pageViewsRes, ctaRes] = await Promise.all([
      supabase.from('quiz_responses').select('*').eq('quiz_id', quiz.id),
      supabase.from('quiz_response_answers').select('*').eq('quiz_id', quiz.id).order('question_index', { ascending: true }),
      supabase.from('quiz_page_views').select('*').eq('quiz_id', quiz.id),
      supabase.from('quiz_cta_events').select('*').eq('quiz_id', quiz.id),
    ]);

    if (responsesRes.data) setResponses(responsesRes.data as unknown as QuizResponseRow[]);
    if (answersRes.data) setAnswers(answersRes.data as unknown as QuizAnswerRow[]);
    if (pageViewsRes.data) setPageViews(pageViewsRes.data as unknown as QuizPageViewRow[]);
    if (ctaRes.data) setCtaEvents(ctaRes.data as unknown as QuizCtaRow[]);
    setLoading(false);
    setRefreshing(false);
  }, [quiz.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const data: QuizAnalyticsData = useMemo(() => {
    const pages: QuizPageMeta[] = quiz.questions.map((q, i) => ({
      index: i,
      label: q.text?.trim() || `Page ${i + 1}`,
      type: q.type,
    }));
    return { pages, responses, answers, pageViews, ctaEvents };
  }, [quiz.questions, responses, answers, pageViews, ctaEvents]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Location, time on each page and where visitors drop off
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('w-4 h-4 mr-1', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No data yet</p>
              <p className="text-xs text-muted-foreground">
                Publish your quiz and share it to start collecting analytics. Open the demo dashboard in Settings to preview the report.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <QuizAnalyticsDashboard data={data} />
      )}
    </div>
  );
};
