// Registers and removes custom domains with the host (Vercel), and refreshes a
// domain's serving status.
//
// Vercel only serves domains that have been added to the project, so DNS alone
// is not enough — a domain pointing at Vercel's IP without registration gets an
// error page. This function keeps public.domains in step with reality:
//   dns_ok   — the domain's A record resolves to PROXY_IP
//   host_ok  — Vercel has the domain on the project and reports it configured
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const vercelApi = async (path: string, init: RequestInit = {}) => {
  const token = Deno.env.get("VERCEL_TOKEN");
  const teamId = Deno.env.get("VERCEL_TEAM_ID");
  if (!token) throw new Error("VERCEL_TOKEN is not configured");

  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
};

/** Does the domain's A record point at our proxy? */
const checkDns = async (domain: string, proxyIp: string) => {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
    { headers: { Accept: "application/dns-json" } },
  );
  const data = await res.json();
  const aRecords: string[] = (data.Answer || [])
    .filter((r: { type: number }) => r.type === 1)
    .map((r: { data: string }) => r.data);
  return { pointsToUs: aRecords.includes(proxyIp), aRecords };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const action = body?.action;
    const rawDomain = body?.domain;

    if (typeof rawDomain !== "string") return json({ error: "Missing domain" }, 400);
    const domain = rawDomain.trim().toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/+$/, "");

    if (domain.length > 253 || !DOMAIN_RE.test(domain)) {
      return json({ error: "That does not look like a valid domain" }, 400);
    }

    // The caller must already own the domain row. Rows are created by the
    // client under RLS, so ownership is established before we ever call Vercel.
    const { data: owned } = await admin
      .from("domains")
      .select("id")
      .eq("domain", domain)
      .eq("user_id", userId)
      .maybeSingle();

    if (!owned) return json({ error: "Forbidden" }, 403);

    const projectId = Deno.env.get("VERCEL_PROJECT_ID");
    const proxyIp = Deno.env.get("PROXY_IP");

    if (action === "remove") {
      if (projectId) {
        // 404 is fine — it means the domain was never registered.
        await vercelApi(`/v9/projects/${projectId}/domains/${domain}`, { method: "DELETE" });
      }
      await admin.from("domains")
        .update({ host_ok: false, last_error: null, last_checked_at: new Date().toISOString() })
        .eq("id", owned.id);
      return json({ ok: true });
    }

    if (action !== "register" && action !== "refresh") {
      return json({ error: "Invalid action" }, 400);
    }

    if (!projectId) {
      const msg = "VERCEL_PROJECT_ID is not configured";
      await admin.from("domains").update({
        host_ok: false, last_error: msg, last_checked_at: new Date().toISOString(),
      }).eq("id", owned.id);
      return json({ error: msg }, 500);
    }

    let hostOk = false;
    let lastError: string | null = null;

    try {
      if (action === "register") {
        const add = await vercelApi(`/v10/projects/${projectId}/domains`, {
          method: "POST",
          body: JSON.stringify({ name: domain }),
        });
        // domain_already_in_use on this same project is not an error for us.
        if (!add.ok && add.body?.error?.code !== "domain_already_exists") {
          lastError = add.body?.error?.message ?? `Vercel rejected the domain (${add.status})`;
        }
      }

      if (!lastError) {
        const info = await vercelApi(`/v9/projects/${projectId}/domains/${domain}`);
        if (info.ok) {
          // `verified` false means Vercel is still waiting on DNS.
          hostOk = info.body?.verified === true;
          if (!hostOk) lastError = null; // pending, not an error
        } else if (info.status === 404) {
          lastError = "Domain is not registered with the host yet";
        } else {
          lastError = info.body?.error?.message ?? `Host check failed (${info.status})`;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Host request failed";
    }

    let dnsOk = false;
    let aRecords: string[] = [];
    if (proxyIp) {
      try {
        const dns = await checkDns(domain, proxyIp);
        dnsOk = dns.pointsToUs;
        aRecords = dns.aRecords;
      } catch {
        // Leave dnsOk false; the UI shows this as pending, not an error.
      }
    }

    await admin.from("domains").update({
      dns_ok: dnsOk,
      host_ok: hostOk,
      last_error: lastError,
      last_checked_at: new Date().toISOString(),
    }).eq("id", owned.id);

    return json({ dns_ok: dnsOk, host_ok: hostOk, last_error: lastError, aRecords, expectedIp: proxyIp ?? null });
  } catch (err) {
    console.error("domain-host error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
