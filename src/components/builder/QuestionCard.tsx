import React from 'react';
import { GripVertical, Image, List, ToggleLeft, Trash2, FileText, Loader, LineChart, ClipboardList, Trophy, SlidersHorizontal, MessageSquare, AlertTriangle } from 'lucide-react';
import { Question, QuestionType } from '@/types/quiz';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

const questionTypeIcons: Record<QuestionType, React.ReactNode> = {
  'blank': <FileText className="w-4 h-4" />,
  'multiple-choice': <List className="w-4 h-4" />,
  'image-selection': <Image className="w-4 h-4" />,
  'yes-no': <ToggleLeft className="w-4 h-4" />,
  'analyzing': <Loader className="w-4 h-4" />,
  'chart': <LineChart className="w-4 h-4" />,
  'summary': <ClipboardList className="w-4 h-4" />,
  'result': <Trophy className="w-4 h-4" />,
  'score-slider': <SlidersHorizontal className="w-4 h-4" />,
  'feedback': <MessageSquare className="w-4 h-4" />,
  'warning': <AlertTriangle className="w-4 h-4" />,
};

const questionTypeLabels: Record<QuestionType, string> = {
  'blank': 'Blank / Info',
  'multiple-choice': 'Multiple Choice',
  'image-selection': 'Image Selection',
  'yes-no': 'Yes / No',
  'analyzing': 'Analyzing',
  'chart': 'Chart',
  'summary': 'Summary',
  'result': 'Result',
  'score-slider': 'Score Slider',
  'feedback': 'Feedback',
  'warning': 'Warning',
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  isSelected,
  onSelect,
  onDelete,
  isDragging = false,
}) => {
  return (
    <div
      className={cn(
        'question-card group flex items-start gap-3',
        isSelected && 'border-primary/30 bg-primary-light/50',
        isDragging && 'dragging'
      )}
      onClick={onSelect}
    >
      <div className="drag-handle mt-1 flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">Q{index + 1}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {questionTypeIcons[question.type]}
            <span>{questionTypeLabels[question.type]}</span>
          </div>
        </div>
        
        <p className="text-sm font-medium text-foreground truncate">
          {question.text || 'Untitled question'}
        </p>
        
        {question.type !== 'blank' && question.type !== 'analyzing' && question.type !== 'chart' && question.type !== 'summary' && question.type !== 'result' && (
          <p className="text-xs text-muted-foreground mt-1">
            {question.options.length} options
          </p>
        )}
        {question.type === 'blank' && (
          <p className="text-xs text-muted-foreground mt-1">Info page</p>
        )}
        {question.type === 'analyzing' && (
          <p className="text-xs text-muted-foreground mt-1">
            {question.analyzingBars?.length || 0} progress bars
          </p>
        )}
        {question.type === 'chart' && (
          <p className="text-xs text-muted-foreground mt-1">
            {question.chartConfig?.points?.length || 0} chart points
          </p>
        )}
        {question.type === 'summary' && (
          <p className="text-xs text-muted-foreground mt-1">Summary page</p>
        )}
        {question.type === 'result' && (
          <p className="text-xs text-muted-foreground mt-1">Result page</p>
        )}
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-lg transition-all text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
