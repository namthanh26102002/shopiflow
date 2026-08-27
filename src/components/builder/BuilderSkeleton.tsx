import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const QuestionsListSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="builder-panel p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const EditorSkeleton: React.FC = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center space-y-4">
      <Skeleton className="w-16 h-16 rounded-full mx-auto" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 mx-auto" />
        <Skeleton className="h-3 w-56 mx-auto" />
      </div>
    </div>
  </div>
);

export const PreviewSkeleton: React.FC = () => (
  <div className="flex flex-col h-full">
    <div className="p-3 border-b border-border-subtle flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-6 rounded" />
    </div>
    <div className="flex-1 p-4 space-y-6">
      {/* Logo/Store name skeleton */}
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Progress bar skeleton */}
      <Skeleton className="h-2 w-full rounded-full" />
      {/* Question skeleton */}
      <div className="space-y-4 mt-8">
        <Skeleton className="h-5 w-3/4 mx-auto" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </div>
);
