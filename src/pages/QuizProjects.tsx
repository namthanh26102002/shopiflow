// Project picker for the quiz builder (/builder).
import React from 'react';
import { ProjectList } from '@/components/shared/ProjectList';

const QuizProjects: React.FC = () => (
  <ProjectList table="quizzes" heading="Quiz Projects" basePath="/builder" noun="quiz" />
);

export default QuizProjects;
