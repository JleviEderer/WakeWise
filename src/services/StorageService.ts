import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SleepSession,
  WakeWindow,
  FeedbackRating,
  UserSettings,
  GarminTokens,
} from '../models/types';
import { DEFAULT_SETTINGS } from '../constants/config';

const STORAGE_KEYS = {
  SLEEP_SESSIONS: '@wakewise_sleep_sessions',
  WAKE_WINDOWS: '@wakewise_wake_windows',
  FEEDBACK_RATINGS: '@wakewise_feedback',
  USER_SETTINGS: '@wakewise_settings',
  GARMIN_TOKENS: '@wakewise_garmin_tokens',
};

class StorageService {
  // Sleep Sessions
  async getSleepSessions(): Promise<SleepSession[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SLEEP_SESSIONS);
      if (!data) return [];
      const sessions = JSON.parse(data);
      // Convert date strings back to Date objects
      return sessions.map((s: any) => ({
        ...s,
        sleepStart: new Date(s.sleepStart),
        sleepEnd: new Date(s.sleepEnd),
        stages: s.stages.map((stage: any) => ({
          ...stage,
          startTime: new Date(stage.startTime),
          endTime: new Date(stage.endTime),
        })),
      }));
    } catch (error) {
      console.error('Error reading sleep sessions:', error);
      return [];
    }
  }

  async saveSleepSessions(sessions: SleepSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SLEEP_SESSIONS,
        JSON.stringify(sessions)
      );
    } catch (error) {
      console.error('Error saving sleep sessions:', error);
      throw error;
    }
  }

  async addSleepSession(session: SleepSession): Promise<void> {
    const sessions = await this.getSleepSessions();
    // Replace if same date exists, otherwise add
    const existingIndex = sessions.findIndex((s) => s.date === session.date);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    // Keep only last 90 days of data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const filtered = sessions.filter(
      (s) => new Date(s.sleepEnd) > cutoffDate
    );
    await this.saveSleepSessions(filtered);
  }

  // Wake Windows (Alarms)
  async getWakeWindows(): Promise<WakeWindow[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WAKE_WINDOWS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading wake windows:', error);
      return [];
    }
  }

  async saveWakeWindow(window: WakeWindow): Promise<void> {
    try {
      const windows = await this.getWakeWindows();
      const existingIndex = windows.findIndex((w) => w.id === window.id);
      if (existingIndex >= 0) {
        windows[existingIndex] = window;
      } else {
        windows.push(window);
      }
      await AsyncStorage.setItem(
        STORAGE_KEYS.WAKE_WINDOWS,
        JSON.stringify(windows)
      );
    } catch (error) {
      console.error('Error saving wake window:', error);
      throw error;
    }
  }

  async deleteWakeWindow(id: string): Promise<void> {
    try {
      const windows = await this.getWakeWindows();
      const filtered = windows.filter((w) => w.id !== id);
      await AsyncStorage.setItem(
        STORAGE_KEYS.WAKE_WINDOWS,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Error deleting wake window:', error);
      throw error;
    }
  }

  // Feedback Ratings
  async getFeedbackRatings(): Promise<FeedbackRating[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FEEDBACK_RATINGS);
      if (!data) return [];
      const ratings = JSON.parse(data);
      return ratings.map((r: any) => ({
        ...r,
        wakeTime: new Date(r.wakeTime),
        predictedWakeTime: new Date(r.predictedWakeTime),
      }));
    } catch (error) {
      console.error('Error reading feedback:', error);
      return [];
    }
  }

  async addFeedbackRating(rating: FeedbackRating): Promise<void> {
    try {
      const ratings = await this.getFeedbackRatings();
      ratings.push(rating);
      // Keep last 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const filtered = ratings.filter(
        (r) => new Date(r.wakeTime) > cutoffDate
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.FEEDBACK_RATINGS,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Error saving feedback:', error);
      throw error;
    }
  }

  // User Settings
  async getUserSettings(): Promise<UserSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error reading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const current = await this.getUserSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_SETTINGS,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Garmin Tokens
  async getGarminTokens(): Promise<GarminTokens | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GARMIN_TOKENS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading Garmin tokens:', error);
      return null;
    }
  }

  async saveGarminTokens(tokens: GarminTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.GARMIN_TOKENS,
        JSON.stringify(tokens)
      );
    } catch (error) {
      console.error('Error saving Garmin tokens:', error);
      throw error;
    }
  }

  async clearGarminTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.GARMIN_TOKENS);
    } catch (error) {
      console.error('Error clearing Garmin tokens:', error);
      throw error;
    }
  }

  // Clear all data (for logout/reset)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
