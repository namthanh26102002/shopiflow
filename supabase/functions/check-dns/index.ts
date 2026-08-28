import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);
    const domain = body && typeof body === "object" ? (body as any).domain : null;
    const action = body && typeof body === "object" ? (body as any).action : null;

    const proxyIpEarly = Deno.env.get("PROXY_IP");
    if (action === "proxy-ip") {
      return new Response(
        JSON.stringify({ expectedIp: proxyIpEarly ?? null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!domain || typeof domain !== "string" || domain.length > 253 ||
        !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(domain)) {
      return new Response(
        JSON.stringify({ error: "Missing domain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Caller must own the domain mapping being verified
    const { data: owned } = await supabase
      .from("custom_domains")
      .select("id")
      .eq("domain", domain)
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    if (!owned) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const proxyIp = Deno.env.get("PROXY_IP");
    if (!proxyIp) {
      return new Response(
        JSON.stringify({ error: "Proxy IP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve DNS using Cloudflare's DNS-over-HTTPS
    const dnsRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { Accept: "application/dns-json" } }
    );

    const dnsData = await dnsRes.json();
    const aRecords: string[] = (dnsData.Answer || [])
      .filter((r: any) => r.type === 1)
      .map((r: any) => r.data);

    const pointsToProxy = aRecords.includes(proxyIp);

    // Verification state lives on public.domains now, and is written by the
    // domain-host function, which also knows whether the host has the domain
    // registered. This endpoint only reports what DNS currently says.
    if (pointsToProxy) {
      await supabase
        .from("domains")
        .update({ dns_ok: true, last_checked_at: new Date().toISOString() })
        .eq("domain", domain)
        .eq("user_id", userData.user.id);
    }

    return new Response(
      JSON.stringify({
        verified: pointsToProxy,
        resolvedIps: aRecords,
        expectedIp: proxyIp,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("DNS check error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to check DNS" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
