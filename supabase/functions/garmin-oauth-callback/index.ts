import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// OAuth callback Edge Function
// Receives OAuth callback from Garmin and stores the auth code in the database
// The app polls for this code (works in Expo Go where custom URL schemes don't work)

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state"); // session_id passed as state

  console.log("[OAuth Callback] code:", !!code, "error:", !!error, "state:", state);

  if (!state) {
    return new Response("Missing state parameter", { status: 400 });
  }

  // Store the result in Supabase
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error: dbError } = await supabase
    .from("oauth_pending")
    .upsert({
      session_id: state,
      code: code || null,
      error: error || null,
    });

  if (dbError) {
    console.error("[OAuth Callback] DB error:", dbError);
    return new Response("Database error", { status: 500 });
  }

  // Redirect to static HTML pages hosted on GitHub Pages
  // Supabase Edge Functions on *.supabase.co rewrite text/html to text/plain,
  // so we must redirect to externally-hosted HTML for proper rendering
  const isError = !!error;
  const baseUrl = "https://justingeeslin.github.io/wakewise-oauth";

  return new Response(null, {
    status: 302,
    headers: {
      "Location": isError ? `${baseUrl}/error.html` : `${baseUrl}/success.html`,
    },
  });
});
