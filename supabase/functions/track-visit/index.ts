import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Returns coarse visitor location (country + region only) based on the caller IP.
// The IP itself is never stored or returned.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const forwarded = req.headers.get('x-forwarded-for') || '';
    const ip = forwarded.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '';

    if (!ip) return json({ country: null, region: null });

    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region`);
    if (!res.ok) {
      const text = await res.text();
      console.error(`Geo lookup failed [${res.status}]: ${text}`);
      return json({ country: null, region: null });
    }

    const data = await res.json();
    if (!data?.success) {
      console.error('Geo lookup unsuccessful:', JSON.stringify(data));
      return json({ country: null, region: null });
    }

    return json({
      country: typeof data.country === 'string' ? data.country : null,
      region: typeof data.region === 'string' ? data.region : null,
    });
  } catch (err) {
    console.error('track-visit error:', err);
    return json({ country: null, region: null });
  }
});
