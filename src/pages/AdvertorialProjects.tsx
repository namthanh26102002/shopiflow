// Project picker for the advertorial builder (/advertorial-builder).
import React from 'react';
import { ProjectList } from '@/components/shared/ProjectList';

const AdvertorialProjects: React.FC = () => (
  <ProjectList
    table="advertorials"
    heading="Advertorial Projects"
    basePath="/advertorial-builder"
    noun="advertorial"
  />
);

export default AdvertorialProjects;
