# Orbit creative library

Every file lives in `orbit-video/out/creatives/`. Every creative maps to an angle in `ad-copy-variants.md`, so each
ad has its headline, primary text and hooks ready. All screens are the demo account (fictional people).

## What's here

| Folder | Count | Sizes | Use for |
|---|---|---|---|
| `static-ads/<angle>/` | 60 | feed 1080x1350, story 1080x1920, square 1080x1080, each in light and dark | Meta feed and story ads, LinkedIn (square), TikTok photo posts |
| `text-posts/` | 10 | 1080x1350 | Organic posts and cheap ad tests, alternating light and dark |
| `special/` | 6 | 1080x1350, light and dark | Comparison, follow-up playbook and recruiting checklist, built for saves and shares |
| `video-ads/` | 20 | 1080x1920, about 11 to 13 seconds | Reels, TikTok, Stories, YouTube Shorts |
| `bumpers/` | 3 | 1080x1920, 6 seconds | YouTube bumper ads |
| `instagram-carousel/` | 7 | 1080x1350 | Organic carousel, also usable as feature ads |
| `stories/`, `other/` | 3 and 4 | various | Brand stories, LinkedIn banners, profile picture |
| `orbit-promo.mp4` (in `out/`) | 1 | 1080x1920, 35 seconds | Brand video and the landing page |

## Angle map

Static ads live in `static-ads/<slug>/` and are named `<format>-<light|dark>.png`.

| # | Angle (slug) | Static headline | Text post | Videos |
|---|---|---|---|---|
| 1 | The forgotten promise (`promise`) | You said you'd send your resume. Did you? | "Reach back out in January." It's February. | AdPromise, AdPromiseJanuary, AdPromiseReferral |
| 2 | The follow-up gap (`followup`) | The coffee chat doesn't get you the referral. The follow-up does. | Nobody tells you the real networking secret: follow up. | AdFollowUp, AdFollowUpNowWhat, AdFollowUpEmail |
| 3 | Who do you know (`whoyouknow`) | Applying to Deloitte? You probably already know someone there. | Cold applications are hard. Warm ones are easier. | AdWhoYouKnow, AdColdApply, AdBeforeApply |
| 4 | 300 connections (`connections`) | 300 connections. 5 real relationships. | Networking isn't collecting connections. It's keeping them. | AdToday, AdHundreds, AdWhoToday |
| 5 | Never unprepared (`prepared`) | Walk into every coffee chat knowing exactly what to ask. | Never ask "so what do you do?" again. | AdPrepared, AdTenMinutes, AdThirtySeconds |
| 6 | Built by a student (`founder`) | I'm an accounting student. I built the networking app I needed. | I built the networking app I needed. | AdFounder |
| 7 | Career gravity (`gravity`) | Your career has gravity. Keep the right people in orbit. | Opportunities orbit people. | AdGravity, orbit-promo |
| 8 | Recruiting season (`season`) | Applications are opening. Is your network ready? | The students who get referrals started networking months ago. | AdSeason |
| 9 | Spreadsheet (`spreadsheet`) | Still tracking your networking in a spreadsheet? | Delete your networking spreadsheet. | AdSpreadsheet, special/compare |
| 10 | You stay in control (`control`) | AI that drafts. You that sends. | AI that drafts. You that sends. | AdControl |

Bumpers: `Bumper1` (promise), `Bumper2` (follow-up), `Bumper3` (who you know).

## Launch test plan

You have enough to run a proper test. Keep it small and let the data pick.

**Round 1 (about $15 per angle, 3 to 4 days):** run one angle at a time, in a separate ad set each.
- Angles 2, 1 and 3 first. They have the clearest problem and the most videos.
- Per angle: the main video ad, plus the feed and story statics in light. Same caption from `ad-copy-variants.md`.
- Tag links: `?utm_source=instagram&utm_campaign=<slug>&utm_content=<file name>`.

**Read the results:**
- Under $5 per trial after $15 spent: keep it. Over, kill it.
- Hook rate (3 second views divided by impressions) above 25% means the hook works. Low hook rate with good clicks means the first line is the problem, so swap in the alternate video for that angle.

**Round 2:** for the winning angle, test: video vs static, light vs dark statics, and the alternate hooks. Then put 70% of budget on the winner.

**Organic in parallel:** post the text posts and `special/` images as normal feed posts. The playbook, checklist
and comparison are made to be saved, and saves are the strongest signal for the Instagram algorithm.

## Rules that still apply

No dashes, only real numbers (14 days, $6 a month, $48 a year), nothing that implies Orbit sends messages for you,
no made up testimonials or user counts.
