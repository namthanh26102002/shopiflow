// /builder — opens the most recent quiz project, or creates one.
import React from 'react';
import { ProjectResolver } from '@/components/shared/ProjectResolver';

const BuilderEntry: React.FC = () => (
  <ProjectResolver table="quizzes" basePath="/builder" noun="quiz" />
);

export default BuilderEntry;
