import "server-only";
import { google, type gmail_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { decryptSecret } from "./crypto";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/**
 * Gmail is a Google "restricted" scope: offering it publicly requires a paid annual security assessment.
 * Until then it's only requested for accounts listed in GMAIL_BETA_EMAILS (max 100 Google test users).
 */
export function gmailAllowed(email: string | null | undefined) {
  const list = (process.env.GMAIL_BETA_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

export function googleScopes(withGmail: boolean) {
  return ["openid", "email", CALENDAR_SCOPE, ...(withGmail ? [GMAIL_SCOPE] : [])];
}
export const hasGmail = (scopes: string | null | undefined) => (scopes ?? "").includes("gmail.readonly");
export const hasCalendar = (scopes: string | null | undefined) => (scopes ?? "").includes("calendar.readonly");

const FIRST_SYNC_DAYS = 180;
const MAX_MESSAGES_PER_RUN = 2000;
const MAX_MEETING_GUESTS = 8; // bigger events are classes/all-hands, not relationships
const AUTOMATED = /(no-?reply|do-?not-?reply|notifications?|mailer-daemon|postmaster|bounces?|alerts?|newsletter|calendar-server|resource\.calendar)/i;

export function oauthClient(origin: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/google/callback`,
  );
}

// ---------- contact matching ----------

/** "Jakia Johnson, MBA CPA" -> "jakia johnson"; first + last word only. */
function nameKey(name: string | null | undefined): string | null {
  const words = (name ?? "")
    .split(",")[0]
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length >= 2 ? `${words[0]} ${words[words.length - 1]}` : null;
}

type Person = { email: string; name: string | null };

class ContactMatcher {
  private byEmail = new Map<string, string>();
  private byName = new Map<string, string[]>();
  learned = 0;
  created = 0;

  constructor(private db: SupabaseClient, private userId: string) {}

  async load() {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.db.from("contacts").select("id, first_name, last_name, email")
        .eq("user_id", this.userId).range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const c of data) {
        if (c.email) this.byEmail.set(c.email.toLowerCase(), c.id);
        const k = nameKey(`${c.first_name} ${c.last_name}`);
        if (k) this.byName.set(k, [...(this.byName.get(k) ?? []), c.id]);
      }
      if (data.length < 1000) break;
    }
    return this;
  }

  /** Match by email, else by a unique name (and remember their email). Optionally create a new contact. */
  async match(p: Person, source: "gmail" | "calendar", create: boolean): Promise<string | null> {
    const email = p.email.toLowerCase();
    const hit = this.byEmail.get(email);
    if (hit) return hit;

    const k = nameKey(p.name);
    const candidates = k ? this.byName.get(k) ?? [] : [];
    if (candidates.length === 1) {
      const id = candidates[0];
      await this.db.from("contacts").update({ email }).eq("id", id).is("email", null);
      this.byEmail.set(email, id);
      this.learned++;
      return id;
    }
    if (!create || AUTOMATED.test(email)) return null;

    const words = (p.name ?? "").split(",")[0].trim().split(/\s+/).filter(Boolean);
    const { data, error } = await this.db.from("contacts").insert({
      user_id: this.userId,
      first_name: words[0] ?? email.split("@")[0],
      last_name: words.slice(1).join(" "),
      email,
      source,
      company: companyFromEmail(email),
    }).select("id").single();
    if (error) throw new Error(error.message);
    this.byEmail.set(email, data.id);
    if (k) this.byName.set(k, [data.id]);
    this.created++;
    return data.id;
  }
}

const FREEMAIL = /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail)\./i;
function companyFromEmail(email: string): string | null {
  const domain = email.split("@")[1] ?? "";
  if (!domain || FREEMAIL.test(domain) || domain.endsWith(".edu")) return null;
  const base = domain.split(".").slice(-2, -1)[0];
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : null;
}

// ---------- helpers ----------

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

/** Parse `"Jane Doe" <jane@x.com>, bob@y.com` into people. */
function parseAddresses(header: string | null | undefined): Person[] {
  if (!header) return [];
  const parts = header.match(/(?:"[^"]*"|[^,])+/g) ?? [];
  return parts.flatMap((part) => {
    const angle = part.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
    if (angle) return [{ name: angle[1].trim() || null, email: angle[2].trim().toLowerCase() }];
    const bare = part.trim().toLowerCase();
    return bare.includes("@") ? [{ name: null, email: bare }] : [];
  });
}

const header = (m: gmail_v1.Schema$Message, name: string) =>
  m.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;

const decode = (data: string) => Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function bodyText(part: gmail_v1.Schema$MessagePart | undefined): { plain: string; html: string } {
  if (!part) return { plain: "", html: "" };
  if (part.mimeType === "text/plain" && part.body?.data) return { plain: decode(part.body.data), html: "" };
  if (part.mimeType === "text/html" && part.body?.data) return { plain: "", html: decode(part.body.data) };
  let plain = "", html = "";
  for (const p of part.parts ?? []) {
    const r = bodyText(p);
    plain ||= r.plain;
    html ||= r.html;
  }
  return { plain, html };
}

/** Readable body without quoted reply history or signatures' worth of noise. */
function cleanBody(m: gmail_v1.Schema$Message): string {
  const { plain, html } = bodyText(m.payload);
  const text = plain || html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const kept: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^On .+wrote:\s*$/.test(line) || /^-{2,}\s*Original Message/i.test(line) || (kept.length > 0 && /^From: .+/.test(line))) break;
    if (line.startsWith(">")) continue;
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000) || (m.snippet ?? "");
}

// ---------- Gmail ----------

async function syncGmail(db: SupabaseClient, userId: string, auth: OAuth2Client, since: Date | null, matcher: ContactMatcher) {
  const gmail = google.gmail({ version: "v1", auth });
  const me = (await gmail.users.getProfile({ userId: "me" })).data.emailAddress!.toLowerCase();

  const after = since ? new Date(since.getTime() - 86_400_000) : new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000);
  const q = `after:${Math.floor(after.getTime() / 1000)} -category:promotions -category:social -category:updates -category:forums -in:chats`;

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({ userId: "me", q, maxResults: 500, pageToken });
    ids.push(...(res.data.messages ?? []).map((m) => m.id!));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && ids.length < MAX_MESSAGES_PER_RUN);

  // Pass 1: cheap headers only, to decide who each message is with.
  const metas = await pool(ids.slice(0, MAX_MESSAGES_PER_RUN), 10, async (id) =>
    (await gmail.users.messages.get({
      userId: "me", id, format: "metadata",
      metadataHeaders: ["From", "To", "Cc", "Subject", "Date", "List-Unsubscribe", "Precedence", "Auto-Submitted"],
    })).data);

  const relevant: { id: string; contactIds: string[]; outbound: boolean; at: string; subject: string | null }[] = [];
  for (const m of metas) {
    if (header(m, "List-Unsubscribe") || /bulk|list/i.test(header(m, "Precedence") ?? "")) continue;
    const auto = header(m, "Auto-Submitted");
    if (auto && auto.toLowerCase() !== "no") continue;

    const from = parseAddresses(header(m, "From"))[0];
    if (!from) continue;
    const outbound = from.email === me || (m.labelIds ?? []).includes("SENT");
    const others = (outbound ? [...parseAddresses(header(m, "To")), ...parseAddresses(header(m, "Cc"))] : [from])
      .filter((p) => p.email !== me && !AUTOMATED.test(p.email));
    if (!others.length) continue;

    const contactIds: string[] = [];
    for (const p of others) {
      // People you write to directly are relationships, even if they aren't in Orbit yet.
      const id = await matcher.match(p, "gmail", outbound && others.length <= 3);
      if (id && !contactIds.includes(id)) contactIds.push(id);
    }
    if (contactIds.length) {
      relevant.push({
        id: m.id!, contactIds, outbound,
        at: new Date(Number(m.internalDate)).toISOString(),
        subject: header(m, "Subject"),
      });
    }
  }

  // Pass 2: full bodies only for messages with people you know.
  const bodies = await pool(relevant, 8, async (r) =>
    cleanBody((await gmail.users.messages.get({ userId: "me", id: r.id, format: "full" })).data));

  const rows = relevant.flatMap((r, i) => r.contactIds.map((contact_id) => ({
    user_id: userId,
    contact_id,
    kind: "email",
    direction: r.outbound ? "out" : "in",
    occurred_at: r.at,
    subject: r.subject,
    body: bodies[i],
    external_id: r.id,
  })));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("interactions")
      .upsert(rows.slice(i, i + 500), { onConflict: "user_id,contact_id,kind,external_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  return { scanned: metas.length, emails: rows.length };
}

// ---------- Calendar ----------

async function syncCalendar(db: SupabaseClient, userId: string, auth: OAuth2Client, since: Date | null, matcher: ContactMatcher) {
  const calendar = google.calendar({ version: "v3", auth });
  const now = Date.now();
  const timeMin = new Date(since ? now - 14 * 86_400_000 : now - FIRST_SYNC_DAYS * 86_400_000).toISOString();
  const timeMax = new Date(now + 30 * 86_400_000).toISOString();

  const events = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId: "primary", timeMin, timeMax, singleEvents: true, orderBy: "startTime", maxResults: 2500, pageToken,
    });
    events.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  let meetings = 0, logged = 0;
  for (const ev of events) {
    if (ev.status === "cancelled" || !ev.start?.dateTime || !ev.end?.dateTime) continue; // skip all-day blocks
    const self = ev.attendees?.find((a) => a.self);
    if (self?.responseStatus === "declined") continue;
    const guests = (ev.attendees ?? []).filter((a) => !a.self && !a.resource && a.email && !AUTOMATED.test(a.email));
    if (!guests.length || guests.length > MAX_MEETING_GUESTS) continue;

    const contactIds: string[] = [];
    for (const g of guests) {
      const id = await matcher.match({ email: g.email!.toLowerCase(), name: g.displayName ?? null }, "calendar", guests.length <= 3);
      if (id && !contactIds.includes(id)) contactIds.push(id);
    }

    // Only Google-owned fields, so a generated prep brief and your debrief flag survive re-syncs.
    const { error } = await db.from("meetings").upsert({
      user_id: userId,
      google_event_id: ev.id!,
      title: ev.summary ?? "(no title)",
      description: ev.description?.slice(0, 4000) ?? null,
      location: ev.location ?? ev.hangoutLink ?? null,
      start_at: ev.start.dateTime,
      end_at: ev.end.dateTime,
      attendees: guests.map((g) => ({ email: g.email, name: g.displayName ?? null })),
      contact_ids: contactIds,
    }, { onConflict: "user_id,google_event_id" });
    if (error) throw new Error(error.message);
    meetings++;

    if (Date.parse(ev.end.dateTime) < now && contactIds.length) {
      const desc = (ev.description ?? "").replace(/<[^>]+>/g, " ").trim().slice(0, 1500);
      await db.from("interactions").upsert(contactIds.map((contact_id) => ({
        user_id: userId,
        contact_id,
        kind: "meeting",
        occurred_at: ev.start!.dateTime!,
        subject: ev.summary ?? "Meeting",
        body: desc || (ev.summary ?? "Meeting"),
        external_id: ev.id!,
      })), { onConflict: "user_id,contact_id,kind,external_id", ignoreDuplicates: true });
      logged += contactIds.length;
    }
  }
  return { meetings, logged };
}

// ---------- entry point ----------

export type SyncSummary = {
  ok: boolean;
  error?: string;
  emails?: number;
  scanned?: number;
  meetings?: number;
  learnedEmails?: number;
  newContacts?: number;
};

export async function syncGoogle(userId: string): Promise<SyncSummary> {
  const db = createAdminClient();
  const { data: acct } = await db.from("google_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (!acct) return { ok: false, error: "Google isn't connected yet." };

  const auth = oauthClient("http://unused"); // redirect URI isn't needed to refresh tokens

  try {
    auth.setCredentials({ refresh_token: decryptSecret(acct.refresh_token) });
    const matcher = await new ContactMatcher(db, userId).load();
    let g = { emails: 0, scanned: 0 };
    if (hasGmail(acct.scopes)) {
      g = await syncGmail(db, userId, auth, acct.last_gmail_sync ? new Date(acct.last_gmail_sync) : null, matcher);
      await db.from("google_accounts").update({ last_gmail_sync: new Date().toISOString() }).eq("user_id", userId);
    }
    const c = await syncCalendar(db, userId, auth, acct.last_calendar_sync ? new Date(acct.last_calendar_sync) : null, matcher);
    await db.from("google_accounts")
      .update({ last_calendar_sync: new Date().toISOString(), needs_reconnect: false, last_error: null })
      .eq("user_id", userId);
    return { ok: true, emails: g.emails, scanned: g.scanned, meetings: c.meetings, learnedEmails: matcher.learned, newContacts: matcher.created };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Apps in Google's "Testing" mode get refresh tokens that expire after 7 days.
    const expired = /invalid_grant|unauthorized_client|Token has been expired or revoked/i.test(msg);
    await db.from("google_accounts").update({ needs_reconnect: expired, last_error: msg.slice(0, 500) }).eq("user_id", userId);
    return { ok: false, error: expired ? "Google access expired. Tap Reconnect Google." : msg };
  }
}
