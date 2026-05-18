import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, type, title, body, data } = await req.json();

    if (!user_id || !type || !title) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields: user_id, type, title" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: notification, error } = await supabaseAdmin
      .from("notifications")
      .insert({ user_id, type, title, body, data, is_read: false })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, notification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
