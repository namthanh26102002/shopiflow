// /theme-builder — opens the most recent Shopify theme project, or creates one.
import React from 'react';
import { ProjectResolver } from '@/components/shared/ProjectResolver';

const ThemeBuilderEntry: React.FC = () => (
  <ProjectResolver table="shopify_themes" basePath="/theme-builder" noun="theme" />
);

export default ThemeBuilderEntry;
