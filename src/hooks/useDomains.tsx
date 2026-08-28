// Account-level domains, and the mappings that point a domain + path at a
// project. Domains are managed once here; projects only pick from them.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type DomainStatus = 'active' | 'pending' | 'error';

export interface Domain {
  id: string;
  domain: string;
  dns_ok: boolean;
  host_ok: boolean;
  status: DomainStatus;
  last_error: string | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface DomainMapping {
  id: string;
  domain_id: string | null;
  domain: string;
  path: string;
  content_type: 'quiz' | 'advertorial';
  content_id: string;
}

export const STATUS_LABEL: Record<DomainStatus, string> = {
  active: 'Connected',
  pending: 'Pending verification',
  error: 'Error',
};

/** Why a domain is not yet serving, in the user's terms. */
export const describeDomainState = (d: Domain): string => {
  if (d.status === 'active') return 'Serving traffic';
  if (d.last_error) return d.last_error;
  if (!d.dns_ok && !d.host_ok) return 'Waiting on DNS and host registration';
  if (!d.dns_ok) return 'Waiting on DNS - the A records are not pointing here yet';
  return 'Registered, waiting for the host to confirm DNS';
};

export const normalizeDomain = (raw: string): string =>
  raw.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '');

export const formatPath = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+/, '').slice(0, 60);

export const useDomains = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [mappings, setMappings] = useState<DomainMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setDomains([]); setMappings([]); setLoading(false); return; }
    try {
      const [d, m] = await Promise.all([
        supabase.from('domains').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('custom_domains')
          .select('id, domain_id, domain, path, content_type, content_id')
          .eq('user_id', user.id),
      ]);
      if (d.error) throw d.error;
      if (m.error) throw m.error;
      setDomains((d.data ?? []) as unknown as Domain[]);
      setMappings((m.data ?? []) as unknown as DomainMapping[]);
    } catch (err) {
      console.error('Error loading domains:', err);
      toast.error('Failed to load your domains');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /** Ask the host to register the domain, then refresh DNS + host state. */
  const syncWithHost = useCallback(async (
    domain: string,
    action: 'register' | 'refresh' | 'remove',
  ) => {
    const { data, error } = await supabase.functions.invoke('domain-host', {
      body: { action, domain },
    });
    if (error) throw new Error(error.message ?? 'Host request failed');
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const addDomain = useCallback(async (raw: string): Promise<boolean> => {
    if (!user) return false;
    const domain = normalizeDomain(raw);
    if (!domain) { toast.error('Please enter a domain'); return false; }

    setBusyId('new');
    try {
      const { data, error } = await supabase
        .from('domains')
        .insert({ user_id: user.id, domain })
        .select('id')
        .single();

      if (error) {
        // Unique is global, so this also covers another account claiming it.
        if (error.code === '23505') {
          toast.error('That domain is already connected to an account');
          return false;
        }
        throw error;
      }

      try {
        await syncWithHost(domain, 'register');
      } catch (hostErr) {
        // The row exists; registration can be retried from the list.
        const message = hostErr instanceof Error ? hostErr.message : 'Registration failed';
        await supabase.from('domains').update({ last_error: message }).eq('id', data.id);
        toast.error('Domain added, but host registration failed - use Recheck to retry');
        await load();
        return true;
      }

      toast.success('Domain added - point your DNS, then Recheck');
      await load();
      return true;
    } catch (err) {
      console.error('Error adding domain:', err);
      toast.error('Failed to add the domain');
      return false;
    } finally {
      setBusyId(null);
    }
  }, [user, syncWithHost, load]);

  const recheckDomain = useCallback(async (d: Domain) => {
    setBusyId(d.id);
    try {
      await syncWithHost(d.domain, 'register');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check failed');
      await load();
    } finally {
      setBusyId(null);
    }
  }, [syncWithHost, load]);

  const removeDomain = useCallback(async (d: Domain) => {
    setBusyId(d.id);
    try {
      try { await syncWithHost(d.domain, 'remove'); } catch { /* remove locally anyway */ }
      const { error } = await supabase.from('domains').delete().eq('id', d.id);
      if (error) throw error;
      toast.success('Domain removed');
      await load();
    } catch (err) {
      console.error('Error removing domain:', err);
      toast.error('Failed to remove the domain');
    } finally {
      setBusyId(null);
    }
  }, [syncWithHost, load]);

  /** Point a domain + path at a project, replacing that project's mapping. */
  const assignToProject = useCallback(async (
    domainId: string | null,
    path: string,
    contentType: 'quiz' | 'advertorial',
    contentId: string,
  ): Promise<boolean> => {
    if (!user) return false;
    const existing = mappings.find(
      m => m.content_id === contentId && m.content_type === contentType,
    );

    try {
      // No domain selected means "disconnect this project".
      if (!domainId) {
        if (existing) {
          const { error } = await supabase.from('custom_domains').delete().eq('id', existing.id);
          if (error) throw error;
          toast.success('Domain disconnected from this project');
          await load();
        }
        return true;
      }

      const domain = domains.find(d => d.id === domainId);
      if (!domain) return false;

      const row = {
        user_id: user.id,
        domain_id: domainId,
        domain: domain.domain,
        path,
        content_type: contentType,
        content_id: contentId,
      };

      const { error } = existing
        ? await supabase.from('custom_domains').update(row).eq('id', existing.id)
        : await supabase.from('custom_domains').insert(row);

      if (error) {
        // UNIQUE (domain, path) - another project already owns this address.
        if (error.code === '23505') {
          toast.error('That address is already used by another project');
          return false;
        }
        throw error;
      }

      toast.success('Domain assigned to this project');
      await load();
      return true;
    } catch (err) {
      console.error('Error assigning domain:', err);
      toast.error('Failed to assign the domain');
      return false;
    }
  }, [user, mappings, domains, load]);

  return {
    domains, mappings, loading, busyId,
    addDomain, recheckDomain, removeDomain, assignToProject, refresh: load,
  };
};
