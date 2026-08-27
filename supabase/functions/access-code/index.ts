import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CODE_RE = /^[A-Z0-9-]{4,32}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request" }, 400);
    }

    const action = (body as any).action;
    const rawCode = (body as any).code;
    if (typeof rawCode !== "string") {
      return json({ error: "Invalid request" }, 400);
    }
    const code = rawCode.toUpperCase().trim();
    if (!CODE_RE.test(code)) {
      return json({ error: "Invalid code format" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "validate") {
      const { data, error } = await admin.rpc("check_access_code", { _code: code });
      if (error) {
        console.error("check_access_code failed", error);
        return json({ error: "Unable to validate code" }, 500);
      }
      return json({ valid: data === true });
    }

    if (action === "claim") {
      // Claiming requires an authenticated caller; the code is always bound
      // to the caller's own user id (never a client-supplied id).
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return json({ error: "Unauthorized" }, 401);
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await admin.auth.getUser(token);
      if (userError || !userData?.user) {
        return json({ error: "Unauthorized" }, 401);
      }

      const { data, error } = await admin.rpc("validate_and_claim_access_code", {
        _code: code,
        _user_id: userData.user.id,
      });
      if (error) {
        console.error("validate_and_claim_access_code failed", error);
        return json({ error: "Unable to claim code" }, 500);
      }
      return json({ claimed: data === true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("access-code error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
