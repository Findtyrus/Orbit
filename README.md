# Orbit — personal networking CRM

A Dex-style app for your phone: who to reach out to today, every conversation with each person in one
timeline, and (next builds) Gmail + Calendar sync and AI synopses.

**Built so far (phase 1):** sign-in, LinkedIn import (connections + full message history), Today screen
(overdue reach-outs, new connections), People search, person page (timeline, keep-in-touch cadence,
notes, "I reached out" / log call), installable on iPhone.

## Setup (~10 minutes, one time)

### 1. Create the database
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (Free plan is plenty).
   Name it `orbit`, region **East US**, save the database password somewhere safe.
2. When it finishes, open **SQL Editor** → **New query**, paste all of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), click **Run**.
3. **Authentication → Users → Add user → Create new user**: your email + a password, tick *Auto Confirm User*.
4. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up" (it's just you).
5. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** key.

### 2. Point the app at it
```bash
cp .env.local.example .env.local
```
Open `.env.local` and paste in the URL and publishable key.

### 3. Run it
```bash
npm run dev
```
Open http://localhost:3000, sign in, go to **Me**, upload your LinkedIn export `.zip`.

### 4. Connect Gmail + Google Calendar (~10 minutes, one time)
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → project picker → **New project** → name it `Orbit` → Create, and make sure it's selected.
2. **APIs & Services → Library**: search and **Enable** both **Gmail API** and **Google Calendar API**.
3. **Google Auth Platform** (a.k.a. OAuth consent screen) → **Get started**: app name `Orbit`, your email as support
   email, Audience **External**, your email as contact → Create.
4. **Audience → Test users → Add users**: add the Gmail address you'll connect.
5. **Clients → Create client** → type **Web application**, name `Orbit`, and under **Authorized redirect URIs** add
   `http://localhost:3000/api/google/callback` (add your Vercel URL + `/api/google/callback` later too) → Create.
6. Copy the **Client ID** and **Client secret** into `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
7. Supabase → **Project Settings → API Keys → Secret keys** → copy into `.env.local` as `SUPABASE_SECRET_KEY`.
8. Run [`supabase/migrations/0003_google_sync.sql`](supabase/migrations/0003_google_sync.sql) in the Supabase SQL Editor.
9. Restart the app → **Me → Connect Google**. Google will warn *"Google hasn't verified this app"* — that's expected
   for your own private app: click **Continue**, and tick both the Gmail and Calendar boxes.

The first sync reads the last 180 days. After that it re-syncs in the background whenever you open Today (at most
every 2 hours), or tap **Sync now**. Because the app stays in Google's "Testing" mode, Google expires the
connection every 7 days — Orbit shows a banner and you tap **Reconnect** (two taps).

What gets synced (read-only — Orbit can't send, delete or change anything):
- **Emails** with people you know (matched by email, or by name — which also fills in their email). People you've
  emailed directly who aren't in Orbit yet are added. Promotions, newsletters and no-reply senders are skipped.
- **Meetings** with up to 8 guests: past ones go on each person's timeline; upcoming ones appear on Today with an
  AI prep brief, and a "How did it go?" prompt appears after they end.

### 5. Put it on your phone
Deploy to Vercel (free): import this folder as a project, set **Root Directory** to `network-app`, and add
every variable from `.env.local`. Add `https://<your-app>.vercel.app/api/google/callback` as a redirect URI in
Google Cloud. On your iPhone open the Vercel URL in **Safari → Share → Add to Home Screen**.

> The parent folder name contains a `:`, which breaks npm's usual `next` shortcut — that's why the
> `package.json` scripts call `node node_modules/next/dist/bin/next` directly. Always use `npm run …`.

## How "reach out" works
Each person can have a keep-in-touch cadence (2 weeks → yearly). They show up on **Today** once
`last real contact + cadence` has passed. Private notes don't reset the clock; messages, emails, meetings,
calls and "I reached out" do. Importing sets a 2-month cadence for anyone you've had a two-way
LinkedIn conversation with; everyone else is off until you choose.

## Roadmap
- Push notifications (meeting brief 1h before, "X told you to reconnect around now")
- Opportunities: job postings at firms where you have warm contacts
- Relationship map / intro paths
- Two-way HubSpot sync (stage, next follow-up)
