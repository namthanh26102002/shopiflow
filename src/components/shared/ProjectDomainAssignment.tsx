// Per-project Domain tab. Domains are added and verified in DomainsManager;
// here you only choose which of them this project answers on, and at what path.
import React, { useState, useEffect, useMemo } from 'react';
import { Globe, Save, Link2Off, ExternalLink, AlertCircle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDomains, formatPath, STATUS_LABEL } from '@/hooks/useDomains';
import { DomainsManager } from '@/components/shared/DomainsManager';

interface ProjectDomainAssignmentProps {
  contentId: string;
  contentType: 'quiz' | 'advertorial';
  publishedUrl?: string;
  /** Kept in project settings so the builder can show the live address. */
  onDomainChange?: (domain: string) => void;
}

const NONE = '__none__';

export const ProjectDomainAssignment: React.FC<ProjectDomainAssignmentProps> = ({
  contentId, contentType, publishedUrl, onDomainChange,
}) => {
  const { domains, mappings, loading, assignToProject } = useDomains();
  const [domainId, setDomainId] = useState<string>(NONE);
  const [path, setPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  const mine = useMemo(
    () => mappings.find(m => m.content_id === contentId && m.content_type === contentType),
    [mappings, contentId, contentType],
  );

  useEffect(() => {
    setDomainId(mine?.domain_id ?? NONE);
    setPath(mine?.path ?? '');
  }, [mine]);

  const selected = domains.find(d => d.id === domainId);

  // UNIQUE (domain, path) is enforced in the database; surfacing it here means
  // the user sees the clash before pressing Save rather than after.
  const conflict = useMemo(() => {
    if (domainId === NONE) return null;
    return mappings.find(m =>
      m.domain_id === domainId &&
      (m.path ?? '') === path &&
      m.content_id !== contentId,
    ) ?? null;
  }, [mappings, domainId, path, contentId]);

  const dirty = (mine?.domain_id ?? NONE) !== domainId || (mine?.path ?? '') !== path;

  const handleSave = async () => {
    setSaving(true);
    const ok = await assignToProject(
      domainId === NONE ? null : domainId, path, contentType, contentId,
    );
    if (ok) onDomainChange?.(domainId === NONE ? '' : (selected?.domain ?? ''));
    setSaving(false);
  };

  const liveUrl = selected ? `https://${selected.domain}/${path}` : null;

  return (
    <>
      <div className="space-y-4 max-w-xl">
        {!publishedUrl && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-xs">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Publish this page first — a domain can only serve a published project.</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="domainSelect">Domain</Label>
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => setManagerOpen(true)}
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5" />
              Manage domains
            </Button>
          </div>

          <Select value={domainId} onValueChange={setDomainId} disabled={loading}>
            <SelectTrigger id="domainSelect">
              <SelectValue placeholder="Not connected" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not connected</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.domain}
                  {d.status !== 'active' && ` — ${STATUS_LABEL[d.status]}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {domains.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">
              No domains yet. Use <strong>Manage domains</strong> to add one.
            </p>
          )}

          {selected && selected.status !== 'active' && (
            <p className="text-xs text-amber-700">
              {selected.domain} is not serving yet — you can still assign it, and it
              will go live once verification completes.
            </p>
          )}
        </div>

        {domainId !== NONE && (
          <div className="space-y-2">
            <Label htmlFor="pathInput">Path</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="pathInput"
                placeholder="quiz"
                value={path}
                onChange={(e) => setPath(formatPath(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers and hyphens. Leave empty to serve at the
              domain root.
            </p>

            {conflict && (
              <p className="text-xs text-destructive">
                Another project already answers on this address. Pick a different
                path, or free it up in that project first.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || !dirty || !!conflict}>
            <Save className="w-4 h-4 mr-1.5" />
            {mine ? 'Update' : 'Connect'}
          </Button>

          {mine && (
            <Button
              variant="outline"
              onClick={async () => {
                setDomainId(NONE); setPath('');
                setSaving(true);
                await assignToProject(null, '', contentType, contentId);
                onDomainChange?.('');
                setSaving(false);
              }}
              disabled={saving}
            >
              <Link2Off className="w-4 h-4 mr-1.5" />
              Disconnect
            </Button>
          )}
        </div>

        {mine && liveUrl && (
          <a
            href={liveUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Globe className="w-3.5 h-3.5" />
            {liveUrl}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <DomainsManager open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
};
