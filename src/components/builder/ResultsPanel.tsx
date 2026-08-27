import React from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const ResultsPanel: React.FC = () => {
  const { quiz, updateResults } = useQuiz();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <Label className="text-sm font-medium text-foreground">Results Title</Label>
        <Input
          value={quiz.results.title}
          onChange={(e) => updateResults({ title: e.target.value })}
          placeholder="Your Perfect Match"
          className="mt-1.5 input-clean"
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground">Results Description</Label>
        <Textarea
          value={quiz.results.description}
          onChange={(e) => updateResults({ description: e.target.value })}
          placeholder="Based on your answers, we recommend..."
          className="mt-1.5 input-clean min-h-[100px] resize-none"
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground">CTA Button Text</Label>
        <Input
          value={quiz.results.ctaText}
          onChange={(e) => updateResults({ ctaText: e.target.value })}
          placeholder="Shop Now"
          className="mt-1.5 input-clean"
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground">CTA Button URL</Label>
        <Input
          value={quiz.results.ctaUrl}
          onChange={(e) => updateResults({ ctaUrl: e.target.value })}
          placeholder="https://yourstore.com/cart"
          className="mt-1.5 input-clean"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Where should users go after seeing their results?</p>
      </div>
    </div>
  );
};
