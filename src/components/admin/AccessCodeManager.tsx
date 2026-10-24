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
import {
  ACCESS_CODE_MAX_LENGTH,
  normalizeAccessCode,
  describeAccessCodeProblem,
} from '@/lib/accessCode';
import { useT, tr, useDateLocale } from '@/i18n';

interface AccessCodeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTrialStatus = (code: { trial_days: number | null; used_at: string | null; used_by: string | null }) => {
  if (!code.trial_days) return null;
  if (!code.used_at || !code.used_by) return { label: tr('{days}-day trial', { days: code.trial_days }), expired: false, daysLeft: code.trial_days };
  
  const usedAt = new Date(code.used_at);
  const expiresAt = new Date(usedAt.getTime() + code.trial_days * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  const expired = now >= expiresAt;

  return { label: expired ? tr('Expired') : tr('{days}d left', { days: daysLeft }), expired, daysLeft };
};

export const AccessCodeManager: React.FC<AccessCodeManagerProps> = ({ open, onOpenChange }) => {
  const t = useT();
  const dateLocale = useDateLocale();
  const { codes, loading, createCode, toggleCodeStatus, deleteCode } = useAccessCodes();
  const [customCode, setCustomCode] = useState('');
  const [trialDays, setTrialDays] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCode = async () => {
    // Only validate a custom code; an empty field means "generate a random one".
    if (customCode.trim()) {
      const problem = describeAccessCodeProblem(normalizeAccessCode(customCode));
      if (problem) {
        toast.error(problem);
        return;
      }
    }

    setIsCreating(true);
    const days = trialDays.trim() ? parseInt(trialDays, 10) : null;
    if (trialDays.trim() && (isNaN(days!) || days! < 1)) {
      toast.error(tr('Trial days must be a positive number'));
      setIsCreating(false);
      return;
    }
    const result = await createCode(customCode || undefined, days);
    setIsCreating(false);

    if (result.success) {
      toast.success(tr('Access code created'));
      setCustomCode('');
      setTrialDays('');
    } else {
      toast.error(result.error || tr('Failed to create code'));
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(tr('Code copied to clipboard'));
  };

  const handleToggleStatus = async (codeId: string, currentStatus: boolean) => {
    const result = await toggleCodeStatus(codeId, !currentStatus);
    if (result.success) {
      toast.success(currentStatus ? tr('Code deactivated') : tr('Code activated'));
    } else {
      toast.error(result.error || tr('Failed to update code'));
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    const result = await deleteCode(codeId);
    if (result.success) {
      toast.success(tr('Code deleted'));
    } else {
      toast.error(result.error || tr('Failed to delete code'));
    }
  };

  const availableCodes = codes.filter(c => c.is_active && !c.used_by).length;
  const usedCodes = codes.filter(c => c.used_by).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('Access Code Manager')}</DialogTitle>
          <DialogDescription>
            {t('Create and manage access codes for new users. Each code can only be used once.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 text-sm mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full">
            <Check className="w-3.5 h-3.5" />
            <span>{t('{count} available', { count: availableCodes })}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full">
            <span>{t('{count} used', { count: usedCodes })}</span>
          </div>
        </div>

        {/* Create new code */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="customCode" className="sr-only">{t('Custom code')}</Label>
              <Input
                id="customCode"
                placeholder={t('Custom code or leave empty for random')}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                maxLength={ACCESS_CODE_MAX_LENGTH}
              />
            </div>
            <div className="w-28">
              <Label htmlFor="trialDays" className="sr-only">{t('Trial days')}</Label>
              <Input
                id="trialDays"
                type="number"
                placeholder={t('Days')}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                min={1}
                max={365}
              />
            </div>
            <Button onClick={handleCreateCode} disabled={isCreating}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Create')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Leave "Days" empty for permanent access, or set a number for a trial period.')}
          </p>
        </div>

        {/* Codes list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('Loading...')}</div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('No access codes yet. Create one to get started.')}
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
                          {t('Permanent')}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {code.used_by ? (
                          <span>{t('Used {date}', { date: code.used_at ? format(new Date(code.used_at), 'PP', { locale: dateLocale }) : '' })}</span>
                        ) : code.is_active ? (
                          <span className="text-green-600">{t('Available')}</span>
                        ) : (
                          <span>{t('Inactive')}</span>
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
                      title={t('Copy code')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    {!code.used_by && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleStatus(code.id, code.is_active)}
                        title={code.is_active ? t('Deactivate') : t('Activate')}
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
                      title={t('Delete code')}
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
