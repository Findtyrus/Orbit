#!/usr/bin/env node
// Fill a demo account with a realistic, entirely fictional network for presentations.
//
//   npm run seed:demo -- you+demo@gmail.com
//
// Safety: only runs on an account whose email contains "demo", and only ever touches that account.
// Re-run right before a demo: it wipes the demo account's data and reseeds with dates relative to now.
// All people are made up. Companies are real so the demo feels real; emails use example.com.

import { createClient } from "@supabase/supabase-js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"));
const email = (process.argv[2] ?? "").toLowerCase();
if (!email.includes("demo")) {
  console.error("Usage: npm run seed:demo -- <email containing 'demo'>   (refuses any other account)");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// ---------- find the demo account ----------
let user = null;
for (let page = 1; !user; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No account for ${email}. Sign up with that email on the app first, then run this again.`);
  process.exit(1);
}
const uid = user.id;

const DAY = 86_400_000;
// `hour` is UTC and may be fractional (15.5 = 15:30).
const at = (days, hour = 15) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return d.toISOString();
};
const date = (days) => at(days).slice(0, 10);
const must = ({ error }) => { if (error) throw new Error(error.message); };

// ---------- wipe (this account only) ----------
for (const t of ["outreach_queue", "commitments", "synopses", "interactions", "meetings", "firms", "contacts"]) {
  must(await db.from(t).delete().eq("user_id", uid));
}

// ---------- the student ----------
must(await db.from("profiles").upsert({
  user_id: uid,
  name: "Avery Brooks",
  school: "Mississippi State University",
  grad_year: 2027,
  location: "Dallas, TX",
  target_roles: ["Audit", "Transaction Advisory / FDD", "Investment Banking"],
  target_firms: ["RSM", "Deloitte", "Alvarez & Marsal", "Raymond James", "Forvis Mazars", "KPMG"],
  about: "Accounting junior at Mississippi State on the CPA track. Audit intern at Horne LLP last summer. Beta Alpha Psi and the MSU Investment Club.",
  goals: "Land a transaction advisory internship for summer 2027 and learn how people moved from audit into deal work.",
  onboarded_at: at(-40),
  tour_done_at: at(-40),
  ai_enabled: true,
  resume: {
    summary: "Avery Brooks is an accounting student at Mississippi State on the CPA track with audit internship experience at Horne LLP. Interested in transaction advisory and investment banking.",
    education: [{ school: "Mississippi State University", degree: "Bachelor of Accountancy", major: "Accounting", grad_year: 2027 }],
    experience: [
      { company: "Horne LLP", title: "Audit Intern", dates: "May 2026 to Aug 2026", location: "Ridgeland, MS" },
      { company: "Mississippi Department of Revenue", title: "Accounting Intern", dates: "May 2025 to Aug 2025", location: "Jackson, MS" },
    ],
    activities: ["Beta Alpha Psi, Vice President of Professional Development", "MSU Investment Club", "Intramural basketball"],
    skills: ["Excel", "Financial statement analysis", "Audit sampling", "Alteryx basics"],
    certifications: ["CPA track (150 hours by 2027)"],
    hometown: "Tupelo, MS",
  },
}));

// ---------- people ----------
// h = history: [daysAgo, "in"|"out"|"call"|"meeting"|"note", text]
const P = [
  { k: "marcus", first: "Marcus", last: "Hale", title: "Senior Associate, Transaction Advisory", company: "RSM", cadence: 30, starred: true, stage: "Chatted",
    h: [[48, "out", "Hi Marcus, I'm an accounting student at Mississippi State on the CPA track. I saw you started in audit at Forvis before moving to TAS at RSM. Would you be open to a 15 minute call about that move?"],
        [47, "in", "Happy to help a fellow audit person. How does Thursday at 4 work?"],
        [42, "call", "Talked for 25 minutes. Two years in audit is plenty, learn to read a QoE report, and network with the Dallas TAS team before recruiting opens. Offered to pass my resume to the campus recruiter."],
        [40, "out", "Thanks again for the time yesterday. The advice on reading QoE reports was exactly what I needed. I'll send my updated resume this week."],
        [30, "meeting", "Coffee during the RSM Dallas office tour"],
        [30, "note", "Met two of his teammates on the office tour. He introduced me as someone he'd vouch for."],
        [12, "in", "Hey Avery, just checking in. Did you finish that resume update? Campus recruiting kicks off in a few weeks."],
        [6, "out", "Thanks for the nudge, Marcus. Finishing the last edits this weekend."],
        [5, "in", "Sounds good. Send it over when it's ready and I'll pass it along."]],
    memory: { summary: "Marcus moved from audit at Forvis Mazars into transaction advisory at RSM in Dallas. He is your strongest TAS contact and offered to pass your resume to RSM's campus recruiter.",
      career: ["Audit Senior at Forvis Mazars for 2 years", "Moved to RSM Transaction Advisory in Dallas"], told: ["Two years in audit is enough before switching", "Learn to read a quality of earnings report", "Network with the Dallas TAS team before recruiting opens"],
      you: ["You're on the CPA track", "You want TAS in Dallas"], advice: ["Network before recruiting opens, not after", "Practice reading QoE reports"], personal: [],
      points: ["Your QoE practice since the call", "When RSM's campus recruiting opens"], loops: [["Send updated resume to Marcus", "me", 2]],
      next: "Send Marcus your updated resume and thank him for the reminder.", why: "He offered to pass your resume along and recruiting opens in a few weeks.", follow: 0,
      msg: "Hi Marcus, sorry for the slow reply. Here's my updated resume. Since we talked I've been working through a couple of QoE reports like you suggested. Thanks again for offering to pass it along to the campus team.",
      common: ["Both started in audit"], tags: ["Audit to TAS", "Dallas"] } },
  { k: "priya", first: "Priya", last: "Natarajan", title: "Senior Consultant, Financial Due Diligence", company: "Deloitte", cadence: 60, stage: "Chatted",
    h: [[35, "out", "Hi Priya, I'm a Mississippi State accounting student interested in FDD. Would you have 15 minutes for a coffee chat sometime?"], [34, "in", "Sure, grab a time on my calendar next week."],
        [20, "meeting", "Coffee chat (virtual)"], [20, "note", "Priya said FDD hires heavily from audit interns. Biggest gap she sees is net working capital analysis. Said to reach back out after midterms about the Deloitte FDD internship."]],
    memory: { summary: "Priya is a Senior Consultant in Deloitte's FDD practice. You had a coffee chat 20 days ago and she asked you to reach back out after midterms about the FDD internship.",
      career: ["Audit at Deloitte, then moved into Financial Due Diligence"], told: ["FDD hires heavily from audit interns", "Net working capital analysis is the biggest gap she sees in students"],
      you: ["You did an audit internship at Horne"], advice: ["Learn net working capital adjustments"], personal: ["Runs half marathons"],
      points: ["What you've learned about NWC since the chat", "Timeline for Deloitte's FDD internship"], loops: [["Reach back out to Priya after midterms", "me", 0]],
      next: "Reach back out to Priya now that midterms are over.", why: "She asked you to follow up after midterms, which is now.", follow: 0,
      msg: "Hi Priya, hope you're doing well. Midterms just wrapped and I took your advice and worked through a few net working capital examples. I'd love to hear whether the FDD internship timeline has been set yet.",
      common: [], tags: ["FDD"] } },
  { k: "caleb", first: "Caleb", last: "Turner", title: "Investment Banking Analyst", company: "Raymond James", cadence: null, stage: "Reached out",
    h: [[9, "out", "Hi Caleb, I'm an accounting student at Mississippi State interested in banking. I saw you came from an accounting background too. Would you be open to a quick call about how you made the jump?"]],
    memory: null },
  { k: "hannah", first: "Hannah", last: "Whitfield", title: "Audit Manager", company: "KPMG", cadence: 30, starred: true, stage: "Mentor",
    h: [[120, "meeting", "Beta Alpha Psi alumni panel"], [118, "out", "Thank you for speaking at the Beta Alpha Psi panel. Your story about starting at a regional firm really stuck with me."],
        [117, "in", "Of course. Always happy to help a Bulldog. Keep me posted on your internship search."], [60, "call", "Monthly check-in. She offered to do a mock interview before KPMG superdays."], [45, "out", "Thanks for the mock interview offer, I'll take you up on it when superdays are scheduled."],
        [44, "in", "Anytime. Just let me know when your superday is set."]],
    memory: { summary: "Hannah is an Audit Manager at KPMG and a Mississippi State alum. She spoke at Beta Alpha Psi and has become a mentor, offering a mock interview before superdays.",
      career: ["Started at a regional CPA firm", "Audit Manager at KPMG"], told: ["Regional firm experience helped her stand out"], you: ["You're in Beta Alpha Psi", "Interviewing with KPMG"],
      advice: ["Lean on regional firm experience in interviews"], personal: ["Mississippi State alum"], points: ["Your KPMG superday date", "Taking her up on the mock interview"],
      loops: [["Schedule mock interview with Hannah before the KPMG superday", "me", 5]], next: "Ask Hannah for the mock interview before your KPMG superday.",
      why: "Your monthly check-in is overdue and the superday is coming up.", follow: -2,
      msg: "Hi Hannah, hope your busy season prep is going well. My KPMG superday is coming up and I'd love to take you up on that mock interview if you still have time. Any evening next week works for me.",
      common: ["Both Mississippi State", "Both Beta Alpha Psi"], tags: ["Mentor", "MSU alumni"] } },
  { k: "diego", first: "Diego", last: "Ramirez", title: "Associate, Transaction Advisory", company: "Alvarez & Marsal", cadence: 60, stage: "Chat scheduled",
    h: [[14, "out", "Hi Diego, I'm a junior at Mississippi State looking at transaction advisory. Your move from Big 4 audit to A&M caught my eye. Would you have 20 minutes to chat?"], [13, "in", "Sure, sent you an invite for later this week. Looking forward to it."]],
    memory: { summary: "Diego is an Associate in A&M's transaction advisory group who moved from Big 4 audit. You have a coffee chat with him tomorrow.",
      career: ["Big 4 audit for 3 years", "Associate, A&M Transaction Advisory"], told: [], you: ["You're targeting TAS internships"], advice: [], personal: [],
      points: ["How A&M's TAS group differs from Big 4", "What he wishes he'd learned in audit"], loops: [], next: "Prep for tomorrow's coffee chat.", why: "Your first conversation is tomorrow.", follow: null,
      msg: "Hi Diego, looking forward to talking tomorrow. Thanks again for making the time.", common: ["Both started in audit"], tags: ["Audit to TAS", "Target company"] } },
  { k: "ethan", first: "Ethan", last: "Cole", title: "Corporate Development Analyst", company: "FedEx", cadence: 90, stage: "Chatted",
    h: [[1, "meeting", "Coffee after the Memphis finance career fair"]], memory: null },
  { k: "sophie", first: "Sophie", last: "Bennett", title: "Campus Recruiter", company: "Forvis Mazars", cadence: 30, stage: "Referred me",
    h: [[30, "in", "Great meeting you at the career fair, Avery. Applications for our summer audit and advisory internships close soon."], [29, "out", "Thanks Sophie! Submitting my application this week."], [22, "out", "Just applied for the advisory internship. Thank you for the heads up."]],
    memory: { summary: "Sophie is a campus recruiter at Forvis Mazars you met at the career fair. You applied to the advisory internship 22 days ago.",
      career: ["Campus recruiting for audit and advisory"], told: ["Applications closing soon"], you: ["You applied to the advisory internship"], advice: [], personal: [],
      points: ["Status of your application"], loops: [], next: "Politely check on your application status.", why: "It's been three weeks since you applied.", follow: 1,
      msg: "Hi Sophie, I wanted to follow up on my application for the advisory internship. I'm still very interested and happy to send anything else that would help.", common: [], tags: ["Recruiter"] } },
  { k: "ava", first: "Ava", last: "Scott", title: "Audit Senior", company: "Horne LLP", cadence: 60, stage: "Mentor",
    h: [[100, "note", "My senior on the audit team this summer. Great teacher."], [70, "out", "Thanks for everything this summer. I learned a ton working with you."], [69, "in", "You were a great intern! Let me know how recruiting goes."]],
    memory: { summary: "Ava was your audit senior at Horne LLP during your internship and asked to hear how recruiting goes.",
      career: ["Audit Senior at Horne LLP"], told: [], you: ["You're recruiting for TAS"], advice: [], personal: [], points: ["Recruiting update"], loops: [],
      next: "Send Ava a quick recruiting update.", why: "Due for a check-in and she asked to hear how it goes.", follow: -5,
      msg: "Hi Ava, quick update: I've had some great conversations with TAS folks at RSM and A&M and just applied at Forvis. Thanks again for everything this summer.", common: [], tags: ["Former team"] } },
  { k: "chloe", first: "Chloe", last: "Adams", title: "Audit Senior", company: "Forvis Mazars", cadence: 60, stage: "Chatted",
    h: [[75, "out", "Hi Chloe, thanks for chatting at Meet the Firms!"], [74, "in", "Of course! Reach out anytime."]], memory: null },
  { k: "ryan", first: "Ryan", last: "Doyle", title: "Investment Banking Analyst", company: "Stephens Inc.", cadence: null, stage: "Reached out",
    h: [[16, "out", "Hi Ryan, I'm a Mississippi State accounting student interested in banking. Would you be open to a quick call about Stephens' analyst program?"]], memory: null },
  { k: "isaac", first: "Isaac", last: "Moore", title: "Financial Analyst", company: "Nucor", cadence: null, stage: "Chatted",
    h: [[210, "out", "Great meeting you at the info session."], [208, "in", "You too, good luck this semester."]], memory: null },
  // Connected but never messaged: these feed the outreach queue.
  { k: "noah", first: "Noah", last: "Fischer", title: "Transaction Advisory Analyst", company: "RSM", stage: "New", h: [] },
  { k: "grace", first: "Grace", last: "Liu", title: "Audit Associate", company: "Deloitte", stage: "New", h: [] },
  { k: "ben", first: "Ben", last: "Carter", title: "FDD Associate", company: "Alvarez & Marsal", stage: "New", h: [] },
  { k: "maya", first: "Maya", last: "Patel", title: "Investment Banking Associate", company: "Raymond James", stage: "New", h: [] },
  { k: "tyler", first: "Tyler", last: "Ward", title: "Senior Associate, Advisory", company: "Forvis Mazars", stage: "New", h: [] },
  { k: "olivia", first: "Olivia", last: "Grant", title: "Tax Senior", company: "EY", stage: "New", h: [] },
  { k: "jamal", first: "Jamal", last: "Price", title: "Private Equity Associate", company: "Harbert Management", stage: "New", h: [] },
];

const ids = {};
for (const p of P) {
  const { data, error } = await db.from("contacts").insert({
    user_id: uid, first_name: p.first, last_name: p.last, title: p.title, company: p.company,
    email: `${p.first}.${p.last}@example.com`.toLowerCase(), source: "manual", stage: p.stage,
    cadence_days: p.cadence ?? null, starred: !!p.starred, connected_on: date(-(60 + Math.floor(Math.random() * 200))),
    tags: p.memory?.tags ?? [],
  }).select("id").single();
  if (error) throw new Error(error.message);
  ids[p.k] = data.id;

  const rows = p.h.map(([daysAgo, kind, body], i) => ({
    user_id: uid, contact_id: data.id,
    kind: kind === "in" || kind === "out" ? "linkedin_message" : kind,
    direction: kind === "in" ? "in" : kind === "out" || kind === "call" ? "out" : null,
    occurred_at: at(-daysAgo, 14 + i), body, subject: kind === "meeting" ? body : null, external_id: `demo-${p.k}-${i}`,
  }));
  if (rows.length) must(await db.from("interactions").insert(rows));

  const m = p.memory;
  if (m) {
    must(await db.from("synopses").insert({
      contact_id: data.id, user_id: uid, summary: m.summary,
      facts: { career: m.career, they_told_you: m.told, you_told_them: m.you, advice_given: m.advice, personal: m.personal },
      talking_points: m.points, open_loops: m.loops.map((l) => l[0]), next_step: m.next, why_now: m.why,
      suggested_message: m.msg, follow_up_on: m.follow == null ? null : date(m.follow), common_ground: m.common,
      interactions_seen: rows.length ? rows[rows.length - 1].occurred_at : null, source_count: rows.length,
    }));
    if (m.loops.length) {
      must(await db.from("commitments").insert(m.loops.map(([text, owner, due]) => ({
        user_id: uid, contact_id: data.id, text, owner, due_on: due == null ? null : date(due), source: "ai",
      }))));
    }
  }
}

// ---------- companies ----------
// Rows in one bulk insert must share columns, so every row lists aliases.
must(await db.from("firms").insert([
  { user_id: uid, name: "RSM", aliases: [], category: "Advisory", stage: "Networking", priority: 1, deadline: date(9), role: "TAS Intern, Dallas" },
  { user_id: uid, name: "Alvarez & Marsal", aliases: ["A&M"], category: "Advisory", stage: "Networking", priority: 1, role: "Transaction Advisory Intern" },
  { user_id: uid, name: "Deloitte", aliases: [], category: "Big 4", stage: "Referral", priority: 2, deadline: date(12), role: "FDD Intern" },
  { user_id: uid, name: "KPMG", aliases: [], category: "Big 4", stage: "Interviewing", priority: 2, role: "Audit Intern" },
  { user_id: uid, name: "Forvis Mazars", aliases: [], category: "Regional CPA", stage: "Applied", priority: 2, role: "Advisory Intern" },
  { user_id: uid, name: "Raymond James", aliases: [], category: "Middle-market IB", stage: "Researching", priority: 3, role: "IB Summer Analyst" },
]));

// ---------- meetings ----------
must(await db.from("meetings").insert([
  { user_id: uid, google_event_id: "demo-diego", title: "Coffee chat with Diego Ramirez (A&M)", start_at: at(1, 15), end_at: at(1, 15.5),
    location: "Zoom", attendees: [{ email: "diego.ramirez@example.com", name: "Diego Ramirez" }], contact_ids: [ids.diego], debriefed: false,
    prep: {
      purpose: "First conversation with Diego. Learn how he moved from Big 4 audit into A&M's transaction advisory group and what A&M looks for in interns.",
      context: ["He replied within a day and sent the invite himself, a good sign", "He spent 3 years in Big 4 audit before A&M", "You have two other TAS contacts (Marcus at RSM, Priya at Deloitte) to compare notes with"],
      your_angle: "Your audit internship at Horne and the QoE and working capital practice you've done since talking with Marcus and Priya.",
      questions: ["What made you choose A&M over staying in Big 4 advisory?", "What does a first year associate spend most of their time on?", "Which audit skills transferred best, and which did you have to learn fresh?", "Is there anyone on the team you'd suggest I talk to before recruiting opens?"],
      follow_up: "Send a thank you within 24 hours that mentions one specific thing he said, then mark A&M as a referral target if he offers to help.",
    } },
  { user_id: uid, google_event_id: "demo-ethan", title: "Coffee with Ethan Cole (FedEx)", start_at: at(-1, 17), end_at: at(-1, 17.5),
    location: "Memphis", attendees: [{ email: "ethan.cole@example.com", name: "Ethan Cole" }], contact_ids: [ids.ethan], debriefed: false },
]));

// ---------- today's outreach drafts ----------
must(await db.from("outreach_queue").insert([
  { user_id: uid, contact_id: ids.caleb, kind: "follow_up", reason: "No reply in 9 days", channel: "email", subject: "Quick follow up",
    body: "Hi Caleb, following up on my note from last week. I know analyst schedules are packed, so even 10 minutes would be great. I'm especially curious how your accounting background helped in your first year at Raymond James." },
  { user_id: uid, contact_id: ids.noah, kind: "intro", reason: "At RSM, a target company. You've never messaged", channel: "email", subject: "MSU accounting student interested in RSM TAS",
    body: "Hi Noah, I'm an accounting junior at Mississippi State interested in transaction advisory. I recently talked with Marcus Hale on your team and he spoke highly of the Dallas group. Would you be open to a 15 minute call about your first year as an analyst?" },
  { user_id: uid, contact_id: ids.ben, kind: "intro", reason: "At Alvarez & Marsal, a target company. You've never messaged", channel: "email", subject: "Question about FDD at A&M",
    body: "Hi Ben, I'm an accounting student at Mississippi State with an audit internship behind me and I'm exploring FDD. I'd love to hear how you got into A&M's diligence team. Would you have 15 minutes in the next couple of weeks?" },
]));

console.log(`Seeded demo account ${email}: ${P.length} people, 6 companies, 2 meetings, 3 outreach drafts.`);
