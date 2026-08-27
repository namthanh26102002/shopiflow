import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Caddy sends the domain as a query parameter: ?domain=example.com
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain");

    if (!domain) {
      return new Response("Missing domain parameter", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("custom_domains")
      .select("id")
      .eq("domain", domain)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return new Response("Internal error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (data) {
      // Domain exists — allow Caddy to issue SSL
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Domain not in our database — deny SSL
    return new Response("Domain not found", {
      status: 404,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response("Internal error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
