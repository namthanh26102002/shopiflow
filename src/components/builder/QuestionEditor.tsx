// QuestionEditor - handles question editing with file upload support
import React, { useRef } from 'react';
import { Plus, Image as ImageIcon, X, Upload, Trash2 } from 'lucide-react';
import { Question, QuestionType, AnswerOption, AnalyzingBar, AnalyzingPopupConfig, ChartPoint, SummaryInfoCard, TransformationMetric, ResultInfoCard, SliderCard, ScoreSliderRange, WarningIcon, generateId } from '@/types/quiz';
import { useQuiz } from '@/contexts/QuizContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/advertorial/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IconPicker } from './IconPicker';
import { BlankBlocksEditor } from './BlankBlocksEditor';
import { Slider } from '@/components/ui/slider';
import { useT, tr } from '@/i18n';

interface OptionCardProps {
  option: AnswerOption;
  index: number;
  questionId: string;
  questionType: QuestionType;
  canDelete: boolean;
  onUpdateOption: (questionId: string, optionId: string, updates: Partial<AnswerOption>) => void;
  onDeleteOption: (questionId: string, optionId: string) => void;
  onImageUpload: (optionId: string, file: File) => void;
  onRemoveImage: (optionId: string) => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  option,
  index,
  questionId,
  questionType,
  canDelete,
  onUpdateOption,
  onDeleteOption,
  onImageUpload,
  onRemoveImage,
}) => {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(option.id, file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="card-elevated p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
          {String.fromCharCode(65 + index)}
        </div>
        {/* Icon picker for multiple choice (not yes-no or image-selection) */}
        {questionType === 'multiple-choice' && (
          <>
            <IconPicker
              value={option.icon}
              onChange={(iconName) => onUpdateOption(questionId, option.id, { icon: iconName })}
            />
            {option.icon && (
              <input
                type="color"
                value={option.iconColor || '#6B7280'}
                onChange={(e) => onUpdateOption(questionId, option.id, { iconColor: e.target.value })}
                className="w-8 h-8 p-0.5 rounded-md cursor-pointer border border-border-subtle"
                title={t('Icon color')}
              />
            )}
          </>
        )}
        <Input
          value={option.text}
          onChange={(e) => onUpdateOption(questionId, option.id, { text: e.target.value })}
          placeholder={`Option ${index + 1}`}
          className="flex-1 input-clean"
          disabled={questionType === 'yes-no'}
        />
        {questionType !== 'yes-no' && canDelete && (
          <button aria-label={t('Delete option')}
            onClick={() => onDeleteOption(questionId, option.id)}
            className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Image upload (optional for all question types) */}
      <div className="pl-8">
        {option.imageUrl ? (
          <div className="relative inline-block">
            <img 
              src={option.imageUrl} 
              alt={option.text}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <button aria-label={t('Remove option image')}
              onClick={() => onRemoveImage(option.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handleFileClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg cursor-pointer transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {t('Add image (optional)')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

interface QuestionEditorProps {
  question: Question;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ question }) => {
  const t = useT();
  const { quiz, updateQuestion, updateResultConfig, addOption, updateOption, deleteOption } = useQuiz();
  const blankImageInputRef = useRef<HTMLInputElement>(null);
  const feedbackVideoRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (type: QuestionType) => {
    if (type === 'blank') {
      updateQuestion(question.id, {
        type,
        options: [],
      });
    } else if (type === 'analyzing') {
      updateQuestion(question.id, {
        type,
        options: [],
        analyzingBars: question.analyzingBars?.length ? question.analyzingBars : [
          { id: generateId(), label: 'Analyzing your preferences...', duration: 2 },
          { id: generateId(), label: 'Finding your matches...', duration: 2 },
        ],
      });
    } else if (type === 'chart') {
      updateQuestion(question.id, {
        type,
        options: [],
        chartConfig: question.chartConfig || {
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
      });
    } else if (type === 'summary') {
      updateQuestion(question.id, {
        type,
        options: [],
        summaryConfig: question.summaryConfig || {
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
        },
      });
    } else if (type === 'result') {
      updateQuestion(question.id, {
        type,
        options: [],
        resultConfig: question.resultConfig || {
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
      });
    } else if (type === 'yes-no') {
      updateQuestion(question.id, {
        type,
        options: [
          { id: question.options[0]?.id || 'yes', text: 'Yes', productIds: question.options[0]?.productIds || [] },
          { id: question.options[1]?.id || 'no', text: 'No', productIds: question.options[1]?.productIds || [] },
        ],
      });
    } else if (type === 'feedback') {
      updateQuestion(question.id, {
        type,
        options: [],
        feedbackConfig: question.feedbackConfig || {
          videoUrl: '',
          caption: 'Sample caption text',
          headline: 'Checking for updates',
          subHeadline: 'Almost there!',
          durationSeconds: 5,
        },
      });
    } else if (type === 'warning') {
      updateQuestion(question.id, {
        type,
        options: [],
        warningConfig: question.warningConfig || {
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
      });
    } else if (type === 'score-slider') {
      updateQuestion(question.id, {
        type,
        options: [],
        scoreSliderConfig: question.scoreSliderConfig || {
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
      });
    } else {
      // For multiple-choice or image-selection, ensure we have options
      if (question.options.length === 0) {
        updateQuestion(question.id, {
          type,
          options: [
            { id: 'opt1', text: 'Option 1', productIds: [] },
            { id: 'opt2', text: 'Option 2', productIds: [] },
          ],
        });
      } else {
        updateQuestion(question.id, { type });
      }
    }
  };

  // Chart configuration management
  const handleUpdateChartConfig = (updates: Partial<typeof question.chartConfig>) => {
    // If goalDays is being updated, scale all point positions proportionally
    if (updates.goalDays !== undefined && question.chartConfig) {
      const oldGoalDays = question.chartConfig.goalDays;
      const newGoalDays = updates.goalDays;
      
      // Avoid division by zero
      if (oldGoalDays > 0 && newGoalDays > 0) {
        const scaleFactor = newGoalDays / oldGoalDays;
        
        const scaledPoints = question.chartConfig.points.map((point, index, arr) => {
          // First point stays at 0, last point uses exactly newGoalDays
          if (index === 0) return { ...point, daysFromStart: 0 };
          if (index === arr.length - 1) return { ...point, daysFromStart: newGoalDays };
          // Scale intermediate points proportionally
          return { ...point, daysFromStart: Math.round(point.daysFromStart * scaleFactor) };
        });
        
        updateQuestion(question.id, {
          chartConfig: { ...question.chartConfig, ...updates, points: scaledPoints },
        });
        return;
      }
    }
    
    updateQuestion(question.id, {
      chartConfig: { ...question.chartConfig!, ...updates },
    });
  };

  const handleAddChartPoint = () => {
    const points = question.chartConfig?.points || [];
    const maxDay = Math.max(...points.map(p => p.daysFromStart), 0);
    updateQuestion(question.id, {
      chartConfig: {
        ...question.chartConfig!,
        points: [...points, { id: generateId(), label: 'New', value: 50, daysFromStart: maxDay + 7 }],
      },
    });
  };

  const handleUpdateChartPoint = (pointId: string, updates: Partial<ChartPoint>) => {
    const points = question.chartConfig?.points || [];
    updateQuestion(question.id, {
      chartConfig: {
        ...question.chartConfig!,
        points: points.map(p => p.id === pointId ? { ...p, ...updates } : p),
      },
    });
  };

  const handleDeleteChartPoint = (pointId: string) => {
    const points = question.chartConfig?.points || [];
    if (points.length > 2) {
      updateQuestion(question.id, {
        chartConfig: {
          ...question.chartConfig!,
          points: points.filter(p => p.id !== pointId),
        },
      });
    }
  };

  // Analyzing bars management
  const handleAddAnalyzingBar = () => {
    const bars = question.analyzingBars || [];
    updateQuestion(question.id, {
      analyzingBars: [...bars, { id: generateId(), label: 'Loading...', duration: 2 }],
    });
  };

  const handleUpdateAnalyzingBar = (barId: string, updates: Partial<AnalyzingBar>) => {
    const bars = question.analyzingBars || [];
    updateQuestion(question.id, {
      analyzingBars: bars.map(bar => bar.id === barId ? { ...bar, ...updates } : bar),
    });
  };

  const handleDeleteAnalyzingBar = (barId: string) => {
    const bars = question.analyzingBars || [];
    if (bars.length > 1) {
      updateQuestion(question.id, {
        analyzingBars: bars.filter(bar => bar.id !== barId),
      });
    }
  };

  const handleImageUpload = (optionId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      updateOption(question.id, optionId, { imageUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (optionId: string) => {
    updateOption(question.id, optionId, { imageUrl: undefined });
  };

  const handleBlankImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(tr('Please upload an image file'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(tr('Image must be less than 2MB'));
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `blank-${question.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/questions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('quiz-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('quiz-assets').getPublicUrl(filePath);
      updateQuestion(question.id, { imageUrl: data.publicUrl });
      toast.success(tr('Image uploaded'));
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(tr('Failed to upload image'));
    }
  };

  const handleRemoveBlankImage = () => {
    updateQuestion(question.id, { imageUrl: undefined });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-foreground">{t('Question Type')}</Label>
          <Select value={question.type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
            <SelectTrigger className="mt-1.5 input-clean">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blank">{t('Blank / Info')}</SelectItem>
              <SelectItem value="multiple-choice">{t('Multiple Choice')}</SelectItem>
              <SelectItem value="image-selection">{t('Image Selection')}</SelectItem>
              <SelectItem value="yes-no">{t('Yes / No')}</SelectItem>
              <SelectItem value="analyzing">{t('Analyzing')}</SelectItem>
              <SelectItem value="chart">{t('Chart')}</SelectItem>
              <SelectItem value="summary">{t('Summary')}</SelectItem>
              <SelectItem value="result">{t('Result')}</SelectItem>
              <SelectItem value="score-slider">{t('Score Slider')}</SelectItem>
              <SelectItem value="feedback">{t('Feedback')}</SelectItem>
              <SelectItem value="warning">{t('Warning')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Allow multiple selections toggle - only for multiple-choice and image-selection */}
        {(question.type === 'multiple-choice' || question.type === 'image-selection') && (
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium text-foreground">{t('Allow multiple selections')}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('Users can select more than one answer')}</p>
            </div>
            <Switch
              checked={question.allowMultiple || false}
              onCheckedChange={(checked) => updateQuestion(question.id, { allowMultiple: checked })}
            />
          </div>
        )}

        {question.type !== 'result' && question.type !== 'feedback' && question.type !== 'warning' && (
          <div>
            <Label className="text-sm font-medium text-foreground">{t('Question Text')}</Label>
            <Textarea
              value={question.text}
              onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
              placeholder={t('Enter your question...')}
              className="mt-1.5 input-clean min-h-[80px] resize-none"
            />
          </div>
        )}

        {question.type !== 'result' && question.type !== 'feedback' && question.type !== 'warning' && (
          <div>
            <Label className="text-sm font-medium text-foreground">{t('Sub-text (optional)')}</Label>
            <div className="mt-1.5">
              <RichTextEditor
                value={question.subText || ''}
                onChange={(html) => updateQuestion(question.id, { subText: html })}
                placeholder={t('Add helpful context or instructions...')}
                minHeight="60px"
              />
            </div>
          </div>
        )}

        {/* Image upload for blank question type */}
        {question.type === 'blank' && (
          <div>
            <Label className="text-sm font-medium text-foreground">{t('Image (optional)')}</Label>
            <div className="mt-2">
              {question.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={question.imageUrl}
                    alt={t('Question image')}
                    className="max-w-full h-32 object-contain rounded-lg border border-border-subtle"
                  />
                  <button aria-label={t('Remove image')}
                    onClick={handleRemoveBlankImage}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={blankImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBlankImageUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => blankImageInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">{t('Click to upload image')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Card Slider editor for blank type */}
        {question.type === 'blank' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium text-foreground">{t('Card Slider')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Add a slideshow of cards')}</p>
              </div>
              <Switch
                checked={!!question.cardSliderConfig}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateQuestion(question.id, {
                      cardSliderConfig: {
                        cards: [{ id: generateId(), headline: 'Card 1', subHeadline: 'Subtitle', bodyHtml: '', bodyFontSize: 14 }],
                        autoPlaySeconds: 5,
                      },
                    });
                  } else {
                    updateQuestion(question.id, { cardSliderConfig: undefined });
                  }
                }}
              />
            </div>

            {question.cardSliderConfig && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">{t('Auto-play interval')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={question.cardSliderConfig.autoPlaySeconds}
                    onChange={(e) => updateQuestion(question.id, {
                      cardSliderConfig: { ...question.cardSliderConfig!, autoPlaySeconds: parseInt(e.target.value) || 5 },
                    })}
                    className="w-16 input-clean text-center"
                  />
                  <span className="text-xs text-muted-foreground">{t('sec')}</span>
                </div>

                {question.cardSliderConfig.cards.map((card, idx) => {
                  const cardFileRef = React.createRef<HTMLInputElement>();
                  return (
                    <div key={card.id} className="card-elevated p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">{t('Card {number}', { number: idx + 1 })}</span>
                        {question.cardSliderConfig!.cards.length > 1 && (
                          <button aria-label={t('Delete card')}
                            onClick={() => updateQuestion(question.id, {
                              cardSliderConfig: {
                                ...question.cardSliderConfig!,
                                cards: question.cardSliderConfig!.cards.filter(c => c.id !== card.id),
                              },
                            })}
                            className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Card image */}
                      {card.imageUrl ? (
                        <div className="relative inline-block">
                          <img src={card.imageUrl} alt="" className="w-full h-20 object-cover rounded-lg" />
                          <button aria-label={t('Remove card image')}
                            onClick={() => {
                              const cards = question.cardSliderConfig!.cards.map(c =>
                                c.id === card.id ? { ...c, imageUrl: undefined } : c
                              );
                              updateQuestion(question.id, { cardSliderConfig: { ...question.cardSliderConfig!, cards } });
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={cardFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) { toast.error(tr('Image must be less than 2MB')); return; }
                              try {
                                const { data: { user: authUser } } = await supabase.auth.getUser();
                                if (!authUser) throw new Error('Not authenticated');
                                const fileExt = file.name.split('.').pop();
                                const fileName = `slider-${card.id}-${Date.now()}.${fileExt}`;
                                const uploadPath = `${authUser.id}/questions/${fileName}`;
                                const { error: uploadError } = await supabase.storage.from('quiz-assets').upload(uploadPath, file);
                                if (uploadError) throw uploadError;
                                const { data } = supabase.storage.from('quiz-assets').getPublicUrl(uploadPath);
                                const cards = question.cardSliderConfig!.cards.map(c =>
                                  c.id === card.id ? { ...c, imageUrl: data.publicUrl } : c
                                );
                                updateQuestion(question.id, { cardSliderConfig: { ...question.cardSliderConfig!, cards } });
                                toast.success(tr('Image uploaded'));
                              } catch { toast.error(tr('Failed to upload')); }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => cardFileRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg cursor-pointer transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            {t('Add image')}
                          </button>
                        </>
                      )}

                      <Input
                        value={card.headline}
                        onChange={(e) => {
                          const cards = question.cardSliderConfig!.cards.map(c =>
                            c.id === card.id ? { ...c, headline: e.target.value } : c
                          );
                          updateQuestion(question.id, { cardSliderConfig: { ...question.cardSliderConfig!, cards } });
                        }}
                        placeholder={t('Headline')}
                        className="input-clean"
                      />
                      <Input
                        value={card.subHeadline}
                        onChange={(e) => {
                          const cards = question.cardSliderConfig!.cards.map(c =>
                            c.id === card.id ? { ...c, subHeadline: e.target.value } : c
                          );
                          updateQuestion(question.id, { cardSliderConfig: { ...question.cardSliderConfig!, cards } });
                        }}
                        placeholder={t('Sub-headline')}
                        className="input-clean"
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="text-xs text-muted-foreground">{t('Font size')}</Label>
                        <Select
                          value={String(card.bodyFontSize || 14)}
                          onValueChange={(v) => {
                            const cards = question.cardSliderConfig!.cards.map(c =>
                              c.id === card.id ? { ...c, bodyFontSize: parseInt(v) } : c
                            );
                            updateQuestion(question.id, { cardSliderConfig: { ...question.cardSliderConfig!, cards } });
                          }}
                        >
                          <SelectTrigger className="w-20 h-7 input-clean text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 12, 14, 16, 18, 20].map(s => (
                              <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <RichTextEditor
                        value={card.bodyHtml}
                        onChange={(html) => {
                          const cards = question.cardSliderConfig!.cards.map(c =>
                            c.id === card.id ? { ...c, bodyHtml: html } : c
                          );
                          updateQuestion(question.id, { cardSliderConfig: { ...question.cardSliderConfig!, cards } });
                        }}
                        placeholder={t('Body content...')}
                        minHeight="60px"
                      />
                    </div>
                  );
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateQuestion(question.id, {
                    cardSliderConfig: {
                      ...question.cardSliderConfig!,
                      cards: [...question.cardSliderConfig!.cards, { id: generateId(), headline: '', subHeadline: '', bodyHtml: '', bodyFontSize: 14 }],
                    },
                  })}
                  className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('Add Card')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Optional content blocks for blank type */}
        {question.type === 'blank' && <BlankBlocksEditor question={question} />}

        {/* Analyzing bars editor */}
        {question.type === 'analyzing' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">{t('Progress Bars')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddAnalyzingBar}
                className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('Add Bar')}
              </Button>
            </div>

            <div className="space-y-2">
              {(question.analyzingBars || []).map((bar, index) => (
                <div key={bar.id} className="card-elevated p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                      {index + 1}
                    </div>
                    <Input
                      value={bar.label}
                      onChange={(e) => handleUpdateAnalyzingBar(bar.id, { label: e.target.value })}
                      placeholder={t('Loading message...')}
                      className="flex-1 input-clean"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={bar.duration}
                        onChange={(e) => handleUpdateAnalyzingBar(bar.id, { duration: parseInt(e.target.value) || 2 })}
                        className="w-16 input-clean text-center"
                      />
                      <span className="text-xs text-muted-foreground">{t('sec')}</span>
                    </div>
                    {(question.analyzingBars?.length || 0) > 1 && (
                      <button aria-label={t('Delete progress bar')}
                        onClick={() => handleDeleteAnalyzingBar(bar.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Image upload for analyzing type */}
            <div>
              <Label className="text-sm font-medium text-foreground">{t('Image (optional)')}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t('Add a before/after or comparison image')}</p>
              <div className="mt-2">
                {question.imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={question.imageUrl}
                      alt={t('Analyzing image')}
                      className="max-w-full h-32 object-contain rounded-lg border border-border-subtle"
                    />
                    <button aria-label={t('Remove image')}
                      onClick={handleRemoveBlankImage}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={blankImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBlankImageUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => blankImageInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">{t('Click to upload image')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Button text override */}
            <div>
              <Label className="text-sm font-medium text-foreground">{t('Button Text')}</Label>
              <Input
                value={question.analyzingButtonText || ''}
                onChange={(e) => updateQuestion(question.id, { analyzingButtonText: e.target.value })}
                placeholder={quiz.settings.nextButtonText || t('Next')}
                className="mt-1.5 input-clean"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('Leave empty to use the global button text')}</p>
            </div>

            {/* Popup Questions - one per bar */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">{t('Popup Questions')}</Label>
              <p className="text-xs text-muted-foreground">{t('Add a yes/no popup that pauses progress on each bar')}</p>

              {(question.analyzingBars || []).map((bar, barIndex) => {
                const popups = question.analyzingPopups || [];
                const popupForBar = popups.find(p => (p.triggerBarIndex || 0) === barIndex);
                const isEnabled = popupForBar?.enabled || false;

                const updatePopupForBar = (updates: Partial<AnalyzingPopupConfig>) => {
                  const existing = [...(question.analyzingPopups || [])];
                  const idx = existing.findIndex(p => (p.triggerBarIndex || 0) === barIndex);
                  if (idx >= 0) {
                    existing[idx] = { ...existing[idx], ...updates };
                  } else {
                    existing.push({
                      enabled: true,
                      triggerBarIndex: barIndex,
                      triggerPercent: 50,
                      subtitle: 'To move forward, please specify',
                      questionText: 'Does a simpler, effective routine sound good to you?',
                      noButtonText: 'No',
                      yesButtonText: 'Yes',
                      ...updates,
                    });
                  }
                  updateQuestion(question.id, { analyzingPopups: existing });
                };

                const togglePopup = (checked: boolean) => {
                  if (checked) {
                    updatePopupForBar({ enabled: true });
                  } else {
                    const existing = [...(question.analyzingPopups || [])];
                    const idx = existing.findIndex(p => (p.triggerBarIndex || 0) === barIndex);
                    if (idx >= 0) {
                      existing[idx] = { ...existing[idx], enabled: false };
                      updateQuestion(question.id, { analyzingPopups: existing });
                    }
                  }
                };

                return (
                  <div key={bar.id} className="card-elevated p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium text-foreground">{t('Bar {number}', { number: barIndex + 1 })}: {bar.label}</Label>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={togglePopup} />
                    </div>

                    {isEnabled && popupForBar && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('At percentage')}</Label>
                          <Input
                            type="number"
                            min={10}
                            max={90}
                            value={popupForBar.triggerPercent}
                            onChange={(e) => updatePopupForBar({ triggerPercent: parseInt(e.target.value) || 50 })}
                            className="mt-1 input-clean"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('Subtitle')}</Label>
                          <Input
                            value={popupForBar.subtitle}
                            onChange={(e) => updatePopupForBar({ subtitle: e.target.value })}
                            placeholder="To move forward, please specify"
                            className="mt-1 input-clean"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('Question Text')}</Label>
                          <Textarea
                            value={popupForBar.questionText}
                            onChange={(e) => updatePopupForBar({ questionText: e.target.value })}
                            placeholder="Does a simpler routine sound good to you?"
                            className="mt-1 input-clean min-h-[60px] resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('No Button')}</Label>
                            <Input
                              value={popupForBar.noButtonText}
                              onChange={(e) => updatePopupForBar({ noButtonText: e.target.value })}
                              placeholder={t('No')}
                              className="mt-1 input-clean"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('Yes Button')}</Label>
                            <Input
                              value={popupForBar.yesButtonText}
                              onChange={(e) => updatePopupForBar({ yesButtonText: e.target.value })}
                              placeholder={t('Yes')}
                              className="mt-1 input-clean"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chart configuration editor */}
        {question.type === 'chart' && question.chartConfig && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">{t('Chart Settings')}</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t('Start Badge Text')}</Label>
                <Input
                  value={question.chartConfig.startLabel}
                  onChange={(e) => handleUpdateChartConfig({ startLabel: e.target.value })}
                  placeholder="You Are Here"
                  className="mt-1 input-clean"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('Goal Badge Text')}</Label>
                <Input
                  value={question.chartConfig.goalLabel}
                  onChange={(e) => handleUpdateChartConfig({ goalLabel: e.target.value })}
                  placeholder={t('Goal')}
                  className="mt-1 input-clean"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t('Days to Goal')}</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={question.chartConfig.goalDays}
                onChange={(e) => handleUpdateChartConfig({ goalDays: parseInt(e.target.value) || 28 })}
                className="mt-1 input-clean w-24"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('X-axis dates auto-calculate from today')}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">{t('Chart Points')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddChartPoint}
                  className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('Add Point')}
                </Button>
              </div>

              <div className="space-y-2">
                {(question.chartConfig.points || []).map((point, index) => (
                  <div key={point.id} className="card-elevated p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('Label')}</Label>
                          <Input
                            value={point.label}
                            onChange={(e) => handleUpdateChartPoint(point.id, { label: e.target.value })}
                            placeholder={t('Severe')}
                            className="input-clean mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('Value (0-100)')}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={point.value}
                            onChange={(e) => handleUpdateChartPoint(point.id, { value: parseInt(e.target.value) || 0 })}
                            className="input-clean mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('Day')}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            value={point.daysFromStart}
                            onChange={(e) => handleUpdateChartPoint(point.id, { daysFromStart: parseInt(e.target.value) || 0 })}
                            className="input-clean mt-0.5"
                          />
                        </div>
                      </div>
                      {(question.chartConfig?.points?.length || 0) > 2 && (
                        <button aria-label={t('Delete chart point')}
                          onClick={() => handleDeleteChartPoint(point.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary configuration editor */}
        {question.type === 'summary' && question.summaryConfig && (() => {
          const sc = question.summaryConfig;
          const updateSummary = (updates: Partial<typeof sc>) => {
            updateQuestion(question.id, { summaryConfig: { ...sc, ...updates } });
          };
          const updateInfoCard = (cardId: string, updates: Partial<SummaryInfoCard>) => {
            updateSummary({
              infoCards: sc.infoCards.map(c => c.id === cardId ? { ...c, ...updates } : c),
            });
          };
          return (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground">{t('Summary Settings')}</Label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Title')}</Label>
                  <Input value={sc.title} onChange={(e) => updateSummary({ title: e.target.value })} className="mt-1 input-clean" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Condition Text')}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={sc.conditionText} onChange={(e) => updateSummary({ conditionText: e.target.value })} className="input-clean flex-1" />
                    <input type="color" value={sc.conditionColor} onChange={(e) => updateSummary({ conditionColor: e.target.value })} className="w-8 h-10 p-0.5 rounded-md cursor-pointer border border-border-subtle" title={t('Condition color')} />
                  </div>
                </div>
              </div>

              {/* Image upload */}
              <div>
                <Label className="text-xs text-muted-foreground">{t('Image')}</Label>
                <div className="mt-2">
                  {sc.imageUrl ? (
                    <div className="relative inline-block">
                      <img src={sc.imageUrl} alt="" className="max-w-full h-32 object-contain rounded-lg border border-border-subtle" />
                      <button aria-label={t('Remove image')} onClick={() => updateSummary({ imageUrl: undefined })} className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-90">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input type="file" accept="image/*" className="hidden" id={`summary-img-${question.id}`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { toast.error(tr('Image must be less than 2MB')); return; }
                          try {
                            const { data: { user: authUser } } = await supabase.auth.getUser();
                            if (!authUser) throw new Error('Not authenticated');
                            const fileExt = file.name.split('.').pop();
                            const fileName = `summary-${question.id}-${Date.now()}.${fileExt}`;
                            const uploadPath = `${authUser.id}/questions/${fileName}`;
                            const { error: uploadError } = await supabase.storage.from('quiz-assets').upload(uploadPath, file);
                            if (uploadError) throw uploadError;
                            const { data } = supabase.storage.from('quiz-assets').getPublicUrl(uploadPath);
                            updateSummary({ imageUrl: data.publicUrl });
                          } catch { toast.error(tr('Failed to upload image')); }
                        }}
                      />
                      <label htmlFor={`summary-img-${question.id}`} className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">{t('Click to upload image')}</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Level position slider */}
              <div>
                <Label className="text-xs text-muted-foreground">{t('Level Position ({percent}%)', { percent: sc.levelPosition })}</Label>
                <Slider value={[sc.levelPosition]} min={0} max={100} step={1} onValueChange={([v]) => updateSummary({ levelPosition: v })} className="mt-2" />
              </div>

              {/* Level labels */}
              <div>
                <Label className="text-xs text-muted-foreground">{t('Level Labels')}</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {sc.levelLabels.map((label, i) => (
                    <Input key={i} value={label} onChange={(e) => {
                      const labels = [...sc.levelLabels];
                      labels[i] = e.target.value;
                      updateSummary({ levelLabels: labels });
                    }} className="input-clean text-xs" />
                  ))}
                </div>
              </div>

              {/* Detail box */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Detail Title')}</Label>
                  <Input value={sc.detailTitle} onChange={(e) => updateSummary({ detailTitle: e.target.value })} className="mt-1 input-clean" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Detail Subtitle')}</Label>
                  <Textarea value={sc.detailSubtitle} onChange={(e) => updateSummary({ detailSubtitle: e.target.value })} className="mt-1 input-clean min-h-[60px] resize-none" />
                </div>
              </div>

              {/* Text Size slider */}
              <div>
                <Label className="text-xs text-muted-foreground">{t('Info Card Text Size ({size}px)', { size: sc.textSize || 12 })}</Label>
                <Slider value={[sc.textSize || 12]} min={10} max={18} step={1} onValueChange={([v]) => updateSummary({ textSize: v })} className="mt-2" />
              </div>

              {/* Info Cards */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{t('Info Cards')}</Label>
                {sc.infoCards.map((card, index) => (
                  <div key={card.id} className="card-elevated p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">{index + 1}</div>
                      <span className="text-xs font-medium text-muted-foreground flex-1">{t('Card {number}', { number: index + 1 })}</span>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('Icon (emoji or SVG)')}</Label>
                      <Input value={card.icon} onChange={(e) => updateInfoCard(card.id, { icon: e.target.value })} placeholder='e.g. 😚 or <svg>...</svg>' className="mt-1 input-clean" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('Title')}</Label>
                        <Input value={card.title} onChange={(e) => updateInfoCard(card.id, { title: e.target.value })} className="mt-0.5 input-clean" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('Subtitle')}</Label>
                        <Input value={card.subtitle} onChange={(e) => updateInfoCard(card.id, { subtitle: e.target.value })} className="mt-0.5 input-clean" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Result configuration editor */}
        {question.type === 'result' && question.resultConfig && (() => {
          const rc = question.resultConfig;
          const updateResult = (updates: Partial<typeof rc>) => {
            updateResultConfig(question.id, updates);
          };
          const updateMetric = (metricId: string, updates: Partial<TransformationMetric>) => {
            updateResult({
              metrics: rc.metrics.map(m => m.id === metricId ? { ...m, ...updates } : m),
            });
          };
          const addMetric = () => {
            updateResult({
              metrics: [...rc.metrics, { id: generateId(), label: 'New Metric', nowValue: 'Low', goalValue: 'High', nowLevel: 1, goalLevel: 3 }],
            });
          };
          const deleteMetric = (metricId: string) => {
            if (rc.metrics.length > 1) {
              updateResult({ metrics: rc.metrics.filter(m => m.id !== metricId) });
            }
          };

          return (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground">{t('Result Page Settings')}</Label>

              {/* Headline rich text */}
              <div>
                <Label className="text-xs text-muted-foreground">{t('Headline (rich text)')}</Label>
                <div className="mt-1.5">
                  <RichTextEditor
                    value={rc.headlineHtml}
                    onChange={(html) => updateResult({ headlineHtml: html })}
                    placeholder={t('Enter your headline...')}
                    minHeight="80px"
                  />
                </div>
              </div>

              {/* Transformation Card Labels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Left Card Label')}</Label>
                  <Input value={rc.nowLabel} onChange={(e) => updateResult({ nowLabel: e.target.value })} className="mt-1 input-clean" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Right Card Label')}</Label>
                  <Input value={rc.goalLabel} onChange={(e) => updateResult({ goalLabel: e.target.value })} className="mt-1 input-clean" />
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Now Bar Color')}</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={rc.nowColor} onChange={(e) => updateResult({ nowColor: e.target.value })} className="w-8 h-10 p-0.5 rounded-md cursor-pointer border border-border-subtle" />
                    <Input value={rc.nowColor} onChange={(e) => updateResult({ nowColor: e.target.value })} className="input-clean flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Goal Bar Color')}</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={rc.goalColor} onChange={(e) => updateResult({ goalColor: e.target.value })} className="w-8 h-10 p-0.5 rounded-md cursor-pointer border border-border-subtle" />
                    <Input value={rc.goalColor} onChange={(e) => updateResult({ goalColor: e.target.value })} className="input-clean flex-1" />
                  </div>
                </div>
              </div>

              {/* Image uploads */}
              <div className="grid grid-cols-2 gap-3">
                {(['now', 'goal'] as const).map((side) => {
                  const imgKey = side === 'now' ? 'nowImageUrl' : 'goalImageUrl';
                  const linkedKey = side === 'now' ? 'nowImageFromQuestionId' : 'goalImageFromQuestionId';
                  const imgUrl = rc[imgKey];
                  const linkedQuestionId = rc[linkedKey];
                  const imageSelectionQuestions = quiz.questions.filter(q => q.type === 'image-selection' && q.id !== question.id);
                  const linkedQuestion = imageSelectionQuestions.find(q => q.id === linkedQuestionId);

                  return (
                    <div key={side}>
                      <Label className="text-xs text-muted-foreground">{side === 'now' ? t('Now image') : t('Goal image')}</Label>
                      
                      {/* Link to question dropdown */}
                      {imageSelectionQuestions.length > 0 && (
                        <Select
                          value={linkedQuestionId || '__static__'}
                          onValueChange={(v) => {
                            if (v === '__static__') {
                              updateResult({ [linkedKey]: undefined });
                            } else {
                              updateResult({ [linkedKey]: v });
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1.5 input-clean h-8 text-xs">
                            <SelectValue placeholder={t('Image source')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__static__">{t('Static image')}</SelectItem>
                            {imageSelectionQuestions.map((q) => (
                              <SelectItem key={q.id} value={q.id}>
                                {q.text || t('Question {number}', { number: quiz.questions.indexOf(q) + 1 })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <div className="mt-2">
                        {linkedQuestionId && linkedQuestion ? (
                          <div className="p-2 bg-secondary/50 rounded-lg border border-border-subtle">
                            <p className="text-[10px] text-muted-foreground text-center">
                              {t("🔗 Linked to user's answer from:")}<br/>
                              <span className="font-medium">{linkedQuestion.text || t('Untitled question')}</span>
                            </p>
                          </div>
                        ) : imgUrl ? (
                          <div className="relative inline-block">
                            <img src={imgUrl} alt="" className="w-full h-24 object-contain rounded-lg border border-border-subtle" />
                            <button aria-label={t('Remove image')} onClick={() => updateResult({ [imgKey]: undefined })} className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-90">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <input type="file" accept="image/*" className="hidden" id={`result-${side}-img-${question.id}`}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) { toast.error(tr('Image must be less than 2MB')); return; }
                                try {
                                  const { data: { user: authUser } } = await supabase.auth.getUser();
                                  if (!authUser) throw new Error('Not authenticated');
                                  const fileExt = file.name.split('.').pop();
                                  const fileName = `result-${side}-${question.id}-${Date.now()}.${fileExt}`;
                                  const uploadPath = `${authUser.id}/questions/${fileName}`;
                                  const { error: uploadError } = await supabase.storage.from('quiz-assets').upload(uploadPath, file);
                                  if (uploadError) throw uploadError;
                                  const { data } = supabase.storage.from('quiz-assets').getPublicUrl(uploadPath);
                                  updateResult({ [imgKey]: data.publicUrl });
                                } catch { toast.error(tr('Failed to upload image')); }
                              }}
                            />
                            <label htmlFor={`result-${side}-img-${question.id}`} className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
                              <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                              <span className="text-[10px] text-muted-foreground">{t('Upload')}</span>
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">{t('Metrics')}</Label>
                  <Button variant="ghost" size="sm" onClick={addMetric} className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm">
                    <Plus className="w-4 h-4 mr-1" />
                    {t('Add Metric')}
                  </Button>
                </div>
                {rc.metrics.map((metric, index) => (
                  <div key={metric.id} className="card-elevated p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">{index + 1}</div>
                      <Input value={metric.label} onChange={(e) => updateMetric(metric.id, { label: e.target.value })} placeholder={t('Metric label')} className="flex-1 input-clean" />
                      {rc.metrics.length > 1 && (
                        <button aria-label={t('Delete metric')} onClick={() => deleteMetric(metric.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Now Value')}</Label>
                        <Input value={metric.nowValue} onChange={(e) => updateMetric(metric.id, { nowValue: e.target.value })} className="input-clean mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Goal Value')}</Label>
                        <Input value={metric.goalValue} onChange={(e) => updateMetric(metric.id, { goalValue: e.target.value })} className="input-clean mt-0.5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Now Level (1-3)')}</Label>
                        <Input type="number" min={1} max={3} value={metric.nowLevel} onChange={(e) => updateMetric(metric.id, { nowLevel: parseInt(e.target.value) || 1 })} className="input-clean mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Goal Level (1-3)')}</Label>
                        <Input type="number" min={1} max={3} value={metric.goalLevel} onChange={(e) => updateMetric(metric.id, { goalLevel: parseInt(e.target.value) || 1 })} className="input-clean mt-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">{t('Info Cards')}</Label>
                  <Button variant="ghost" size="sm" onClick={() => {
                    updateResult({
                      infoCards: [...(rc.infoCards || []), { id: generateId(), type: 'text', label: 'New Card', value: 'Value' }],
                    });
                  }} className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm">
                    <Plus className="w-4 h-4 mr-1" />
                    {t('Add Card')}
                  </Button>
                </div>
                {(rc.infoCards || []).map((card, index) => (
                  <div key={card.id} className="card-elevated p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">{index + 1}</div>
                      <Select value={card.type} onValueChange={(v) => {
                        updateResult({
                          infoCards: (rc.infoCards || []).map(c => c.id === card.id ? { ...c, type: v as ResultInfoCard['type'] } : c),
                        });
                      }}>
                        <SelectTrigger className="flex-1 input-clean h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">{t('Text')}</SelectItem>
                          <SelectItem value="slider">{t('Slider')}</SelectItem>
                          <SelectItem value="highlighted">{t('Highlighted')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {(rc.infoCards || []).length > 1 && (
                        <button aria-label={t('Delete info card')} onClick={() => {
                          updateResult({ infoCards: (rc.infoCards || []).filter(c => c.id !== card.id) });
                        }} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Label')}</Label>
                        <Input value={card.label} onChange={(e) => {
                          updateResult({
                            infoCards: (rc.infoCards || []).map(c => c.id === card.id ? { ...c, label: e.target.value } : c),
                          });
                        }} className="input-clean mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Value')}</Label>
                        <Input value={card.value} onChange={(e) => {
                          updateResult({
                            infoCards: (rc.infoCards || []).map(c => c.id === card.id ? { ...c, value: e.target.value } : c),
                          });
                        }} className="input-clean mt-0.5" />
                      </div>
                    </div>
                    {/* Icon SVG picker */}
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground">{t('Icon (SVG)')}</Label>
                      <IconPicker
                        value={card.iconSvg}
                        onChange={(svg) => {
                          updateResult({
                            infoCards: (rc.infoCards || []).map(c => c.id === card.id ? { ...c, iconSvg: svg } : c),
                          });
                        }}
                      />
                    </div>
                    {card.type === 'slider' && (
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Slider Position (0-100)')}</Label>
                        <Slider
                          value={[card.sliderPosition || 50]}
                          onValueChange={([v]) => {
                            updateResult({
                              infoCards: (rc.infoCards || []).map(c => c.id === card.id ? { ...c, sliderPosition: v } : c),
                            });
                          }}
                          min={0} max={100} step={1} className="mt-1"
                        />
                      </div>
                    )}
                    {card.type === 'highlighted' && (
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('Accent Color')}</Label>
                        <div className="flex gap-2 mt-0.5">
                          <input type="color" value={card.accentColor || '#2DD4BF'} onChange={(e) => {
                            updateResult({
                              infoCards: (rc.infoCards || []).map(c => c.id === card.id ? { ...c, accentColor: e.target.value } : c),
                            });
                          }} className="w-8 h-8 p-0.5 rounded-md cursor-pointer border border-border-subtle" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{t('CTA Button')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('Button Text')}</Label>
                    <Input value={rc.ctaText} onChange={(e) => updateResult({ ctaText: e.target.value })} className="mt-1 input-clean" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('Button URL')}</Label>
                    <Input value={rc.ctaUrl} onChange={(e) => updateResult({ ctaUrl: e.target.value })} placeholder="https://..." className="mt-1 input-clean" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('Button Color')}</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={rc.ctaButtonColor || '#0066FF'} onChange={(e) => updateResult({ ctaButtonColor: e.target.value })} className="w-8 h-8 p-0.5 rounded-md cursor-pointer border border-border-subtle" />
                      <Input value={rc.ctaButtonColor || ''} onChange={(e) => updateResult({ ctaButtonColor: e.target.value })} placeholder={t('Primary')} className="input-clean flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('Corner Radius')}</Label>
                    <Select value={rc.ctaButtonRadius || 'large'} onValueChange={(v) => updateResult({ ctaButtonRadius: v as any })}>
                      <SelectTrigger className="mt-1 input-clean h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('None')}</SelectItem>
                        <SelectItem value="small">{t('Small')}</SelectItem>
                        <SelectItem value="medium">{t('Medium')}</SelectItem>
                        <SelectItem value="large">{t('Large')}</SelectItem>
                        <SelectItem value="full">{t('Full')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Text Size */}
              <div>
                <Label className="text-xs text-muted-foreground">{t('Metric & Card Text Size ({size}px)', { size: rc.textSize || 12 })}</Label>
                <Slider
                  value={[rc.textSize || 12]}
                  onValueChange={([v]) => updateResult({ textSize: v })}
                  min={8} max={18} step={1} className="mt-2"
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Feedback editor */}
      {question.type === 'feedback' && question.feedbackConfig && (() => {
        const cfg = question.feedbackConfig;
        const updateCfg = (updates: Partial<typeof cfg>) =>
          updateQuestion(question.id, { feedbackConfig: { ...cfg, ...updates } });
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">{t('Feedback Page')}</Label>

            <div className="card-elevated p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">{t('Video')}</Label>
              {cfg.videoUrl ? (
                <div className="space-y-2">
                  <video src={cfg.videoUrl} controls className="w-full rounded-lg max-h-40 bg-black" />
                  <button
                    type="button"
                    onClick={() => updateCfg({ videoUrl: '' })}
                    className="text-xs text-destructive hover:underline"
                  >
                    {t('Remove video')}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('No video yet — upload a file or paste a URL.')}</p>
              )}

              <input
                ref={feedbackVideoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 50 * 1024 * 1024) {
                    toast.error(tr('Video must be less than 50MB'));
                    return;
                  }
                  try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (!authUser) throw new Error('Not authenticated');
                    const fileExt = file.name.split('.').pop();
                    const uploadPath = `${authUser.id}/questions/feedback-${question.id}-${Date.now()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('quiz-assets').upload(uploadPath, file);
                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from('quiz-assets').getPublicUrl(uploadPath);
                    updateCfg({ videoUrl: data.publicUrl });
                    toast.success(tr('Video uploaded'));
                  } catch (err) {
                    console.error('Error uploading video:', err);
                    toast.error(tr('Failed to upload video'));
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => feedbackVideoRef.current?.click()}
                className="h-8 text-xs w-full bg-secondary hover:bg-secondary/80"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {t('Upload video')}
              </Button>
              <Input
                value={cfg.videoUrl || ''}
                onChange={(e) => updateCfg({ videoUrl: e.target.value })}
                placeholder={t('Or paste a video URL')}
                className="input-clean"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t('Caption')}</Label>
              <Input
                value={cfg.caption || ''}
                onChange={(e) => updateCfg({ caption: e.target.value })}
                placeholder="Sample caption text"
                className="mt-1 input-clean"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t('Headline')}</Label>
              <Input
                value={cfg.headline}
                onChange={(e) => updateCfg({ headline: e.target.value })}
                placeholder="Checking for updates"
                className="mt-1 input-clean"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t('Sub-headline')}</Label>
              <Input
                value={cfg.subHeadline}
                onChange={(e) => updateCfg({ subHeadline: e.target.value })}
                placeholder="Almost there!"
                className="mt-1 input-clean"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t('Spinner duration (seconds)')}</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={cfg.durationSeconds}
                onChange={(e) => updateCfg({ durationSeconds: Math.min(60, Math.max(1, parseInt(e.target.value) || 1)) })}
                className="mt-1 input-clean"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('The quiz moves to the next page automatically when the spinner finishes.')}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Warning editor */}
      {question.type === 'warning' && question.warningConfig && (() => {
        const cfg = question.warningConfig;
        const updateCfg = (updates: Partial<typeof cfg>) =>
          updateQuestion(question.id, { warningConfig: { ...cfg, ...updates } });
        const ColorRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value?.slice(0, 7) || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 p-0.5 rounded-md cursor-pointer border border-border-subtle flex-shrink-0"
            />
            <div className="flex-1">
              <Label className="text-[11px] text-muted-foreground">{label}</Label>
              <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 mt-0.5 input-clean text-xs" />
            </div>
          </div>
        );
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">{t('Warning Page')}</Label>

            {/* Gradient background */}
            <div className="card-elevated p-3 space-y-2">
              <Label className="text-xs font-medium text-foreground">{t('Background Gradient')}</Label>
              <ColorRow label={t('Top color')} value={cfg.gradientFrom} onChange={(v) => updateCfg({ gradientFrom: v })} />
              <ColorRow label={t('Bottom color')} value={cfg.gradientTo} onChange={(v) => updateCfg({ gradientTo: v })} />
              <div>
                <Label className="text-[11px] text-muted-foreground">{t('Angle: {degrees}°', { degrees: cfg.gradientAngle ?? 180 })}</Label>
                <Slider
                  value={[cfg.gradientAngle ?? 180]}
                  min={0}
                  max={360}
                  step={5}
                  onValueChange={([v]) => updateCfg({ gradientAngle: v })}
                  className="mt-2"
                />
              </div>
              <div
                className="h-10 rounded-lg border border-border-subtle"
                style={{ backgroundImage: `linear-gradient(${cfg.gradientAngle ?? 180}deg, ${cfg.gradientFrom}, ${cfg.gradientTo})` }}
              />
            </div>

            {/* Badge */}
            <div className="card-elevated p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">{t('Badge Pill')}</Label>
                <Switch checked={cfg.showBadge} onCheckedChange={(c) => updateCfg({ showBadge: c })} />
              </div>
              {cfg.showBadge && (
                <>
                  <Input
                    value={cfg.badgeText}
                    onChange={(e) => updateCfg({ badgeText: e.target.value })}
                    placeholder="THE PROBLEM"
                    className="input-clean"
                  />
                  <ColorRow label={t('Text color')} value={cfg.badgeTextColor} onChange={(v) => updateCfg({ badgeTextColor: v })} />
                  <ColorRow label={t('Background color')} value={cfg.badgeBgColor} onChange={(v) => updateCfg({ badgeBgColor: v })} />
                </>
              )}
            </div>

            {/* Icon */}
            <div className="card-elevated p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">{t('Icon')}</Label>
                <Switch checked={cfg.showIcon} onCheckedChange={(c) => updateCfg({ showIcon: c })} />
              </div>
              {cfg.showIcon && (
                <>
                  <Select value={cfg.icon} onValueChange={(v) => updateCfg({ icon: v as WarningIcon })}>
                    <SelectTrigger className="input-clean"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alert-circle">Alert Circle</SelectItem>
                      <SelectItem value="alert-triangle">Alert Triangle</SelectItem>
                      <SelectItem value="alert-octagon">Alert Octagon</SelectItem>
                      <SelectItem value="info">{t('Info')}</SelectItem>
                      <SelectItem value="x-circle">X Circle</SelectItem>
                      <SelectItem value="shield-alert">Shield Alert</SelectItem>
                    </SelectContent>
                  </Select>
                  <ColorRow label={t('Icon color')} value={cfg.iconColor} onChange={(v) => updateCfg({ iconColor: v })} />
                  <ColorRow label={t('Circle color')} value={cfg.iconBgColor} onChange={(v) => updateCfg({ iconBgColor: v })} />
                </>
              )}
            </div>

            {/* Stat */}
            <div className="card-elevated p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">{t('Stat')}</Label>
                <Switch checked={cfg.showStat} onCheckedChange={(c) => updateCfg({ showStat: c })} />
              </div>
              {cfg.showStat && (
                <>
                  <Input
                    value={cfg.statValue}
                    onChange={(e) => updateCfg({ statValue: e.target.value })}
                    placeholder="30%"
                    className="input-clean"
                  />
                  <Input
                    value={cfg.statLabel}
                    onChange={(e) => updateCfg({ statLabel: e.target.value })}
                    placeholder="of men affected"
                    className="input-clean"
                  />
                  <ColorRow label={t('Stat color')} value={cfg.statColor} onChange={(v) => updateCfg({ statColor: v })} />
                  <ColorRow label={t('Label color')} value={cfg.statLabelColor} onChange={(v) => updateCfg({ statLabelColor: v })} />
                </>
              )}
            </div>

            {/* Copy */}
            <div className="card-elevated p-3 space-y-2">
              <Label className="text-xs font-medium text-foreground">{t('Headline')}</Label>
              <Textarea
                value={cfg.headline}
                onChange={(e) => updateCfg({ headline: e.target.value })}
                placeholder="It's more than the bedroom"
                className="input-clean min-h-[60px] resize-none"
              />
              <ColorRow label={t('Headline color')} value={cfg.headlineColor} onChange={(v) => updateCfg({ headlineColor: v })} />

              <Label className="text-xs font-medium text-foreground pt-1 block">{t('Body text')}</Label>
              <Textarea
                value={cfg.bodyText}
                onChange={(e) => updateCfg({ bodyText: e.target.value })}
                placeholder={t('Supporting paragraph...')}
                className="input-clean min-h-[70px] resize-none"
              />
              <ColorRow label={t('Body color')} value={cfg.bodyColor} onChange={(v) => updateCfg({ bodyColor: v })} />
            </div>
          </div>
        );
      })()}

      {/* Score Slider editor */}
      {question.type === 'score-slider' && question.scoreSliderConfig && (() => {
        const cfg = question.scoreSliderConfig;
        const updateCfg = (updates: Partial<typeof cfg>) =>
          updateQuestion(question.id, { scoreSliderConfig: { ...cfg, ...updates } });
        const updateRange = (idx: number, updates: Partial<ScoreSliderRange>) => {
          const ranges = cfg.ranges.map((r, i) => (i === idx ? { ...r, ...updates } : r));
          updateCfg({ ranges });
        };
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">{t('Score Slider')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t('Min')}</Label>
                <Input type="number" value={cfg.min}
                  onChange={(e) => updateCfg({ min: parseInt(e.target.value) || 1 })}
                  className="mt-1 input-clean" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('Max')}</Label>
                <Input type="number" value={cfg.max}
                  onChange={(e) => updateCfg({ max: parseInt(e.target.value) || 10 })}
                  className="mt-1 input-clean" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t('Start Label')}</Label>
                <Input value={cfg.startLabel}
                  onChange={(e) => updateCfg({ startLabel: e.target.value })}
                  className="mt-1 input-clean" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('End Label')}</Label>
                <Input value={cfg.endLabel}
                  onChange={(e) => updateCfg({ endLabel: e.target.value })}
                  className="mt-1 input-clean" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('Color Ranges')}</Label>
              {cfg.ranges.map((r, idx) => (
                <div key={idx} className="card-elevated p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={r.color}
                      onChange={(e) => updateRange(idx, { color: e.target.value })}
                      className="w-9 h-9 p-0.5 rounded-md cursor-pointer border border-border-subtle"
                    />
                    <Input value={r.label}
                      onChange={(e) => updateRange(idx, { label: e.target.value })}
                      placeholder={t('Label')}
                      className="flex-1 input-clean" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">{t('From')}</Label>
                      <Input type="number" value={r.from}
                        onChange={(e) => updateRange(idx, { from: parseInt(e.target.value) || 1 })}
                        className="mt-1 input-clean h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">{t('To')}</Label>
                      <Input type="number" value={r.to}
                        onChange={(e) => updateRange(idx, { to: parseInt(e.target.value) || 1 })}
                        className="mt-1 input-clean h-8 text-xs" />
                    </div>
                  </div>
                  {cfg.ranges.length > 1 && (
                    <button
                      onClick={() => updateCfg({ ranges: cfg.ranges.filter((_, i) => i !== idx) })}
                      className="text-xs text-destructive hover:underline"
                    >
                      {t('Remove range')}
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateCfg({
                  ranges: [...cfg.ranges, { from: cfg.min, to: cfg.max, color: '#6B7280', label: 'New range' }],
                })}
                className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('Add Range')}
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Answer Options - hide for non-option-based types */}
      {question.type !== 'blank' && question.type !== 'analyzing' && question.type !== 'chart' && question.type !== 'summary' && question.type !== 'result' && question.type !== 'score-slider' && question.type !== 'feedback' && question.type !== 'warning' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">{t('Answer Options')}</Label>
            {question.type !== 'yes-no' && question.options.length < 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addOption(question.id)}
                className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('Add Option')}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {question.options.map((option, index) => (
              <OptionCard
                key={option.id}
                option={option}
                index={index}
                questionId={question.id}
                questionType={question.type}
                canDelete={question.options.length > 2}
                onUpdateOption={updateOption}
                onDeleteOption={deleteOption}
                onImageUpload={handleImageUpload}
                onRemoveImage={handleRemoveImage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
