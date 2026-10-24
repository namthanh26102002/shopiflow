import React from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

interface SaveStatusProps {
  saving: boolean;
  /** The last save failed and the changes exist only in this tab. */
  failed: boolean;
  onRetry: () => void;
  /** Colour for the neutral states, for editors with their own theme. */
  mutedColor?: string;
}

/**
 * Autosave status for the editors. A failed save has to be visible: without
 * it the indicator kept saying "Saved" while edits existed only in the tab.
 */
export const SaveStatus: React.FC<SaveStatusProps> = ({ saving, failed, onRetry, mutedColor }) => {
  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" style={{ color: mutedColor }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Couldn't save</span>
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" style={{ color: mutedColor }}>
      <Cloud className="w-3.5 h-3.5 text-green-500" />
      <span>Saved</span>
    </div>
  );
};
