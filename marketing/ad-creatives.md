# Orbit ad creatives

All files live in `orbit-video/out/creatives/`. Every screen is the demo account (fictional people). Rules still
apply: no dashes in captions, only real numbers and quotes. Re-render anything with
`node node_modules/@remotion/cli/remotion-cli.js studio` in `orbit-video/` and the edits update everywhere.

## Video ads (1080x1920, 11 to 12 seconds, for Reels, TikTok and Stories)

Each is one angle from the marketing brief. Run them against each other and keep the one with the cheapest trial.

| File | Angle | Caption |
|---|---|---|
| `video-ads/AdPromise.mp4` | The forgotten promise | You said you'd send your resume. Orbit remembers what you promised so you actually follow through. Free for 14 days, link in bio. |
| `video-ads/AdFollowUp.mp4` | The follow-up gap | The coffee chat doesn't get you the referral. The follow-up does. Orbit drafts it, you send it. Free for 14 days, link in bio. |
| `video-ads/AdWhoYouKnow.mp4` | Who do you know? | Before you apply, check who you already know there. Orbit shows your people at every company you're recruiting for. Link in bio. |
| `video-ads/AdPrepared.mp4` | Never unprepared | Walk into every coffee chat knowing what to ask. Orbit builds a one page brief from your history with them. Link in bio. |
| `video-ads/AdToday.mp4` | 300 connections | 300 connections, 5 real relationships. Orbit tells you who to talk to today and why. Free for 14 days, link in bio. |
| `orbit-promo.mp4` (in `out/`) | Brand | Your career has gravity. Orbit is the networking app for finance and accounting students. Free for 14 days. |

## Instagram carousel (1080x1350, 7 slides)

`instagram-carousel/slide-1.png` to `slide-7.png`. Post in order. Each feature slide (2 to 6) also works as a
single post or a static ad.

Caption: Every coffee chat ends with a promise. Most get forgotten. I'm an accounting student and I built Orbit to
fix that: it remembers every conversation, tells you who to follow up with, and drafts the message. You send every
one yourself. Free for 14 days, link in bio. #accounting #finance #recruiting #networking #internship

## Stories (1080x1920)

`stories/story-1.png` to `story-3.png`. Add Instagram's link sticker over the "Try Orbit free" button.

## Other

- `other/SquareBrand.png` (1080x1080): LinkedIn post image or profile banner art.
- `other/Avatar.png` (1080x1080): profile picture for Instagram, TikTok and LinkedIn. The mark reads at any size.

## Landing page

`/welcome` now matches the creatives: "Your career has gravity.", the promo video in a phone, five feature
sections with real screens, light and dark, setup steps, pricing, FAQ and a closing call to action. Point every
ad and bio link at the site root; signed out visitors land there.
