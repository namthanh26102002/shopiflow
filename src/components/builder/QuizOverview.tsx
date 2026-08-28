// Canvas view of the whole quiz: every page the respondent sees, in order, as
// numbered cards. Built for scanning the flow, not for pixel fidelity — the
// Live Preview already does fidelity for one page at a time.
import React, { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Question, Quiz, QuestionType } from '@/types/quiz';

interface QuizOverviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz;
  /** Jump to a question in the editor. */
  onSelectQuestion: (id: string) => void;
}

type Step =
  | { kind: 'welcome'; title: string; body: string; cta: string }
  | { kind: 'question'; question: Question }
  | { kind: 'results'; title: string; body: string; cta: string };

const TYPE_LABEL: Record<QuestionType, string> = {
  'multiple-choice': 'Multiple choice',
  'image-selection': 'Image selection',
  'yes-no': 'Yes / No',
  'blank': 'Content page',
  'analyzing': 'Analyzing',
  'chart': 'Chart',
  'summary': 'Summary',
  'result': 'Result',
  'score-slider': 'Score slider',
  'feedback': 'Feedback',
  'warning': 'Warning',
};

/** Caption under a card, describing the step's job in the funnel. */
const stepCaption = (s: Step): string => {
  if (s.kind === 'welcome') return 'Welcome & hook';
  if (s.kind === 'results') return 'Results & offer';
  const q = s.question;
  const label = TYPE_LABEL[q.type] ?? q.type;
  return `${label}${q.required ? '' : ' · optional'}`;
};

/** The body of a card: enough of the page's content to recognise it. */
const QuestionBody: React.FC<{ question: Question; accent: string }> = ({ question, accent }) => {
  const { type, options } = question;

  if (type === 'image-selection') {
    const withImages = options.filter(o => o.imageUrl).slice(0, 4);
    if (withImages.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {withImages.map(o => (
            <div key={o.id} className="relative rounded overflow-hidden bg-secondary aspect-[4/3]">
              <img src={o.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1 py-0.5 truncate">
                {o.text}
              </span>
            </div>
          ))}
        </div>
      );
    }
  }

  if (type === 'analyzing') {
    const bars = question.analyzingBars ?? [];
    return (
      <div className="space-y-1.5">
        {bars.slice(0, 4).map(b => (
          <div key={b.id}>
            <p className="text-[9px] text-muted-foreground truncate">{b.label}</p>
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: accent }} />
            </div>
          </div>
        ))}
        {bars.length === 0 && <p className="text-[10px] text-muted-foreground">Loading animation</p>}
      </div>
    );
  }

  if (type === 'blank') {
    return (
      <div className="space-y-1.5">
        {question.imageUrl && (
          <img
            src={question.imageUrl} alt=""
            className="w-full rounded object-cover max-h-24" loading="lazy"
          />
        )}
        {question.subText && (
          <p className="text-[10px] text-muted-foreground line-clamp-3">{question.subText}</p>
        )}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground">
        {TYPE_LABEL[type]} page — no answer options
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {options.slice(0, 5).map(o => (
        <div
          key={o.id}
          className="flex items-center gap-1.5 rounded border border-border-subtle px-1.5 py-1"
        >
          {o.icon && <span className="text-[10px] shrink-0">{o.icon}</span>}
          <span className="text-[10px] text-foreground truncate">{o.text || 'Untitled option'}</span>
        </div>
      ))}
      {options.length > 5 && (
        <p className="text-[9px] text-muted-foreground pl-1">
          +{options.length - 5} more
        </p>
      )}
    </div>
  );
};

export const QuizOverview: React.FC<QuizOverviewProps> = ({
  open, onOpenChange, quiz, onSelectQuestion,
}) => {
  const accent = quiz.settings.primaryColor || '#0066FF';

  // Welcome and results are pages the respondent sees but the editor lists
  // separately, so the flow only reads correctly with them included.
  const steps = useMemo<Step[]>(() => [
    {
      kind: 'welcome',
      title: quiz.settings.title,
      body: quiz.settings.welcomeText,
      cta: quiz.settings.welcomeButtonText,
    },
    ...quiz.questions.map((question): Step => ({ kind: 'question', question })),
    {
      kind: 'results',
      title: quiz.results?.title ?? 'Your results',
      body: quiz.results?.description ?? '',
      cta: quiz.results?.ctaText ?? '',
    },
  ], [quiz]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quiz.settings.title || 'Untitled quiz'}</DialogTitle>
          <DialogDescription>
            {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} ·{' '}
            {steps.length} pages in the flow. Click a card to edit that page.
          </DialogDescription>
        </DialogHeader>

        {quiz.questions.length === 0 ? (
          <div className="border border-border-subtle rounded-lg p-12 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Nothing to map yet</p>
            <p className="text-xs text-muted-foreground">
              Add a question and the flow will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-x-4 gap-y-6 grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
            {steps.map((s, i) => {
              const clickable = s.kind === 'question';
              const title =
                s.kind === 'question' ? (s.question.text || 'Untitled question') : s.title;

              return (
                <div key={s.kind === 'question' ? s.question.id : s.kind} className="min-w-0">
                  <div className="relative">
                    <span
                      className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shadow"
                      style={{ backgroundColor: s.kind === 'question' ? '#1A1A1A' : accent }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <button
                      type="button"
                      onClick={() => clickable && onSelectQuestion((s as { question: Question }).question.id)}
                      disabled={!clickable}
                      className={`w-full text-left bg-card border border-border-subtle rounded-lg overflow-hidden aspect-[3/5] flex flex-col ${
                        clickable ? 'hover:border-primary/50 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div
                        className="h-1 shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      <div className="p-2.5 space-y-2 overflow-hidden">
                        <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-3">
                          {title}
                        </p>

                        {s.kind === 'question' ? (
                          <QuestionBody question={s.question} accent={accent} />
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[10px] text-muted-foreground line-clamp-4">{s.body}</p>
                            {s.cta && (
                              <div
                                className="rounded text-[9px] text-white text-center py-1 px-2 truncate"
                                style={{ backgroundColor: accent }}
                              >
                                {s.cta}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                    {stepCaption(s)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
