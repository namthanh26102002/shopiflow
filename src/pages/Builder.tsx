// Quiz Builder Page
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { QuizProvider, useQuiz } from '@/contexts/QuizContext';
import { toast } from 'sonner';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { BuilderSidebar, BuilderTab } from '@/components/builder/BuilderSidebar';
import { QuestionsList } from '@/components/builder/QuestionsList';
import { QuestionEditor } from '@/components/builder/QuestionEditor';
import { SettingsPanel } from '@/components/builder/SettingsPanel';

import { AnalyticsPanel } from '@/components/builder/AnalyticsPanel';
import { DomainPanel } from '@/components/builder/DomainPanel';
import { LivePreview } from '@/components/builder/LivePreview';
import { PublishDialog } from '@/components/builder/PublishDialog';
import { QuizOverview } from '@/components/builder/QuizOverview';
import { QuestionsListSkeleton, EditorSkeleton, PreviewSkeleton } from '@/components/builder/BuilderSkeleton';

const BuilderContent: React.FC = () => {
  const { quiz, selectedQuestionId, setSelectedQuestionId, loading, notFound } = useQuiz();
  const [activeTab, setActiveTab] = useState<BuilderTab>('questions');
  const [publishOpen, setPublishOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);

  const selectedQuestion = quiz.questions.find(q => q.id === selectedQuestionId);

  // Deleted (possibly in another tab), or someone else's. Say why before
  // sending them back, rather than ejecting silently.
  useEffect(() => {
    if (notFound) toast.error('That quiz project no longer exists.');
  }, [notFound]);

  if (notFound) return <Navigate to="/builder" replace />;

  return (
    <div className="h-screen flex flex-col bg-background">
      <BuilderHeader
        onPublish={() => setPublishOpen(true)}
        onOverview={() => setOverviewOpen(true)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <BuilderSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === 'domain' ? (
          <div className="flex-1 overflow-hidden">
            <DomainPanel />
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="flex-1 overflow-y-auto scrollbar-thin bg-secondary/20">
            <div className="max-w-6xl mx-auto p-6">
              <AnalyticsPanel />
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          /* Settings workspace — full width settings + fixed preview */
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 min-w-0 border-r border-border-subtle bg-secondary/20 overflow-y-auto scrollbar-thin">
              <div className="p-6">
                <SettingsPanel />
              </div>
            </div>

            <div className="w-[380px] shrink-0 bg-card overflow-hidden flex flex-col">
              <LivePreview />
            </div>
          </div>
        ) : (
          /* Main Content Area */
          <div className="flex-1 flex">
            {/* Left Panel - Controls */}
            <div className="w-80 border-r border-border-subtle bg-card overflow-y-auto scrollbar-thin">
              <div className="p-4">
                {activeTab === 'questions' && <QuestionsList />}
              </div>
            </div>

            {/* Center Panel - Editor */}
            <div className="flex-1 border-r border-border-subtle bg-secondary/20 overflow-y-auto scrollbar-thin">
              <div className="p-6">
                {activeTab === 'questions' && (
                  <>
                    {loading ? (
                      <EditorSkeleton />
                    ) : selectedQuestion ? (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                            style={{ backgroundColor: `${quiz.settings.primaryColor}20`, color: quiz.settings.primaryColor }}
                          >
                            Q{quiz.questions.findIndex(q => q.id === selectedQuestionId) + 1}
                          </div>
                          <h2 className="text-lg font-semibold text-foreground">Edit Question</h2>
                        </div>
                        <QuestionEditor question={selectedQuestion} />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                            <span className="text-2xl">📝</span>
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">Select a question to edit</p>
                          <p className="text-xs text-muted-foreground">
                            Or add a new question from the left panel
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-[380px] shrink-0 bg-card overflow-hidden flex flex-col">
              <LivePreview />
            </div>
          </div>
        )}
      </div>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} />

      <QuizOverview
        open={overviewOpen}
        onOpenChange={setOverviewOpen}
        quiz={quiz}
        onSelectQuestion={(id) => {
          // Selecting only shows in the questions tab, so switch there too.
          setSelectedQuestionId(id);
          setActiveTab('questions');
          setOverviewOpen(false);
        }}
      />
    </div>
  );
};

const Builder: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();


  if (!quizId) return <Navigate to="/builder" replace />;

  return (
    <QuizProvider quizId={quizId}>
      <BuilderContent />
    </QuizProvider>
  );
};

export default Builder;
