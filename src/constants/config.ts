// Garmin API Configuration
// You'll need to register at https://developer.garmin.com and get these credentials
export const GARMIN_CONFIG = {
  // Replace with your actual Garmin API credentials
  CONSUMER_KEY: 'YOUR_GARMIN_CONSUMER_KEY',
  CONSUMER_SECRET: 'YOUR_GARMIN_CONSUMER_SECRET',
  // OAuth URLs
  REQUEST_TOKEN_URL: 'https://connectapi.garmin.com/oauth-service/oauth/request_token',
  AUTHORIZE_URL: 'https://connect.garmin.com/oauthConfirm',
  ACCESS_TOKEN_URL: 'https://connectapi.garmin.com/oauth-service/oauth/access_token',
  // API Base URL
  API_BASE_URL: 'https://apis.garmin.com',
};

// Wake Window Options
export const WINDOW_DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
];

// Days of week
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

// Default settings
export const DEFAULT_SETTINGS = {
  onboardingCompleted: false,
  garminConnected: false,
  notificationsEnabled: false,
  confidenceThreshold: 50,
  gradualVolumeRamp: true,
  hapticFeedback: true,
};

// Sleep analysis constants
export const SLEEP_ANALYSIS = {
  MIN_DATA_DAYS: 7, // Minimum nights needed for predictions
  IDEAL_DATA_DAYS: 30, // Optimal data for accurate predictions
  AVERAGE_CYCLE_LENGTH: 90, // minutes, used as fallback
  CONFIDENCE_BOOST_PER_DAY: 2, // Confidence increases with more data
  MAX_CONFIDENCE: 95, // Never claim 100% confidence
};

// Theme colors
export const COLORS = {
  primary: '#6366F1', // Indigo
  primaryDark: '#4F46E5',
  secondary: '#8B5CF6', // Purple
  background: '#0F172A', // Dark slate
  surface: '#1E293B', // Slightly lighter
  surfaceLight: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  // Sleep stage colors
  deepSleep: '#1E40AF',
  lightSleep: '#60A5FA',
  rem: '#A78BFA',
  awake: '#F87171',
};

// App info
export const APP_INFO = {
  name: 'WakeWise',
  version: '1.0.0',
  description: 'Smart wake alarm powered by your sleep data',
};
