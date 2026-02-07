// Supabase client service for WakeWise
// Handles connection to Supabase and data fetching

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants/config';
import { SleepSession, SleepStage } from '../models/types';

// Database types
interface DbSleepSession {
  id: string;
  user_id: string;
  garmin_summary_id: string;
  calendar_date: string;
  sleep_start: string;
  sleep_end: string;
  total_duration_seconds: number;
  deep_sleep_seconds: number;
  light_sleep_seconds: number;
  rem_sleep_seconds: number;
  awake_seconds: number;
  average_hr: number | null;
  lowest_hr: number | null;
  raw_data: any;
  created_at: string;
}

interface DbSleepStage {
  id: string;
  session_id: string;
  stage_type: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}

interface DbUser {
  id: string;
  garmin_user_id: string;
  created_at: string;
}

class SupabaseService {
  private client: SupabaseClient;
  private userId: string | null = null;

  constructor() {
    this.client = createClient(
      SUPABASE_CONFIG.URL,
      SUPABASE_CONFIG.ANON_KEY
    );
  }

  // Set the current user's Garmin ID (after OAuth)
  async setGarminUserId(garminUserId: string): Promise<string | null> {
    try {
      // Find or create user by Garmin user ID
      let { data: user, error } = await this.client
        .from('users')
        .select('id')
        .eq('garmin_user_id', garminUserId)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create them
        const { data: newUser, error: createError } = await this.client
          .from('users')
          .insert({ garmin_user_id: garminUserId })
          .select('id')
          .single();

        if (createError) {
          console.error('[Supabase] Error creating user:', createError);
          return null;
        }
        user = newUser;
      } else if (error) {
        console.error('[Supabase] Error finding user:', error);
        return null;
      }

      this.userId = user?.id || null;
      return this.userId;
    } catch (error) {
      console.error('[Supabase] Error in setGarminUserId:', error);
      return null;
    }
  }

  // Get user ID
  getUserId(): string | null {
    return this.userId;
  }

  // Fetch sleep sessions from Supabase
  async fetchSleepSessions(
    startDate: Date,
    endDate: Date,
    garminUserId?: string
  ): Promise<SleepSession[]> {
    try {
      // Use provided garminUserId or the stored one
      const targetGarminId = garminUserId;

      if (!targetGarminId) {
        console.log('[Supabase] No Garmin user ID available');
        return [];
      }

      // First get the user's internal ID
      const { data: user, error: userError } = await this.client
        .from('users')
        .select('id')
        .eq('garmin_user_id', targetGarminId)
        .single();

      if (userError || !user) {
        console.log('[Supabase] User not found for Garmin ID:', targetGarminId);
        return [];
      }

      // Fetch sleep sessions
      const startStr = this.formatDate(startDate);
      const endStr = this.formatDate(endDate);

      const { data: sessions, error: sessionsError } = await this.client
        .from('sleep_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('calendar_date', startStr)
        .lte('calendar_date', endStr)
        .order('calendar_date', { ascending: false });

      if (sessionsError) {
        console.error('[Supabase] Error fetching sessions:', sessionsError);
        return [];
      }

      if (!sessions || sessions.length === 0) {
        console.log('[Supabase] No sleep sessions found');
        return [];
      }

      // Fetch stages for all sessions
      const sessionIds = sessions.map((s: DbSleepSession) => s.id);
      const { data: stages, error: stagesError } = await this.client
        .from('sleep_stages')
        .select('*')
        .in('session_id', sessionIds);

      if (stagesError) {
        console.error('[Supabase] Error fetching stages:', stagesError);
      }

      // Map to app format
      return sessions.map((session: DbSleepSession) =>
        this.mapDbSessionToAppSession(session, stages || [])
      );
    } catch (error) {
      console.error('[Supabase] Error in fetchSleepSessions:', error);
      return [];
    }
  }

  // Map database session to app SleepSession format
  private mapDbSessionToAppSession(
    dbSession: DbSleepSession,
    allStages: DbSleepStage[]
  ): SleepSession {
    // Filter stages for this session
    const sessionStages = allStages
      .filter(s => s.session_id === dbSession.id)
      .map(this.mapDbStageToAppStage);

    return {
      id: dbSession.garmin_summary_id || dbSession.id,
      date: dbSession.calendar_date,
      sleepStart: new Date(dbSession.sleep_start),
      sleepEnd: new Date(dbSession.sleep_end),
      totalDurationMinutes: Math.round(dbSession.total_duration_seconds / 60),
      stages: sessionStages,
      deepSleepMinutes: Math.round(dbSession.deep_sleep_seconds / 60),
      lightSleepMinutes: Math.round(dbSession.light_sleep_seconds / 60),
      remSleepMinutes: Math.round(dbSession.rem_sleep_seconds / 60),
      awakeMinutes: Math.round(dbSession.awake_seconds / 60),
      averageHeartRate: dbSession.average_hr || undefined,
      lowestHeartRate: dbSession.lowest_hr || undefined,
    };
  }

  // Map database stage to app SleepStage format
  private mapDbStageToAppStage(dbStage: DbSleepStage): SleepStage {
    return {
      type: dbStage.stage_type as SleepStage['type'],
      startTime: new Date(dbStage.start_time),
      endTime: new Date(dbStage.end_time),
      durationMinutes: Math.round(dbStage.duration_seconds / 60),
    };
  }

  // Format date as YYYY-MM-DD
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Check if we have any data for a user
  async hasDataForUser(garminUserId: string): Promise<boolean> {
    try {
      const { data: user } = await this.client
        .from('users')
        .select('id')
        .eq('garmin_user_id', garminUserId)
        .single();

      if (!user) return false;

      const { count } = await this.client
        .from('sleep_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return (count || 0) > 0;
    } catch (error) {
      console.error('[Supabase] Error checking data:', error);
      return false;
    }
  }

  // Expose the Supabase client for direct queries (e.g., OAuth polling)
  getClient(): SupabaseClient {
    return this.client;
  }

  // Get the most recent sleep session
  async getLatestSleepSession(garminUserId: string): Promise<SleepSession | null> {
    try {
      const { data: user } = await this.client
        .from('users')
        .select('id')
        .eq('garmin_user_id', garminUserId)
        .single();

      if (!user) return null;

      const { data: session, error } = await this.client
        .from('sleep_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('calendar_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !session) return null;

      // Get stages for this session
      const { data: stages } = await this.client
        .from('sleep_stages')
        .select('*')
        .eq('session_id', session.id);

      return this.mapDbSessionToAppSession(session, stages || []);
    } catch (error) {
      console.error('[Supabase] Error getting latest session:', error);
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();
