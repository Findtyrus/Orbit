# Launch checklist

Public launch for finance & accounting students: sign-up open to anyone, LinkedIn import + Google Calendar +
manual logging. Gmail stays limited to `GMAIL_BETA_EMAILS` (max 100 Google test users) until Google's paid
security assessment is worth doing.

## 1. Database (Supabase → SQL Editor)
- [ ] Run `supabase/migrations/0004_texts_and_calls.sql` (phone numbers on contacts)
- [ ] Run `supabase/migrations/0005_multi_user.sql` (onboarding fields, daily AI limits)

## 2. Supabase auth (Authentication settings)
- [ ] **Sign In / Providers → Email**: turn **on** "Allow new users to sign up" and "Confirm email".
- [ ] **URL Configuration**: Site URL = your production URL; Redirect URLs add
      `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`.
- [ ] **Emails → SMTP**: Supabase's built-in email is rate-limited (a few per hour) — connect a real sender
      (Resend, Postmark, or SES) before inviting people.
- [ ] Optional **Google sign-in**: Providers → Google → paste the same Google client ID/secret, add
      `https://<project>.supabase.co/auth/v1/callback` to the Google client's redirect URIs, then set
      `NEXT_PUBLIC_GOOGLE_SIGNIN=true`.

## 3. Deploy (Vercel)
- [ ] Push this repo to GitHub, import it in Vercel, **Root Directory = `network-app`**.
- [ ] Add every variable from `.env.local` (generate a fresh `CRON_SECRET`; keep the same `TOKEN_ENCRYPTION_KEY`
      or existing Google connections can't be decrypted).
- [ ] `vercel.json` schedules `/api/cron/sync` daily (calendar sync + memories for every user). Hobby plan allows
      one run per day; Pro allows hourly.
- [ ] Custom domain (and check the name — "Orbit"/"Orbis" are crowded; pick something you can trademark).

## 4. Google (Google Cloud → Google Auth Platform)
- [ ] Add the production redirect URI `https://<your-domain>/api/google/callback`.
- [ ] **Branding**: app name, logo, homepage `https://<your-domain>/welcome`, privacy `…/privacy`, terms `…/terms`,
      authorized domain.
- [ ] **Audience → Publish app** (move out of Testing) and submit **verification** for the
      `calendar.readonly` scope (sensitive — no paid audit). Google wants a short demo video showing sign-in,
      the consent screen, and how calendar data is used (meeting prep). Usually takes a few days to weeks.
      Until approved, users see an "unverified app" warning and new users are capped at 100.
- [ ] Keep Gmail beta users listed as **test users**; Gmail for everyone requires CASA (≈$540–$4.5k/yr).

## 5. Before inviting people
- [ ] Have someone review `/privacy` and `/terms` (drafts — not legal advice); set `NEXT_PUBLIC_CONTACT_EMAIL`
      to a dedicated address rather than a personal inbox.
- [ ] Anthropic Console: set a monthly spend limit. Expect roughly $3–8 per new user for the first import
      (memories), then cents per day. Tune `DAILY_*_LIMIT` env vars if needed.
- [ ] Error monitoring (Sentry or Vercel logs) and a feedback link.
- [ ] Test the full flow with a fresh email: sign up → confirm → onboarding → LinkedIn import → calendar → Today.
