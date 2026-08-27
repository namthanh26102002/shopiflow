import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Undo2, Redo2, Share2, LogOut, Cloud, CloudOff, KeyRound, Users } from 'lucide-react';
import { useQuiz } from '@/contexts/QuizContext';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { AccessCodeManager } from '@/components/admin/AccessCodeManager';
import { BuilderSwitcher } from '@/components/shared/BuilderSwitcher';
import { ProjectSwitcher } from '@/components/shared/ProjectSwitcher';

interface BuilderHeaderProps {
  onPublish: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({ onPublish }) => {
  const { quiz, saving, updateSettings } = useQuiz();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [showAccessCodes, setShowAccessCodes] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <BuilderSwitcher />
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-1">
          <input
            value={quiz.settings.title}
            onChange={(e) => updateSettings({ title: e.target.value })}
            className="text-sm text-muted-foreground bg-transparent border-none outline-none focus:text-foreground hover:text-foreground transition-colors w-48"
            placeholder="Quiz name..."
          />
          <ProjectSwitcher table="quizzes" basePath="/builder" noun="quiz" currentId={quizId} />
        </div>
        
        {/* Auto-save indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saving ? (
            <>
              <CloudOff className="w-3.5 h-3.5 animate-pulse" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-green-500" />
              <span>Saved</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{user?.email}</span>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" disabled>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" disabled>
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

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