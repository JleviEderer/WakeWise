// Supabase Configuration
export const SUPABASE_CONFIG = {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ievsoryykdrfykdadost.supabase.co',
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldnNvcnl5a2RyZnlrZGFkb3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODE1MDAsImV4cCI6MjA4NDk1NzUwMH0.RFZBhvKUHxLhXqhkWUK0oagWLivuS6RWjzhkUHFx8KI',
};

// Garmin API Configuration
// Credentials loaded from environment variables (.env file)
export const GARMIN_CONFIG = {
  // Garmin API credentials from environment
  CLIENT_ID: process.env.EXPO_PUBLIC_GARMIN_CLIENT_ID || '',
  CLIENT_SECRET: process.env.EXPO_PUBLIC_GARMIN_CLIENT_SECRET || '',

  // OAuth 2.0 PKCE URLs
  AUTHORIZATION_URL: 'https://connect.garmin.com/oauth2Confirm',
  TOKEN_URL: 'https://diauth.garmin.com/di-oauth2-service/oauth/token',

  // Supabase Edge Function that receives OAuth callback and redirects to app
  OAUTH_CALLBACK_URL: 'https://ievsoryykdrfykdadost.supabase.co/functions/v1/garmin-oauth-callback',

  // API Base URL
  API_BASE_URL: 'https://apis.garmin.com',

  // Scopes for sleep data access
  SCOPES: 'sleep_data',
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

// Theme colors - "Midnight Observatory" palette
// Deep night sky with warm amber moonlight accents
export const COLORS = {
  // Primary amber/gold - like warm lamplight at 3am
  primary: '#D4A853',
  primaryLight: '#E8C47A',
  primaryDark: '#B8923F',
  primaryMuted: 'rgba(212, 168, 83, 0.15)',

  // Deep night sky backgrounds
  background: '#080C14', // Near black with blue undertone
  backgroundGradientStart: '#0A1020',
  backgroundGradientEnd: '#060810',

  // Surfaces - like layers of night
  surface: '#0F1724', // Card backgrounds
  surfaceElevated: '#151E2E', // Raised elements
  surfaceBorder: '#1E2A3E', // Subtle borders

  // Text - warm whites, not harsh
  text: '#F4F1E8', // Warm cream white
  textSecondary: '#8B9AAF', // Muted blue-gray
  textMuted: '#5A6478',

  // Accent - dusty rose for secondary actions
  accent: '#C4868C',
  accentMuted: 'rgba(196, 134, 140, 0.2)',

  // Status colors - softer, more organic
  success: '#7EAE7B', // Sage green
  warning: '#D4A853', // Same as primary
  error: '#C4686C', // Dusty rose-red

  // Sleep stage colors - dreamy gradient
  deepSleep: '#2D3A5C', // Deep indigo
  lightSleep: '#4A6FA5', // Twilight blue
  rem: '#7B68A6', // Soft purple
  awake: '#A67B7B', // Muted mauve

  // Special effects
  glow: 'rgba(212, 168, 83, 0.3)',
  shimmer: 'rgba(244, 241, 232, 0.05)',
};

// App info
export const APP_INFO = {
  name: 'WakeWise',
  version: '1.0.0',
  description: 'Smart wake alarm powered by your sleep data',
};
