import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { device_fingerprint, ip_address } = await req.json();
    const clientIp = req.headers.get("x-forwarded-for") || ip_address || "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Count accounts on this device
    const { data: fpRows } = await supabaseAdmin
      .from("device_registrations")
      .select("user_id")
      .eq("device_fingerprint", device_fingerprint);

    const deviceAccounts = new Set((fpRows || []).map((r: any) => r.user_id)).size;

    // Count accounts on this IP
    const { data: ipRows } = await supabaseAdmin
      .from("device_registrations")
      .select("user_id")
      .eq("ip_address", clientIp);

    const ipAccounts = new Set((ipRows || []).map((r: any) => r.user_id)).size;

    const canCreate = deviceAccounts < 2 && ipAccounts < 2;

    return new Response(JSON.stringify({
      can_create_account: canCreate,
      device_accounts: deviceAccounts,
      ip_accounts: ipAccounts,
      ip_address: clientIp,
      max_per_device: 2,
      max_per_ip: 2,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ can_create_account: true, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }
});
