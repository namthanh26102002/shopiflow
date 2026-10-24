import React, { useState } from 'react';
import { Plus, List, Image, ToggleLeft, FileText, Loader, LineChart, Trophy, SlidersHorizontal, MessageSquare, AlertTriangle } from 'lucide-react';
import { QuestionCard } from './QuestionCard';
import { useQuiz } from '@/contexts/QuizContext';
import { createDefaultQuestion, QuestionType } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuestionsListSkeleton } from './BuilderSkeleton';
import { useT } from '@/i18n';

export const QuestionsList: React.FC = () => {
  const t = useT();
  const { quiz, selectedQuestionId, setSelectedQuestionId, addQuestion, deleteQuestion, reorderQuestions, loading } = useQuiz();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (loading) {
    return <QuestionsListSkeleton />;
  }

  const handleAddQuestion = (type: QuestionType) => {
    addQuestion(createDefaultQuestion(type));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderQuestions(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('Questions')}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary-light h-8">
              <Plus className="w-4 h-4 mr-1" />
              {t('Add')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleAddQuestion('blank')}>
              <FileText className="w-4 h-4 mr-2" />
              {t('Blank / Info')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('multiple-choice')}>
              <List className="w-4 h-4 mr-2" />
              {t('Multiple Choice')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('image-selection')}>
              <Image className="w-4 h-4 mr-2" />
              {t('Image Selection')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('yes-no')}>
              <ToggleLeft className="w-4 h-4 mr-2" />
              {t('Yes / No')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('analyzing')}>
              <Loader className="w-4 h-4 mr-2" />
              {t('Analyzing')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('chart')}>
              <LineChart className="w-4 h-4 mr-2" />
              {t('Chart')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('summary')}>
              <FileText className="w-4 h-4 mr-2" />
              {t('Summary')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('result')}>
              <Trophy className="w-4 h-4 mr-2" />
              {t('Result')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('score-slider')}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {t('Score Slider')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('feedback')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('Feedback')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddQuestion('warning')}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('Warning')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {quiz.questions.length === 0 ? (
        <div className="builder-panel text-center py-8">
          <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{t('No questions yet')}</p>
          <p className="text-xs text-muted-foreground mb-4">{t('Add your first question to get started')}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" />
                {t('Add Question')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuItem onClick={() => handleAddQuestion('blank')}>
                <FileText className="w-4 h-4 mr-2" />
                {t('Blank / Info')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('multiple-choice')}>
                <List className="w-4 h-4 mr-2" />
                {t('Multiple Choice')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('image-selection')}>
                <Image className="w-4 h-4 mr-2" />
                {t('Image Selection')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('yes-no')}>
                <ToggleLeft className="w-4 h-4 mr-2" />
                {t('Yes / No')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('analyzing')}>
                <Loader className="w-4 h-4 mr-2" />
                {t('Analyzing')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('chart')}>
                <LineChart className="w-4 h-4 mr-2" />
                {t('Chart')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('summary')}>
                <FileText className="w-4 h-4 mr-2" />
                {t('Summary')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('result')}>
                <Trophy className="w-4 h-4 mr-2" />
                {t('Result')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('score-slider')}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {t('Score Slider')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('feedback')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('Feedback')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddQuestion('warning')}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                {t('Warning')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="space-y-2">
          {quiz.questions.map((question, index) => (
            <div
              key={question.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <QuestionCard
                question={question}
                index={index}
                isSelected={selectedQuestionId === question.id}
                onSelect={() => setSelectedQuestionId(question.id)}
                onDelete={() => deleteQuestion(question.id)}
                isDragging={draggedIndex === index}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
