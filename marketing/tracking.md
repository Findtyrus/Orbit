# Tracking and the AI cap

## Monthly AI cap
Every AI call is estimated in dollars and added to the student's month. Paying students stop at $3 a month (env MONTHLY_AI_BUDGET), trials at $1.50 (TRIAL_AI_BUDGET). Daily limits still apply. The student sees a plain message and the rest of Orbit keeps working. Resets on the 1st.

## What is tracked
- Source on every account: UTM tags (utm_source, utm_medium, utm_campaign), ?ref=, Meta and TikTok click ids, or the referring site. First touch wins, kept 90 days.
- Events per student: signup, linkedin_import, first_outreach, subscribed, and one active mark per day.
- Vercel Analytics for page views. Meta and TikTok pixels fire PageView, CompleteRegistration and Subscribe.

## Reading the funnel
In the Supabase SQL editor:

    select * from public.funnel_by_source;

Columns: signups, imported_in_48h, returned_week_two, paid, by source. Trial to paid is paid divided by signups.

## Tagging links
- Instagram bio: buildyourorbit.com/?utm_source=instagram&utm_medium=bio
- Meta ad: ?utm_source=meta&utm_medium=paid&utm_campaign=NAME
- TikTok ad: ?utm_source=tiktok&utm_medium=paid&utm_campaign=NAME
- Club flyer QR: ?utm_source=bap&utm_medium=qr
