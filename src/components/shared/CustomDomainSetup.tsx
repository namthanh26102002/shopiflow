import React, { useState, useEffect } from 'react';
import { Globe, Copy, Check, AlertCircle, Save, Trash2, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CustomDomainSetupProps {
  customDomain: string;
  onDomainChange: (domain: string) => void;
  publishedUrl?: string;
  contentId: string;
  contentType: 'quiz' | 'advertorial';
}

const formatSlug = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .slice(0, 60);
};

const isValidSlug = (slug: string): boolean => {
  if (slug.length === 0) return true;
  if (slug.length > 60) return false;
  if (/^-|-$/.test(slug)) return false;
  return /^[a-z0-9-]+$/.test(slug);
};

export const CustomDomainSetup: React.FC<CustomDomainSetupProps> = ({
  customDomain,
  onDomainChange,
  publishedUrl,
  contentId,
  contentType,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [existingMappingId, setExistingMappingId] = useState<string | null>(null);
  const [checkingDns, setCheckingDns] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{ verified: boolean; resolvedIps: string[]; expectedIp: string } | null>(null);
  const [proxyIp, setProxyIp] = useState<string | null>(null);

  // Load existing mapping
  useEffect(() => {
    if (!user || !contentId) return;

    const load = async () => {
      const { data } = await (supabase as any)
        .from('custom_domains')
        .select('id, domain, path')
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        onDomainChange(data.domain);
        setSlug(data.path || '');
        setExistingMappingId(data.id);
      }
    };

    load();
  }, [user, contentId, contentType]);

  // Fetch proxy IP on mount
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-dns', {
          body: { action: 'proxy-ip' },
        });
        // The function returns expectedIp even on probe
        if (data?.expectedIp) {
          setProxyIp(data.expectedIp);
        }
      } catch {
        // fallback — will show placeholder
      }
    };
    fetchIp();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSlugChange = (value: string) => {
    setSlug(formatSlug(value));
  };

  const handleSave = async () => {
    if (!user || !customDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    if (slug && !isValidSlug(slug)) {
      toast.error('Invalid path format');
      return;
    }

    setSaving(true);
    try {
      const domainClean = customDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '');

      if (existingMappingId) {
        const { error } = await (supabase as any)
          .from('custom_domains')
          .update({ domain: domainClean, path: slug })
          .eq('id', existingMappingId);

        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('custom_domains')
          .insert({
            user_id: user.id,
            domain: domainClean,
            path: slug,
            content_type: contentType,
            content_id: contentId,
          })
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505') {
            toast.error('This domain + path is already in use');
            setSaving(false);
            return;
          }
          throw error;
        }
        setExistingMappingId(data.id);
      }

      onDomainChange(domainClean);
      toast.success('Domain mapping saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save domain mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingMappingId) return;

    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('custom_domains')
        .delete()
        .eq('id', existingMappingId);

      if (error) throw error;

      setExistingMappingId(null);
      onDomainChange('');
      setSlug('');
      setDnsStatus(null);
      toast.success('Domain mapping removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove domain mapping');
    } finally {
      setDeleting(false);
    }
  };

  const handleCheckDns = async () => {
    if (!customDomain.trim()) return;

    setCheckingDns(true);
    setDnsStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke('check-dns', {
        body: { domain: customDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '') },
      });

      if (error) throw error;
      setDnsStatus(data);

      if (data.verified) {
        toast.success('DNS is correctly configured!');
      } else {
        toast.error('DNS is not pointing to the correct IP yet');
      }
    } catch (err: any) {
      toast.error('Failed to check DNS');
    } finally {
      setCheckingDns(false);
    }
  };

  const hasDomain = customDomain.trim().length > 0;
  const previewUrl = hasDomain
    ? `${customDomain.trim()}${slug ? '/' + slug : ''}`
    : '';
  const displayIp = proxyIp || '...';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Custom Domain</Label>
        <Input
          value={customDomain}
          onChange={(e) => onDomainChange(e.target.value)}
          placeholder="yourdomain.com"
          className="h-9 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Enter your domain without http:// or www
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Path / Slug</Label>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">/</span>
          <Input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="quiz"
            className="h-9 text-sm"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Lowercase letters, numbers, hyphens only. Leave empty for root.
        </p>
      </div>

      {previewUrl && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs font-mono text-foreground">
          {previewUrl}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasDomain || !publishedUrl}
          className="flex-1"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          {existingMappingId ? 'Update Mapping' : 'Save Mapping'}
        </Button>
        {existingMappingId && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>

      {!publishedUrl && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Publish your page first before saving a domain mapping.</span>
        </div>
      )}

      {hasDomain && existingMappingId && (
        <div className="space-y-3">
          {/* DNS Check Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckDns}
            disabled={checkingDns}
            className="w-full"
          >
            {checkingDns ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            Check DNS Status
          </Button>

          {/* DNS Status Result */}
          {dnsStatus && (
            <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
              dnsStatus.verified
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {dnsStatus.verified ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <div>
                {dnsStatus.verified ? (
                  <span className="font-medium">DNS verified! Your domain is correctly configured.</span>
                ) : (
                  <div>
                    <span className="font-medium">DNS not configured yet.</span>
                    <p className="mt-0.5 text-[10px] opacity-80">
                      Resolved IPs: {dnsStatus.resolvedIps.length > 0 ? dnsStatus.resolvedIps.join(', ') : 'none'} — Expected: {dnsStatus.expectedIp}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DNS Instructions */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">DNS Configuration</span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Add these DNS records at your domain registrar:
            </p>

            {/* A Record for root */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">A Record (Root Domain)</p>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <div className="bg-background rounded px-2 py-1.5 border border-border">
                  <span className="text-muted-foreground">Type:</span> <span className="font-mono font-medium">A</span>
                </div>
                <div className="bg-background rounded px-2 py-1.5 border border-border">
                  <span className="text-muted-foreground">Name:</span> <span className="font-mono font-medium">@</span>
                </div>
                <div className="bg-background rounded px-2 py-1.5 border border-border flex items-center justify-between">
                  <span><span className="text-muted-foreground">Value:</span> <span className="font-mono font-medium">{displayIp}</span></span>
                  {proxyIp && (
                    <button
                      onClick={() => copyToClipboard(proxyIp, 'IP')}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      {copied === 'IP' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* A Record for www */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">A Record (www subdomain)</p>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <div className="bg-background rounded px-2 py-1.5 border border-border">
                  <span className="text-muted-foreground">Type:</span> <span className="font-mono font-medium">A</span>
                </div>
                <div className="bg-background rounded px-2 py-1.5 border border-border">
                  <span className="text-muted-foreground">Name:</span> <span className="font-mono font-medium">www</span>
                </div>
                <div className="bg-background rounded px-2 py-1.5 border border-border flex items-center justify-between">
                  <span><span className="text-muted-foreground">Value:</span> <span className="font-mono font-medium">{displayIp}</span></span>
                  {proxyIp && (
                    <button
                      onClick={() => copyToClipboard(proxyIp, 'IP-www')}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      {copied === 'IP-www' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 bg-primary/5 rounded-md p-2">
              <AlertCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="text-[10px] text-muted-foreground leading-relaxed space-y-1">
                <p>1. Go to your domain registrar's <strong>DNS settings</strong></p>
                <p>2. Add the A records above for both <strong>@</strong> and <strong>www</strong></p>
                <p>3. Remove any conflicting A or CNAME records</p>
                <p>4. DNS propagation can take up to 72 hours</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
