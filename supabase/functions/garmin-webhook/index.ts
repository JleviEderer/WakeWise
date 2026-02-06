// Supabase Edge Function to receive Garmin Health API webhooks
// Deploy with: supabase functions deploy garmin-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GarminSleepData {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  calendarDate: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds: number;
  durationInSeconds: number;
  unmeasurableSleepInSeconds?: number;
  deepSleepDurationInSeconds?: number;
  lightSleepDurationInSeconds?: number;
  remSleepInSeconds?: number;
  awakeDurationInSeconds?: number;
  sleepLevelsMap?: {
    deep?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
    light?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
    rem?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
    awake?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
  };
  validation?: string;
  timeOffsetSleepRespiration?: Record<string, number>;
  timeOffsetSleepSpo2?: Record<string, number>;
  overallSleepScore?: {
    value?: number;
    qualifierKey?: string;
  };
  sleepScores?: {
    totalDuration?: { value?: number; qualifierKey?: string };
    stress?: { value?: number; qualifierKey?: string };
    awakeCount?: { value?: number; qualifierKey?: string };
    overall?: { value?: number; qualifierKey?: string };
    remPercentage?: { value?: number; qualifierKey?: string };
    restlessness?: { value?: number; qualifierKey?: string };
    lightPercentage?: { value?: number; qualifierKey?: string };
    deepPercentage?: { value?: number; qualifierKey?: string };
  };
  avgOvernightHrv?: number;
  hrvStatus?: string;
  bodyBatteryChange?: number;
  restingHeartRateInBeatsPerMinute?: number;
  averageHeartRateInBeatsPerMinute?: number;
  lowestHeartRateInBeatsPerMinute?: number;
  highestHeartRateInBeatsPerMinute?: number;
}

interface GarminWebhookPayload {
  sleeps?: GarminSleepData[];
  // Other data types Garmin might send
  epochs?: any[];
  activities?: any[];
  activityDetails?: any[];
  manuallyUpdatedActivities?: any[];
  bodyComps?: any[];
  stressDetails?: any[];
  userMetrics?: any[];
  moveIQActivities?: any[];
  pulseOx?: any[];
  respirations?: any[];
  dailies?: any[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log request details for debugging
    console.log(`[Garmin Webhook] Received ${req.method} request`);
    console.log(`[Garmin Webhook] URL: ${req.url}`);

    // Parse the webhook payload
    const payload: GarminWebhookPayload = await req.json();
    console.log(`[Garmin Webhook] Payload keys: ${Object.keys(payload).join(", ")}`);

    // Process sleep data if present
    if (payload.sleeps && payload.sleeps.length > 0) {
      console.log(`[Garmin Webhook] Processing ${payload.sleeps.length} sleep records`);

      for (const sleep of payload.sleeps) {
        // Find or create user by Garmin user ID
        let { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("garmin_user_id", sleep.userId)
          .single();

        if (userError && userError.code === "PGRST116") {
          // User doesn't exist, create them
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              garmin_user_id: sleep.userId,
              garmin_access_token: sleep.userAccessToken,
            })
            .select("id")
            .single();

          if (createError) {
            console.error(`[Garmin Webhook] Error creating user: ${createError.message}`);
            continue;
          }
          user = newUser;
        } else if (userError) {
          console.error(`[Garmin Webhook] Error finding user: ${userError.message}`);
          continue;
        }

        // Calculate sleep start and end times
        const sleepStartTimestamp = sleep.startTimeInSeconds * 1000;
        const sleepEndTimestamp = (sleep.startTimeInSeconds + sleep.durationInSeconds) * 1000;

        // Upsert sleep session (update if exists, insert if not)
        const { data: session, error: sessionError } = await supabase
          .from("sleep_sessions")
          .upsert(
            {
              user_id: user.id,
              garmin_summary_id: sleep.summaryId,
              calendar_date: sleep.calendarDate,
              sleep_start: new Date(sleepStartTimestamp).toISOString(),
              sleep_end: new Date(sleepEndTimestamp).toISOString(),
              total_duration_seconds: sleep.durationInSeconds,
              deep_sleep_seconds: sleep.deepSleepDurationInSeconds || 0,
              light_sleep_seconds: sleep.lightSleepDurationInSeconds || 0,
              rem_sleep_seconds: sleep.remSleepInSeconds || 0,
              awake_seconds: sleep.awakeDurationInSeconds || 0,
              average_hr: sleep.averageHeartRateInBeatsPerMinute,
              lowest_hr: sleep.lowestHeartRateInBeatsPerMinute,
              raw_data: sleep,
            },
            {
              onConflict: "garmin_summary_id",
            }
          )
          .select("id")
          .single();

        if (sessionError) {
          console.error(`[Garmin Webhook] Error upserting sleep session: ${sessionError.message}`);
          continue;
        }

        console.log(`[Garmin Webhook] Saved sleep session ${session.id} for date ${sleep.calendarDate}`);

        // Process sleep stages if available
        if (sleep.sleepLevelsMap && session) {
          // Delete existing stages for this session (to handle updates)
          await supabase
            .from("sleep_stages")
            .delete()
            .eq("session_id", session.id);

          const stages: Array<{
            session_id: string;
            stage_type: string;
            start_time: string;
            end_time: string;
            duration_seconds: number;
          }> = [];

          // Process each sleep stage type
          for (const [stageType, intervals] of Object.entries(sleep.sleepLevelsMap)) {
            if (intervals && Array.isArray(intervals)) {
              for (const interval of intervals) {
                stages.push({
                  session_id: session.id,
                  stage_type: stageType,
                  start_time: new Date(interval.startTimeInSeconds * 1000).toISOString(),
                  end_time: new Date(interval.endTimeInSeconds * 1000).toISOString(),
                  duration_seconds: interval.endTimeInSeconds - interval.startTimeInSeconds,
                });
              }
            }
          }

          if (stages.length > 0) {
            const { error: stagesError } = await supabase
              .from("sleep_stages")
              .insert(stages);

            if (stagesError) {
              console.error(`[Garmin Webhook] Error inserting sleep stages: ${stagesError.message}`);
            } else {
              console.log(`[Garmin Webhook] Saved ${stages.length} sleep stages`);
            }
          }
        }
      }
    }

    // Return success response (Garmin expects 200 OK)
    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[Garmin Webhook] Error: ${error.message}`);

    // Still return 200 to prevent Garmin from retrying
    // Log the error for debugging
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
