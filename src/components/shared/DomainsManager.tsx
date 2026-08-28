// Account-level domain management. Domains are added, verified and removed
// once here, then assigned to projects from each builder's Domain tab.
import React, { useState, useEffect } from 'react';
import {
  Globe, Plus, RefreshCw, Trash2, Copy, Check,
  CheckCircle2, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useDomains, Domain, STATUS_LABEL, describeDomainState,
} from '@/hooks/useDomains';

interface DomainsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StatusBadge: React.FC<{ domain: Domain }> = ({ domain }) => {
  const map = {
    active: { Icon: CheckCircle2, cls: 'bg-green-500/10 text-green-600' },
    pending: { Icon: Clock, cls: 'bg-amber-500/10 text-amber-600' },
    error: { Icon: AlertCircle, cls: 'bg-destructive/10 text-destructive' },
  }[domain.status];
  const Icon = map.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${map.cls}`}>
      <Icon className="w-3 h-3" />
      {STATUS_LABEL[domain.status]}
    </span>
  );
};

export const DomainsManager: React.FC<DomainsManagerProps> = ({ open, onOpenChange }) => {
  const {
    domains, mappings, loading, busyId, addDomain, recheckDomain, removeDomain, refresh,
  } = useDomains();
  const [newDomain, setNewDomain] = useState('');
  const [pendingRemove, setPendingRemove] = useState<Domain | null>(null);
  const [copied, setCopied] = useState(false);
  const [expectedIp, setExpectedIp] = useState<string | null>(null);

  // The A-record target is a deployment detail, so it comes from the server
  // rather than being hard-coded in the client.
  // Mounted with the Domain tab, so refetch on open rather than showing
  // whatever was true when the panel first rendered.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    supabase.functions
      .invoke('check-dns', { body: { action: 'proxy-ip' } })
      .then(({ data }) => setExpectedIp(data?.expectedIp ?? null))
      .catch(() => setExpectedIp(null));
  }, [open]);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    const ok = await addDomain(newDomain);
    if (ok) setNewDomain('');
  };

  const copyIp = () => {
    if (!expectedIp) return;
    navigator.clipboard.writeText(expectedIp);
    setCopied(true);
    toast.success('IP copied');
    setTimeout(() => setCopied(false), 2000);
  };

  /** Projects currently pointed at a domain, for the "in use by" line. */
  const usedBy = (d: Domain) =>
    mappings.filter(m => m.domain_id === d.id || m.domain === d.domain);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Domains
            </DialogTitle>
            <DialogDescription>
              Connect a domain once here, then assign it to any project from that
              project&apos;s Domain tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="newDomain">Add a domain</Label>
            <div className="flex gap-2">
              <Input
                id="newDomain"
                placeholder="yourdomain.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
              <Button onClick={handleAdd} disabled={busyId === 'new' || !newDomain.trim()}>
                {busyId === 'new'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Plus className="w-4 h-4 mr-1.5" />Add</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Without http:// or www. Adding registers it with the host; you then
              point DNS at us and press Recheck.
            </p>
          </div>

          {expectedIp && (
            <div className="rounded-lg border border-border-subtle p-3 text-xs space-y-1">
              <p className="font-medium text-foreground">DNS for every domain</p>
              <p className="text-muted-foreground">
                Add A records for <strong>@</strong> and <strong>www</strong> pointing to:
              </p>
              <button
                onClick={copyIp}
                className="inline-flex items-center gap-1.5 font-mono text-foreground hover:text-primary"
              >
                {expectedIp}
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              <p className="text-muted-foreground">
                Remove any conflicting A or CNAME records. DNS can take up to an hour.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {loading ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading domains…</p>
              </div>
            ) : domains.length === 0 ? (
              <div className="border border-border-subtle rounded-lg p-8 text-center">
                <p className="text-sm font-medium text-foreground mb-1">No domains yet</p>
                <p className="text-xs text-muted-foreground">
                  Add one above to publish projects on your own domain.
                </p>
              </div>
            ) : (
              domains.map((d) => {
                const projects = usedBy(d);
                return (
                  <div key={d.id} className="border border-border-subtle rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">
                            {d.domain}
                          </span>
                          <StatusBadge domain={d} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {describeDomainState(d)}
                        </p>

                        {projects.length > 0 ? (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Used by {projects.length} project{projects.length > 1 ? 's' : ''}:{' '}
                            {projects.map(p => `/${p.path || ''}`).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Not assigned to a project yet
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="icon" className="w-8 h-8"
                          title="Recheck DNS and host registration"
                          disabled={busyId === d.id}
                          onClick={() => recheckDomain(d)}
                        >
                          {busyId === d.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="w-8 h-8 text-destructive"
                          title="Remove domain"
                          disabled={busyId === d.id}
                          onClick={() => setPendingRemove(d)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingRemove?.domain}?</AlertDialogTitle>
            <AlertDialogDescription>
              This unregisters the domain from the host and removes it from every
              project using it
              {pendingRemove && usedBy(pendingRemove).length > 0
                ? ` (${usedBy(pendingRemove).length} right now)`
                : ''}
              . Those pages stop being reachable on this domain. Your DNS records
              are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemove) removeDomain(pendingRemove);
                setPendingRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
