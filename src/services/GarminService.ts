import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { GARMIN_CONFIG } from '../constants/config';
import { SleepSession, SleepStage, GarminTokens } from '../models/types';
import { storageService } from './StorageService';

// Garmin uses OAuth 1.0a, which requires signing requests
// This is a simplified implementation - production should use a proper OAuth library

class GarminService {
  private tokens: GarminTokens | null = null;

  async initialize(): Promise<boolean> {
    this.tokens = await storageService.getGarminTokens();
    return this.tokens !== null;
  }

  isConnected(): boolean {
    return this.tokens !== null;
  }

  // Generate OAuth 1.0a signature base string
  private generateNonce(): string {
    return Crypto.randomUUID().replace(/-/g, '');
  }

  private getTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  // Encode for OAuth
  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/\*/g, '%2A')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
  }

  // Build OAuth signature (simplified - use proper library in production)
  private buildAuthHeader(
    method: string,
    url: string,
    params: Record<string, string>,
    tokenSecret: string = ''
  ): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: GARMIN_CONFIG.CONSUMER_KEY,
      oauth_nonce: this.generateNonce(),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: this.getTimestamp(),
      oauth_version: '1.0',
      ...params,
    };

    // Sort and encode params
    const sortedParams = Object.keys(oauthParams)
      .sort()
      .map((k) => `${this.percentEncode(k)}=${this.percentEncode(oauthParams[k])}`)
      .join('&');

    // Build signature base string
    const signatureBase = [
      method.toUpperCase(),
      this.percentEncode(url.split('?')[0]),
      this.percentEncode(sortedParams),
    ].join('&');

    // Sign (this is a placeholder - proper HMAC-SHA1 needed)
    // In production, use a crypto library for proper signing
    const signingKey = `${this.percentEncode(GARMIN_CONFIG.CONSUMER_SECRET)}&${this.percentEncode(tokenSecret)}`;

    // Note: React Native doesn't have native HMAC-SHA1
    // You'll need to use a library like react-native-hash or expo-crypto
    // For now, this is a placeholder
    const signature = 'PLACEHOLDER_SIGNATURE';

    oauthParams.oauth_signature = signature;

    // Build header
    const headerParams = Object.keys(oauthParams)
      .filter((k) => k.startsWith('oauth_'))
      .sort()
      .map((k) => `${this.percentEncode(k)}="${this.percentEncode(oauthParams[k])}"`)
      .join(', ');

    return `OAuth ${headerParams}`;
  }

  // Start OAuth flow
  async connect(): Promise<boolean> {
    try {
      // Step 1: Get request token
      const requestTokenResponse = await this.getRequestToken();
      if (!requestTokenResponse) {
        throw new Error('Failed to get request token');
      }

      // Step 2: Open browser for user authorization
      const redirectUrl = Linking.createURL('garmin-callback');
      const authUrl = `${GARMIN_CONFIG.AUTHORIZE_URL}?oauth_token=${requestTokenResponse.oauth_token}&oauth_callback=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type !== 'success') {
        throw new Error('User cancelled authorization');
      }

      // Step 3: Exchange for access token
      const urlParams = new URL(result.url).searchParams;
      const oauthToken = urlParams.get('oauth_token');
      const oauthVerifier = urlParams.get('oauth_verifier');

      if (!oauthToken || !oauthVerifier) {
        throw new Error('Missing OAuth parameters');
      }

      const accessTokens = await this.getAccessToken(
        oauthToken,
        requestTokenResponse.oauth_token_secret,
        oauthVerifier
      );

      if (!accessTokens) {
        throw new Error('Failed to get access token');
      }

      // Save tokens
      this.tokens = accessTokens;
      await storageService.saveGarminTokens(accessTokens);
      await storageService.saveUserSettings({ garminConnected: true });

      return true;
    } catch (error) {
      console.error('Garmin connect error:', error);
      return false;
    }
  }

  private async getRequestToken(): Promise<{
    oauth_token: string;
    oauth_token_secret: string;
  } | null> {
    try {
      const response = await fetch(GARMIN_CONFIG.REQUEST_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: this.buildAuthHeader('POST', GARMIN_CONFIG.REQUEST_TOKEN_URL, {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Request token failed: ${response.status}`);
      }

      const text = await response.text();
      const params = new URLSearchParams(text);

      return {
        oauth_token: params.get('oauth_token') || '',
        oauth_token_secret: params.get('oauth_token_secret') || '',
      };
    } catch (error) {
      console.error('Get request token error:', error);
      return null;
    }
  }

  private async getAccessToken(
    requestToken: string,
    requestTokenSecret: string,
    verifier: string
  ): Promise<GarminTokens | null> {
    try {
      const response = await fetch(GARMIN_CONFIG.ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: this.buildAuthHeader(
            'POST',
            GARMIN_CONFIG.ACCESS_TOKEN_URL,
            {
              oauth_token: requestToken,
              oauth_verifier: verifier,
            },
            requestTokenSecret
          ),
        },
      });

      if (!response.ok) {
        throw new Error(`Access token failed: ${response.status}`);
      }

      const text = await response.text();
      const params = new URLSearchParams(text);

      return {
        accessToken: params.get('oauth_token') || '',
        accessTokenSecret: params.get('oauth_token_secret') || '',
        userId: params.get('user_id') || '',
      };
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  }

  // Disconnect Garmin
  async disconnect(): Promise<void> {
    this.tokens = null;
    await storageService.clearGarminTokens();
    await storageService.saveUserSettings({ garminConnected: false });
  }

  // Fetch sleep data from Garmin
  async fetchSleepData(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    if (!this.tokens) {
      throw new Error('Not connected to Garmin');
    }

    try {
      const startStr = this.formatDate(startDate);
      const endStr = this.formatDate(endDate);

      const url = `${GARMIN_CONFIG.API_BASE_URL}/wellness-api/rest/sleeps?startDate=${startStr}&endDate=${endStr}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.buildAuthHeader(
            'GET',
            url,
            { oauth_token: this.tokens.accessToken },
            this.tokens.accessTokenSecret
          ),
        },
      });

      if (!response.ok) {
        throw new Error(`Fetch sleep data failed: ${response.status}`);
      }

      const data = await response.json();
      return this.parseSleepData(data);
    } catch (error) {
      console.error('Fetch sleep data error:', error);
      throw error;
    }
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

  // Sync last N days of sleep data
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
}

export const garminService = new GarminService();
