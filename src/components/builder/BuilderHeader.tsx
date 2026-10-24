import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2, LogOut, KeyRound, Users, LayoutGrid } from 'lucide-react';
import { useQuiz } from '@/contexts/QuizContext';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { AccessCodeManager } from '@/components/admin/AccessCodeManager';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { ProjectSwitcher } from '@/components/shared/ProjectSwitcher';
import { SaveStatus } from '@/components/shared/SaveStatus';
import { PublishStatus } from '@/components/shared/PublishStatus';

interface BuilderHeaderProps {
  onPublish: () => void;
  onOverview: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({ onPublish, onOverview }) => {
  const { quiz, saving, saveFailed, saveQuiz, updateSettings } = useQuiz();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [showAccessCodes, setShowAccessCodes] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-3 lg:gap-4 min-w-0">
        <BuilderSwitcher />
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-1">
          <input
            value={quiz.settings.title}
            onChange={(e) => updateSettings({ title: e.target.value })}
            className="text-sm text-muted-foreground bg-transparent border-none outline-none focus:text-foreground hover:text-foreground transition-colors w-32 lg:w-48"
            aria-label="Quiz name"
            placeholder="Quiz name..."
          />
          <ProjectSwitcher
            table="quizzes"
            basePath="/builder"
            noun="quiz"
            currentId={quizId}
            currentTitle={quiz.settings.title}
            templateContent={{
              settings: quiz.settings,
              questions: quiz.questions,
              products: quiz.products,
              results: quiz.results,
            }}
          />
        </div>
        
        <PublishStatus
          liveUrl={quiz.publishedUrl ? `${window.location.origin}/quiz/${quiz.id}` : null}
          noun="quiz"
        />
        <SaveStatus saving={saving} failed={saveFailed} onRetry={saveQuiz} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="ml-3 hidden xl:inline text-xs text-muted-foreground">{user?.email}</span>
        
        <Button
          variant="outline"
          onClick={onOverview}
          className="h-8 px-3 text-sm"
          title="See the whole quiz flow"
        >
          <LayoutGrid className="w-3.5 h-3.5 lg:mr-1.5" />
          <span className="hidden lg:inline">Overview</span>
        </Button>

        <Button 
          onClick={onPublish} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-sm"
          style={{ backgroundColor: quiz.settings.primaryColor }}
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          Publish
        </Button>

        {isAdmin && (
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8" 
            onClick={() => navigate('/admin/users')} 
            title="User Management"
          >
            <Users className="w-4 h-4" />
          </Button>
        )}

        {isAdmin && (
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8" 
            onClick={() => setShowAccessCodes(true)} 
            title="Manage Access Codes"
          >
            <KeyRound className="w-4 h-4" />
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 text-muted-foreground hover:text-foreground" 
          onClick={signOut} 
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      <AccessCodeManager open={showAccessCodes} onOpenChange={setShowAccessCodes} />
    </header>
  );
};