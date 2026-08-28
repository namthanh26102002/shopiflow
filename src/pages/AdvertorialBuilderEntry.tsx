// /advertorial-builder — opens the most recent advertorial project, or creates one.
import React from 'react';
import { ProjectResolver } from '@/components/shared/ProjectResolver';

const AdvertorialBuilderEntry: React.FC = () => (
  <ProjectResolver table="advertorials" basePath="/advertorial-builder" noun="advertorial" />
);

export default AdvertorialBuilderEntry;
