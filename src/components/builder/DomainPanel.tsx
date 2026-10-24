import React from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { ProjectDomainAssignment } from '@/components/shared/ProjectDomainAssignment';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/i18n';

export const DomainPanel: React.FC = () => {
  const t = useT();
  const { quiz, updateSettings } = useQuiz();

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{t('Domain')}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('Choose which domain serves this quiz')}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <ProjectDomainAssignment
            contentId={quiz.id}
            contentType="quiz"
            publishedUrl={quiz.publishedUrl}
            onDomainChange={(domain) => updateSettings({ customDomain: domain })}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
