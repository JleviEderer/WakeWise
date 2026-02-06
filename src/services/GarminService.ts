import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { GARMIN_CONFIG } from '../constants/config';
import { SleepSession, SleepStage, GarminTokens } from '../models/types';
import { storageService } from './StorageService';
import { supabaseService } from './SupabaseService';

// Garmin OAuth 2.0 with PKCE (Proof Key for Code Exchange)

class GarminService {
  private tokens: GarminTokens | null = null;
  private codeVerifier: string | null = null;

  async initialize(): Promise<boolean> {
    this.tokens = await storageService.getGarminTokens();
    return this.tokens !== null;
  }

  isConnected(): boolean {
    return this.tokens !== null;
  }

  // Generate PKCE code verifier (random 43-128 character string)
  private generateCodeVerifier(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomBytes = Crypto.getRandomBytes(64);
    return Array.from(randomBytes)
      .map(b => chars[b % chars.length])
      .join('')
      .substring(0, 64);
  }

  // Generate code challenge from verifier using SHA256
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    // Convert to base64url (no padding, URL-safe characters)
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Start OAuth 2.0 PKCE flow with database polling (works in Expo Go)
  async connect(): Promise<boolean> {
    console.log('[Garmin OAuth] === Starting OAuth 2.0 PKCE Flow ===');
    try {
      // Step 1: Generate PKCE code verifier and challenge
      console.log('[Garmin OAuth] Step 1: Generating PKCE codes...');
      this.codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
      console.log('[Garmin OAuth] Code verifier length:', this.codeVerifier.length);
      console.log('[Garmin OAuth] Code challenge:', codeChallenge.substring(0, 20) + '...');

      // Step 2: Generate unique session ID for polling
      const sessionId = Crypto.randomUUID();
      console.log('[Garmin OAuth] Session ID:', sessionId);

      // Step 3: Build authorization URL
      const redirectUri = GARMIN_CONFIG.OAUTH_CALLBACK_URL;
      console.log('[Garmin OAuth] Redirect URI (Supabase):', redirectUri);
      console.log('[Garmin OAuth] Client ID:', GARMIN_CONFIG.CLIENT_ID ? GARMIN_CONFIG.CLIENT_ID.substring(0, 8) + '...' : 'NOT SET');

      const authParams = new URLSearchParams({
        client_id: GARMIN_CONFIG.CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: GARMIN_CONFIG.SCOPES,
        state: sessionId, // Pass session ID as state for polling
      });

      const authUrl = `${GARMIN_CONFIG.AUTHORIZATION_URL}?${authParams.toString()}`;
      console.log('[Garmin OAuth] Step 2: Opening browser for authorization...');
      console.log('[Garmin OAuth] Auth URL:', authUrl);

      // Step 4: Open browser for user authorization
      const result = await WebBrowser.openAuthSessionAsync(authUrl);
      console.log('[Garmin OAuth] Browser result type:', result.type);

      // User dismissed/closed browser - poll for auth code from database
      if (result.type === 'dismiss' || result.type === 'cancel') {
        console.log('[Garmin OAuth] Browser dismissed, polling for auth code...');
        const authCode = await this.pollForAuthCode(sessionId);

        if (!authCode) {
          throw new Error('Authorization not completed - please try again');
        }

        console.log('[Garmin OAuth] Got auth code from polling:', authCode.substring(0, 10) + '...');

        // Exchange code for tokens
        const tokens = await this.exchangeCodeForTokens(authCode, redirectUri);
        if (!tokens) {
          throw new Error('Failed to exchange code for tokens');
        }

        this.tokens = tokens;

        // Fetch the Garmin User ID (required for matching webhook data)
        const userId = await this.fetchUserId();
        if (userId) {
          this.tokens.userId = userId;
          console.log('[Garmin OAuth] User ID:', userId);

          // Create user record in Supabase (required for webhook data matching)
          const supabaseUserId = await supabaseService.setGarminUserId(userId);
          if (supabaseUserId) {
            console.log('[Garmin OAuth] Supabase user created/found:', supabaseUserId);
          } else {
            console.warn('[Garmin OAuth] Could not create Supabase user record');
          }

          // Request historical data backfill
          await this.requestBackfill(30);
        } else {
          console.warn('[Garmin OAuth] Could not fetch user ID - webhook matching may not work');
        }

        await storageService.saveGarminTokens(this.tokens);
        await storageService.saveUserSettings({ garminConnected: true });

        console.log('[Garmin OAuth] === OAuth Flow Complete ===');
        console.log('[Garmin OAuth] Token expires at:', new Date(tokens.expiresAt).toISOString());
        return true;
      }

      // If somehow we got a success result (native build), handle it
      if (result.type === 'success' && result.url) {
        const callbackUrl = new URL(result.url);
        const authorizationCode = callbackUrl.searchParams.get('code');
        const error = callbackUrl.searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (authorizationCode) {
          const tokens = await this.exchangeCodeForTokens(authorizationCode, redirectUri);
          if (!tokens) {
            throw new Error('Failed to exchange code for tokens');
          }

          this.tokens = tokens;

          // Fetch the Garmin User ID (required for matching webhook data)
          const userId = await this.fetchUserId();
          if (userId) {
            this.tokens.userId = userId;
            console.log('[Garmin OAuth] User ID:', userId);

            // Create user record in Supabase (required for webhook data matching)
            const supabaseUserId = await supabaseService.setGarminUserId(userId);
            if (supabaseUserId) {
              console.log('[Garmin OAuth] Supabase user created/found:', supabaseUserId);
            } else {
              console.warn('[Garmin OAuth] Could not create Supabase user record');
            }

            // Request historical data backfill
            await this.requestBackfill(30);
          } else {
            console.warn('[Garmin OAuth] Could not fetch user ID - webhook matching may not work');
          }

          await storageService.saveGarminTokens(this.tokens);
          await storageService.saveUserSettings({ garminConnected: true });
          return true;
        }
      }

      throw new Error('Authorization failed');
    } catch (error) {
      console.error('[Garmin OAuth] Connect error:', error);
      this.codeVerifier = null;
      return false;
    }
  }

