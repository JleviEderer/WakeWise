# Next Steps: Complete OAuth Flow Setup

## 1. Create GitHub Pages Repo for OAuth Pages

The OAuth callback HTML files are in `wakewise-oauth-pages/`. Push them to GitHub:

```bash
cd wakewise-oauth-pages
git init
git add .
git commit -m "Initial OAuth callback pages"
gh repo create wakewise-oauth --public --source=. --push
```

## 2. Enable GitHub Pages

1. Go to the repo Settings → Pages
2. Set source to "Deploy from a branch"
3. Select `main` branch and `/ (root)` folder
4. Save

## 3. Verify Pages Load

- https://justingeeslin.github.io/wakewise-oauth/success.html
- https://justingeeslin.github.io/wakewise-oauth/error.html

## 4. Deploy Edge Function

```bash
supabase functions deploy garmin-oauth-callback
```

## 5. Test OAuth Flow

Open the app in Expo Go and connect Garmin. Safari should redirect to the styled success page.

---

## Future: Upgrade to Dev Build OAuth

When moving from Expo Go to a development build:
- Use `wakewise://oauth/callback` as redirect URI
- Register it in Garmin Developer Portal
- App intercepts redirect directly - no HTML page needed
- Keep polling as fallback for edge cases
