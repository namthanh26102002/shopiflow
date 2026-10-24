import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

/**
 * The live preview, for screens too narrow to keep it docked.
 *
 * Below the xl breakpoint the builders' editing panels plus a docked preview
 * do not fit, so the preview column hides and this floating button opens it
 * as a slide-over instead. At xl and up the button is hidden.
 */
export const PreviewDrawer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="xl:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <Eye className="h-4 w-4" />
        Preview
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[420px] max-w-[92vw] sm:max-w-[420px] p-0 flex flex-col">
          <SheetTitle className="sr-only">Live preview</SheetTitle>
          <SheetDescription className="sr-only">How visitors will see this page.</SheetDescription>
          <div className="flex-1 min-h-0 pt-10">{children}</div>
        </SheetContent>
      </Sheet>
    </>
  );
};
