# WakeWise OAuth Pages

Static HTML pages for the WakeWise OAuth callback flow.

## Why?

Supabase Edge Functions on the default `*.supabase.co` domain automatically rewrite `text/html` responses to `text/plain`. This causes Safari's in-app browser to display raw HTML instead of rendering the page.

The solution is to redirect from the Edge Function to these externally-hosted static HTML pages.

## Setup

1. Push this repo to GitHub
2. Enable GitHub Pages in Settings → Pages → Deploy from main branch
3. Update the Edge Function's `baseUrl` if using a different GitHub username

## Pages

- `success.html` - Shown after successful Garmin authorization
- `error.html` - Shown if authorization fails