  // Poll Supabase for the auth code (stored by Edge Function)
  private async pollForAuthCode(sessionId: string, maxAttempts = 30): Promise<string | null> {
    const supabase = supabaseService.getClient();

    for (let i = 0; i < maxAttempts; i++) {
      console.log('[Garmin OAuth] Poll attempt', i + 1, '/', maxAttempts);

      const { data, error } = await supabase
        .from('oauth_pending')
        .select('code, error')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        // Not found yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (data?.error) {
        // Clean up the pending entry
        await supabase.from('oauth_pending').delete().eq('session_id', sessionId);
        throw new Error(`OAuth error: ${data.error}`);
      }

      if (data?.code) {
        console.log('[Garmin OAuth] Got auth code from polling');
        // Clean up the pending entry
        await supabase.from('oauth_pending').delete().eq('session_id', sessionId);
        return data.code;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('[Garmin OAuth] Polling timed out after', maxAttempts, 'attempts');
    return null;
  }

  // Exchange authorization code for access and refresh tokens
  private async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<GarminTokens | null> {
    if (!this.codeVerifier) {
      console.error('[Garmin OAuth] No code verifier available');
      return null;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: GARMIN_CONFIG.CLIENT_ID,
        client_secret: GARMIN_CONFIG.CLIENT_SECRET,
        code: code,
        code_verifier: this.codeVerifier,
        redirect_uri: redirectUri,
      });

      console.log('[Garmin OAuth] Token request URL:', GARMIN_CONFIG.TOKEN_URL);

      const response = await fetch(GARMIN_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      console.log('[Garmin OAuth] Token response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Garmin OAuth] Token exchange error:', errorText);
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Garmin OAuth] Token response received');
      console.log('[Garmin OAuth] Token type:', data.token_type);
      console.log('[Garmin OAuth] Expires in:', data.expires_in, 'seconds');

      // Clear the code verifier after successful exchange
      this.codeVerifier = null;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        userId: data.user_id || undefined,
      };
    } catch (error) {
      console.error('[Garmin OAuth] Exchange tokens error:', error);
      return null;
    }
  }

  // Refresh access token using refresh token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokens?.refreshToken) {
      console.error('[Garmin OAuth] No refresh token available');
      return false;
    }

    console.log('[Garmin OAuth] Refreshing access token...');

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: GARMIN_CONFIG.CLIENT_ID,
        client_secret: GARMIN_CONFIG.CLIENT_SECRET,
        refresh_token: this.tokens.refreshToken,
      });

      const response = await fetch(GARMIN_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Garmin OAuth] Token refresh error:', errorText);
        // If refresh fails, user needs to re-authenticate
        await this.disconnect();
        return false;
      }

      const data = await response.json();

      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
        userId: this.tokens.userId,
      };

      await storageService.saveGarminTokens(this.tokens);
      console.log('[Garmin OAuth] Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('[Garmin OAuth] Refresh token error:', error);
      return false;
    }
  }

  // Check if token needs refresh (with 5 minute buffer)
  private isTokenExpired(): boolean {
    if (!this.tokens?.expiresAt) return true;
    return Date.now() >= this.tokens.expiresAt - (5 * 60 * 1000);
  }

  // Ensure valid token before API calls
  private async ensureValidToken(): Promise<boolean> {
    if (!this.tokens) return false;

    if (this.isTokenExpired()) {
      return await this.refreshAccessToken();
    }
    return true;
  }

  // Make authenticated API request with Bearer token
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    if (!await this.ensureValidToken()) {
      throw new Error('Unable to authenticate - please reconnect to Garmin');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.tokens!.accessToken}`,
    };

    return fetch(url, { ...options, headers });
  }

  // Request historical sleep data backfill from Garmin
  // Garmin will push the data to our webhook asynchronously
  async requestBackfill(days: number = 30): Promise<boolean> {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (days * 24 * 60 * 60);

      const url = `${GARMIN_CONFIG.API_BASE_URL}/wellness-api/rest/backfill/sleeps`;
      console.log('[Garmin API] Requesting backfill for', days, 'days...');

      const response = await this.fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryStartTimeInSeconds: startTime,
          summaryEndTimeInSeconds: endTime,
        }),
      });

      console.log('[Garmin API] Backfill response status:', response.status);

      if (response.status === 202) {
        console.log('[Garmin API] Backfill request accepted - data will arrive via webhook');
        return true;
      }

      const errorText = await response.text();
      console.error('[Garmin API] Backfill error:', response.status, errorText);
      return false;
    } catch (error) {
      console.error('[Garmin API] Backfill request failed:', error);
      return false;
    }
  }

  // Fetch the Garmin Health API User ID (required for matching webhook data)
  private async fetchUserId(): Promise<string | null> {
    try {
      const url = `${GARMIN_CONFIG.API_BASE_URL}/wellness-api/rest/user/id`;
      console.log('[Garmin OAuth] Fetching user ID from:', url);

      const response = await this.fetchWithAuth(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Garmin OAuth] User ID fetch error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('[Garmin OAuth] User ID response:', data);

      return data.userId || null;
    } catch (error) {
      console.error('[Garmin OAuth] Error fetching user ID:', error);
      return null;
    }
  }

  // Disconnect Garmin
  async disconnect(): Promise<void> {
    this.tokens = null;
    this.codeVerifier = null;
    await storageService.clearGarminTokens();
    await storageService.saveUserSettings({ garminConnected: false });
  }

  // Fetch sleep data from Supabase (Garmin pushes data via webhooks)
  async fetchSleepData(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    if (!this.tokens) {
      throw new Error('Not connected to Garmin');
    }

    try {
      // Get sleep data from Supabase (populated by Garmin webhooks)
      const sessions = await supabaseService.fetchSleepSessions(
        startDate,
        endDate,
        this.tokens.userId
      );

      console.log(`[Garmin] Fetched ${sessions.length} sleep sessions from Supabase`);
      return sessions;
    } catch (error) {
      console.error('Fetch sleep data error:', error);
      throw error;
    }
  }

  // Check if we have any sleep data available
  async hasData(): Promise<boolean> {
    if (!this.tokens?.userId) return false;
    return await supabaseService.hasDataForUser(this.tokens.userId);
  }

  // Get the most recent sleep session
  async getLatestSleepSession(): Promise<SleepSession | null> {
    if (!this.tokens?.userId) return null;
    return await supabaseService.getLatestSleepSession(this.tokens.userId);
  }

  // Parse Garmin sleep data into our format
  private parseSleepData(garminData: any[]): SleepSession[] {
    return garminData.map((item) => {
      const stages = this.parseSleepStages(item.sleepLevels || []);

      return {
        id: item.summaryId?.toString() || `${item.calendarDate}_${Date.now()}`,
        date: item.calendarDate,
        sleepStart: new Date(item.sleepStartTimestampGMT),
        sleepEnd: new Date(item.sleepEndTimestampGMT),
        totalDurationMinutes: Math.round(item.sleepTimeSeconds / 60),
        stages,
        deepSleepMinutes: Math.round((item.deepSleepSeconds || 0) / 60),
        lightSleepMinutes: Math.round((item.lightSleepSeconds || 0) / 60),
        remSleepMinutes: Math.round((item.remSleepSeconds || 0) / 60),
        awakeMinutes: Math.round((item.awakeSleepSeconds || 0) / 60),
        averageHeartRate: item.averageHR,
        lowestHeartRate: item.lowestHR,
      };
    });
  }

  private parseSleepStages(levels: any[]): SleepStage[] {
    return levels.map((level) => {
      let stageType: SleepStage['type'];
      switch (level.activityLevel) {
        case 0:
          stageType = 'deep';
          break;
        case 1:
          stageType = 'light';
          break;
        case 2:
          stageType = 'rem';
          break;
        default:
          stageType = 'awake';
      }

      return {
        type: stageType,
        startTime: new Date(level.startGMT),
        endTime: new Date(level.endGMT),
        durationMinutes: Math.round(
          (new Date(level.endGMT).getTime() - new Date(level.startGMT).getTime()) / 60000
        ),
      };
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Sync last N days of sleep data from Supabase (webhook data)
  async syncRecentSleepData(days: number = 30): Promise<SleepSession[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.fetchSleepData(startDate, endDate);

    // Save to local storage
    for (const session of sessions) {
      await storageService.addSleepSession(session);
    }

    return sessions;
  }

  // Sync sleep data from Supabase (populated by Garmin webhooks)
  // Note: Garmin Health API is push-based. Historical data requires manual backfill
  // via Garmin developer web tools or waiting for new data to sync via webhooks.
  async fetchHistoricalSleepData(days: number = 30): Promise<SleepSession[]> {
    if (!this.tokens) {
      throw new Error('Not connected to Garmin');
    }

    console.log(`[Garmin API] Syncing ${days} days of sleep data from database...`);
    console.log(`[Garmin API] User ID: ${this.tokens.userId || 'not set'}`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const sessions = await this.fetchSleepData(startDate, endDate);
      console.log(`[Garmin API] Found ${sessions.length} sessions in database`);

      // Save to local storage for offline access
      for (const session of sessions) {
        await storageService.addSleepSession(session);
      }

      if (sessions.length > 0) {
        console.log('[Garmin API] Saved sessions to local storage');
      }

      return sessions;
    } catch (error) {
      console.error('[Garmin API] fetchHistoricalSleepData error:', error);
      return [];
    }
  }
}

export const garminService = new GarminService();
