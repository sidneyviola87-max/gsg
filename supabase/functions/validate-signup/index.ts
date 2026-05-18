import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","10minutemail.com","throwaway.email",
  "yopmail.com","trashmail.com","dispostable.com","fakeinbox.com","getairmail.com",
  "maildrop.cc","sharklasers.com","spam4.me","trashmail.at","trashmail.io",
  "trashmail.me","trashmail.net","trashmail.org","mailnull.com","spamgourmet.com",
  "tempr.email","discard.email","spambox.us","maildax.me","throwam.com",
  "burnermail.io","tempinbox.com","emailondeck.com","moakt.com","mailsac.com",
  "fakemailgenerator.com","emailfake.com","crazymailing.com","getnada.com",
]);

const MAX_ACCOUNTS_PER_DEVICE = 2;
const MAX_ACCOUNTS_PER_IP = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, device_fingerprint, device_id, ip_address, user_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Check disposable email
    const domain = email?.split("@")[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: "Disposable email addresses are not allowed. Please use a real email address.",
        code: "DISPOSABLE_EMAIL",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // 2. Check device fingerprint limit
    if (device_fingerprint) {
      const { data: fpRows } = await supabaseAdmin
        .from("device_registrations")
        .select("user_id")
        .eq("device_fingerprint", device_fingerprint);

      const uniqueUsers = new Set((fpRows || []).map((r: any) => r.user_id).filter((id: string) => id !== user_id));
      if (uniqueUsers.size >= MAX_ACCOUNTS_PER_DEVICE) {
        return new Response(JSON.stringify({
          allowed: false,
          reason: `This device already has ${uniqueUsers.size} accounts registered. Maximum ${MAX_ACCOUNTS_PER_DEVICE} accounts per device are allowed.`,
          code: "DEVICE_LIMIT_EXCEEDED",
          accounts_count: uniqueUsers.size,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    // 3. Check IP address limit
    if (ip_address && ip_address !== "unknown") {
      const { data: ipRows } = await supabaseAdmin
        .from("device_registrations")
        .select("user_id")
        .eq("ip_address", ip_address);

      const uniqueIpUsers = new Set((ipRows || []).map((r: any) => r.user_id).filter((id: string) => id !== user_id));
      if (uniqueIpUsers.size >= MAX_ACCOUNTS_PER_IP) {
        return new Response(JSON.stringify({
          allowed: false,
          reason: `Too many accounts registered from your network. Maximum ${MAX_ACCOUNTS_PER_IP} accounts per network are allowed. Contact support if you need help.`,
          code: "IP_LIMIT_EXCEEDED",
          ip_address,
          accounts_count: uniqueIpUsers.size,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    // 4. Register device if user_id provided
    if (user_id && device_fingerprint) {
      await supabaseAdmin.from("device_registrations").upsert({
        user_id,
        device_fingerprint,
        device_id,
        ip_address,
        last_seen: new Date().toISOString(),
      }, { onConflict: "user_id,device_fingerprint" });
    }

    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ allowed: true, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }
});
