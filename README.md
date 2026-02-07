# WakeWise

Intelligent wake alarm app that uses Garmin sleep data to predict optimal wake times during light sleep phases. Wake up feeling refreshed by timing your alarm to your natural sleep cycles.

**Privacy-first:** All sleep data is stored in your own Supabase instance — never on a centralized server.

## How It Works

1. **Connect** your Garmin wearable via OAuth 2.0 (PKCE flow)
2. **Analyze** — WakeWise studies your sleep patterns (cycle length, light sleep windows, consistency)
3. **Predict** — Given your wake window, the app finds the optimal moment during light sleep to wake you
4. **Learn** — Post-wake feedback calibrates future predictions for better accuracy over time

```
Garmin Device → Garmin Connect → Webhook → Supabase → App fetches data
→ SleepAnalysisService finds patterns → WakePredictorService picks optimal time
→ AlarmService schedules notification
```

## Features

- **Smart wake predictions** — Targets light sleep phases within your configured wake window
- **Garmin integration** — OAuth 2.0 PKCE flow with automatic data sync and 30-day historical backfill
- **Configurable wake windows** — Set hard wake time, window duration (15/30/45/60 min), and repeat days
- **Feedback loop** — Rate how you feel after waking to improve future predictions
- **Confidence scoring** — Predictions include confidence levels based on data quality and history
- **Privacy-first architecture** — Sleep data lives in your own Supabase project, analyzed on-device

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo), TypeScript |
| Backend | Supabase (PostgreSQL + Deno Edge Functions) |
| Sleep Data | Garmin Health API (OAuth 2.0 PKCE) |
| Local Storage | AsyncStorage |
| Notifications | expo-notifications |

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for database migrations)
- A [Supabase](https://supabase.com/) project
- A [Garmin Developer](https://developer.garmin.com/) app with OAuth 2.0 credentials

## Setup

### 1. Clone and install

```bash
git clone https://github.com/JleviEderer/WakeWise.git
cd WakeWise
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GARMIN_CLIENT_ID=your-garmin-client-id
EXPO_PUBLIC_GARMIN_CLIENT_SECRET=your-garmin-client-secret
```

### 3. Set up Supabase

```bash
supabase link --project-ref your-project-ref
supabase db push
supabase functions deploy garmin-oauth-callback
supabase functions deploy garmin-webhook
```

### 4. Configure Garmin Developer Portal

- Register your app at the [Garmin Developer Portal](https://developer.garmin.com/)
- Set the OAuth callback URL to your Supabase edge function URL
- Register the webhook endpoint for sleep data push notifications

### 5. Run the app

```bash
npx expo start
```

## Project Structure

```
src/
├── screens/          # UI screens (Home, AlarmSetup, Wake, Feedback, Settings, etc.)
├── services/         # Business logic layer
│   ├── wake-predictor.service.ts   # Sleep-aware alarm predictions
│   ├── sleep-analysis.service.ts   # Pattern detection from historical data
│   ├── alarm.service.ts            # Notification scheduling
│   ├── garmin.service.ts           # Garmin OAuth + data sync
│   ├── supabase.service.ts         # Database operations
│   ├── storage.service.ts          # Local AsyncStorage wrapper
│   └── feedback.service.ts         # Post-wake feedback collection
├── models/           # TypeScript type definitions (single source of truth)
├── components/       # Reusable UI components
├── navigation/       # React Navigation routing
├── constants/        # Config, colors, theme
├── hooks/            # Custom React hooks
└── utils/            # Utility functions

supabase/
├── migrations/       # Database schema (users, sleep_sessions, sleep_stages, oauth_pending)
└── functions/        # Deno Edge Functions (OAuth callback, Garmin webhook)
```

## Architecture

**Layered architecture:** UI → Services → Supabase

- **Screens** handle presentation only — no business logic
- **Services** contain all domain logic (prediction algorithms, sleep analysis, Garmin API calls)
- **Supabase** is the sole data access layer for remote data; AsyncStorage for local-only data
- **Types** are defined once in `src/models/types.ts` — single source of truth

All dates are stored as UTC in the database and converted to the user's timezone only at the display layer.

## Scripts

| Command | Description |
|---------|-------------|
| `npx expo start` | Start the Expo dev server |
| `npx tsc --noEmit` | Type-check the project |
| `npx eslint .` | Run linter |
| `npx prettier --write .` | Format code |
| `npm test` | Run all tests |
| `supabase db push` | Apply database migrations |

## License

All rights reserved.
