import React, { useState } from 'react';
import { Plus, Copy, Trash2, ToggleLeft, ToggleRight, Check, Clock, Shield } from 'lucide-react';
import { useAccessCodes } from '@/hooks/useAccessCodes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AccessCodeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTrialStatus = (code: { trial_days: number | null; used_at: string | null; used_by: string | null }) => {
  if (!code.trial_days) return null;
  if (!code.used_at || !code.used_by) return { label: `${code.trial_days}-day trial`, expired: false, daysLeft: code.trial_days };
  
  const usedAt = new Date(code.used_at);
  const expiresAt = new Date(usedAt.getTime() + code.trial_days * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  const expired = now >= expiresAt;

  return { label: expired ? 'Expired' : `${daysLeft}d left`, expired, daysLeft };
};

export const AccessCodeManager: React.FC<AccessCodeManagerProps> = ({ open, onOpenChange }) => {
  const { codes, loading, createCode, toggleCodeStatus, deleteCode } = useAccessCodes();
  const [customCode, setCustomCode] = useState('');
  const [trialDays, setTrialDays] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCode = async () => {
    setIsCreating(true);
    const days = trialDays.trim() ? parseInt(trialDays, 10) : null;
    if (trialDays.trim() && (isNaN(days!) || days! < 1)) {
      toast.error('Trial days must be a positive number');
      setIsCreating(false);
      return;
    }
    const result = await createCode(customCode || undefined, days);
    setIsCreating(false);

    if (result.success) {
      toast.success('Access code created');
      setCustomCode('');
      setTrialDays('');
    } else {
      toast.error(result.error || 'Failed to create code');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleToggleStatus = async (codeId: string, currentStatus: boolean) => {
    const result = await toggleCodeStatus(codeId, !currentStatus);
    if (result.success) {
      toast.success(currentStatus ? 'Code deactivated' : 'Code activated');
    } else {
      toast.error(result.error || 'Failed to update code');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    const result = await deleteCode(codeId);
    if (result.success) {
      toast.success('Code deleted');
    } else {
      toast.error(result.error || 'Failed to delete code');
    }
  };

  const availableCodes = codes.filter(c => c.is_active && !c.used_by).length;
  const usedCodes = codes.filter(c => c.used_by).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Access Code Manager</DialogTitle>
          <DialogDescription>
            Create and manage access codes for new users. Each code can only be used once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 text-sm mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full">
            <Check className="w-3.5 h-3.5" />
            <span>{availableCodes} available</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full">
            <span>{usedCodes} used</span>
          </div>
        </div>

        {/* Create new code */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="customCode" className="sr-only">Custom code</Label>
              <Input
                id="customCode"
                placeholder="Custom code or leave empty for random"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                maxLength={12}
              />
            </div>
            <div className="w-28">
              <Label htmlFor="trialDays" className="sr-only">Trial days</Label>
              <Input
                id="trialDays"
                type="number"
                placeholder="Days"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                min={1}
                max={365}
              />
            </div>
            <Button onClick={handleCreateCode} disabled={isCreating}>
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave "Days" empty for permanent access, or set a number for a trial period.
          </p>
        </div>

        {/* Codes list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No access codes yet. Create one to get started.
            </div>
          ) : (
            codes.map((code) => {
              const trial = getTrialStatus(code);
              return (
                <div
                  key={code.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    code.used_by
                      ? 'bg-muted/50 border-border'
                      : code.is_active
                      ? 'bg-card border-border'
                      : 'bg-muted/30 border-border opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="font-mono text-sm font-semibold px-2 py-1 bg-muted rounded shrink-0">
                      {code.code}
                    </code>
                    <div className="flex items-center gap-2 flex-wrap">
                      {trial ? (
                        <Badge variant={trial.expired ? 'destructive' : 'secondary'} className="text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          {trial.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Shield className="w-3 h-3" />
                          Permanent
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {code.used_by ? (
                          <span>Used {code.used_at && format(new Date(code.used_at), 'MMM d, yyyy')}</span>
                        ) : code.is_active ? (
                          <span className="text-green-600">Available</span>
                        ) : (
                          <span>Inactive</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyCode(code.code)}
                      title="Copy code"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    {!code.used_by && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleStatus(code.id, code.is_active)}
                        title={code.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {code.is_active ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCode(code.id)}
                      title="Delete code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
