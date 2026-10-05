import JSZip from "jszip";
import Papa from "papaparse";

/** Parsed contents of a LinkedIn data export ("Get a copy of your data"). */
export type LinkedInExport = {
  connections: LinkedInConnection[];
  messages: LinkedInMessage[];
  meSlug: string | null;
  profile: { name: string; headline: string; summary: string } | null;
};

export type LinkedInConnection = {
  slug: string;
  url: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
  connectedOn: string | null; // YYYY-MM-DD
};

export type LinkedInMessage = {
  conversationId: string;
  fromName: string;
  fromSlug: string | null;
  toNames: string[];
  toSlugs: string[];
  sentAt: string; // ISO
  subject: string | null;
  content: string;
};

/** "https://www.linkedin.com/in/Jane-Doe-123/" -> "jane-doe-123" */
export function slugFromUrl(url: string | undefined | null): string | null {
  const m = (url ?? "").match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** "03 Oct 2026" -> "2026-10-03" */
function parseConnectedOn(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2}) (\w{3}) (\d{4})$/);
  if (!m || !MONTHS[m[2].toLowerCase()]) return null;
  return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
}

function parseCsv(text: string): Record<string, string>[] {
  return Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true }).data;
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function parseConnections(text: string): LinkedInConnection[] {
  // LinkedIn prefixes the file with a few "Notes:" lines before the real header.
  const start = text.indexOf("First Name,");
  const rows = parseCsv(start >= 0 ? text.slice(start) : text);
  const out: LinkedInConnection[] = [];
  for (const r of rows) {
    const slug = slugFromUrl(r["URL"]);
    if (!slug) continue;
    out.push({
      slug,
      url: r["URL"].trim(),
      firstName: (r["First Name"] ?? "").trim(),
      lastName: (r["Last Name"] ?? "").trim(),
      email: (r["Email Address"] ?? "").trim() || null,
      company: (r["Company"] ?? "").trim() || null,
      title: (r["Position"] ?? "").trim() || null,
      connectedOn: parseConnectedOn(r["Connected On"] ?? ""),
    });
  }
  return out;
}

export function parseMessages(text: string): LinkedInMessage[] {
  const out: LinkedInMessage[] = [];
  for (const r of parseCsv(text)) {
    const date = (r["DATE"] ?? "").replace(" UTC", "Z").replace(" ", "T");
    if (!date || Number.isNaN(Date.parse(date))) continue;
    const content = stripHtml(r["CONTENT"] ?? "");
    if (!content) continue;
    out.push({
      conversationId: r["CONVERSATION ID"] ?? "",
      fromName: (r["FROM"] ?? "").trim(),
      fromSlug: slugFromUrl(r["SENDER PROFILE URL"]),
      toNames: (r["TO"] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      toSlugs: (r["RECIPIENT PROFILE URLS"] ?? "")
        .split(",")
        .map((u) => slugFromUrl(u))
        .filter((s): s is string => !!s),
      sentAt: new Date(date).toISOString(),
      subject: (r["SUBJECT"] ?? "").trim() || null,
      content,
    });
  }
  return out;
}

/** Accepts the export .zip, or Connections.csv / messages.csv uploaded directly. */
export async function readLinkedInFiles(files: File[]): Promise<LinkedInExport> {
  let connectionsText = "";
  let messagesText = "";
  let profileText = "";

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      for (const entry of Object.values(zip.files)) {
        const base = entry.name.split("/").pop()?.toLowerCase();
        if (base === "connections.csv") connectionsText = await entry.async("string");
        if (base === "messages.csv") messagesText = await entry.async("string");
        if (base === "profile.csv") profileText = await entry.async("string");
      }
    } else if (name.endsWith("connections.csv")) {
      connectionsText = await file.text();
    } else if (name.endsWith("messages.csv")) {
      messagesText = await file.text();
    }
  }

  const connections = connectionsText ? parseConnections(connectionsText) : [];
  const messages = messagesText ? parseMessages(messagesText) : [];

  // The account owner is whoever sends the most messages.
  const senders = new Map<string, number>();
  for (const m of messages) if (m.fromSlug) senders.set(m.fromSlug, (senders.get(m.fromSlug) ?? 0) + 1);
  const meSlug = [...senders.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const p = profileText ? parseCsv(profileText)[0] : undefined;
  const profile = p
    ? {
        name: `${p["First Name"] ?? ""} ${p["Last Name"] ?? ""}`.trim(),
        headline: stripHtml(p["Headline"] ?? ""),
        summary: stripHtml(p["Summary"] ?? ""),
      }
    : null;

  return { connections, messages, meSlug, profile };
}
