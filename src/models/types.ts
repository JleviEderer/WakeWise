// Sleep stage types matching Garmin's classifications
export type SleepStageType = 'deep' | 'light' | 'rem' | 'awake';

export interface SleepStage {
  type: SleepStageType;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export interface SleepSession {
  id: string;
  date: string; // YYYY-MM-DD
  sleepStart: Date;
  sleepEnd: Date;
  totalDurationMinutes: number;
  stages: SleepStage[];
  // Aggregated durations
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  awakeMinutes: number;
  // Optional heart rate data
  averageHeartRate?: number;
  lowestHeartRate?: number;
}

export interface WakeWindow {
  id: string;
  name: string; // e.g., "Weekday Alarm"
  hardWakeTime: string; // HH:MM format
  windowDurationMinutes: number; // 15, 30, 45, or 60
  earliestWakeTime?: string; // Optional HH:MM
  enabled: boolean;
  // Schedule
  repeatDays: number[]; // 0-6, Sunday = 0
}

export interface WakePrediction {
  predictedWakeTime: Date;
  confidence: number; // 0-100
  reasoning: string;
  fallbackTime: Date; // The hard wake time if confidence is low
  predictedStage: SleepStageType;
}

export interface FeedbackRating {
  id: string;
  date: string; // YYYY-MM-DD
  wakeTime: Date;
  predictedWakeTime: Date;
  actualConfidence: number;
  // Ratings
  immediateFeeling: number; // 1-5
  alertnessAfter30Min?: number; // 1-5, optional
  // Context
  usedPrediction: boolean; // Did they wake at predicted time or fallback?
  sleepSessionId?: string;
}

export interface SleepPattern {
  averageSleepDuration: number; // minutes
  averageCycleLength: number; // minutes (typically ~90)
  typicalLightSleepWindows: TimeWindow[];
  consistency: number; // 0-100, how regular their patterns are
  dataPoints: number; // How many nights of data we have
}

export interface TimeWindow {
  startMinutesFromSleep: number;
  endMinutesFromSleep: number;
  probability: number; // 0-1, likelihood of light sleep in this window
}

export interface GarminTokens {
  accessToken: string;
  accessTokenSecret: string;
  userId: string;
}

export interface UserSettings {
  onboardingCompleted: boolean;
  garminConnected: boolean;
  notificationsEnabled: boolean;
  confidenceThreshold: number; // Below this, use fallback (default: 50)
  gradualVolumeRamp: boolean;
  hapticFeedback: boolean;
}

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  AlarmSetup: { alarmId?: string };
  Wake: { predictionId: string };
  Feedback: { wakeSessionId: string };
  Settings: undefined;
  GarminConnect: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Insights: undefined;
  Alarms: undefined;
  Profile: undefined;
};
