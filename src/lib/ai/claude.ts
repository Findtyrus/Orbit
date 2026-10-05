import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  AskSchema, MeetingPrepSchema, MemorySchema,
  type AIService, type AskAnswer, type AskInput, type MeetingPrep, type Memory, type MemoryInput, type PrepInput,
} from "./service";

const MODEL = "claude-opus-5-5";
// Memories are the bulk of AI spend; set MEMORY_MODEL (e.g. claude-sonnet-5-5) to trade quality for cost.
const MEMORY_MODEL = process.env.MEMORY_MODEL || MODEL;
// Re-run a policy-declined request on Anthropic's recommended fallback model instead of failing.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

// Applies to every response: these read as machine-written, especially in messages the owner sends.
const STYLE = `Write plainly. Never use em dashes or en dashes; use commas, periods, colons or parentheses instead.`;

/** Safety net for the style rule: strip any dashes that slip through, recursively over the parsed output. */
function undash<T>(v: T): T {
  if (typeof v === "string") {
    return v
      .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2") // ranges: 2–8 -> 2 to 8
      .replace(/\s*[\u2013\u2014]\s*/g, ", ")
      .replace(/,\s*([.,;:!?])/g, "$1") as T;
  }
  if (Array.isArray(v)) return v.map(undash) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, undash(x)])) as T;
  }
  return v;
}

const MEMORY_SYSTEM = `You maintain a personal relationship memory for the owner of a networking app.
Given everything on file about one person - profile fields, the owner's private notes, and a chronological
timeline of LinkedIn messages, emails, meetings, calls and notes - produce a structured memory the owner
can glance at on their phone before reaching out.

Ground every fact in the timeline or profile; never invent employers, dates, or commitments. If the
history is thin (for example, only a connection request), say so plainly and keep the lists short or empty.

Open loops are concrete outstanding commitments from either side ("send my resume", "reach back out in
January", "I'll intro you to X"). Leave out anything already resolved later in the timeline, and anything
in the closed-loops list. Resolve relative dates ("next month", "after the holidays") against the
message's date.

The suggested message is a draft the owner will edit and send themselves. Write it in the owner's voice
as reflected in their own messages: specific to this history, warm, brief (LinkedIn-DM length), and with
no placeholders. If there is nothing natural to say yet, draft a short, genuine first touchpoint
grounded in the person's background and the owner's goals.

The owner is usually a student recruiting into finance or accounting, where coffee chats lead to referrals.
If the latest interaction is a call or meeting from the last two days and no thank-you followed it, the next
step is a short thank-you that mentions one specific thing they said. After a good conversation, a natural
later step is a brief update on what the owner did with their advice, and - once the relationship is warm and
the owner is applying there - asking whether they'd be open to a referral.`;

const ASK_SYSTEM = `You help the owner of a personal networking app reason about their professional network.
You get the owner's background and goals, then a roster with one line per person (ref, name, role, company,
relationship strength and score, last contact, tags, and a memory summary when one exists).

Answer only from the roster. Recommend specific people by their ref, strongest relevant relationships
first, and say when the network has no good match rather than stretching. Suggested actions should be
concrete and respectful of the relationship's current strength.`;

const PREP_SYSTEM = `You write a short pre-meeting brief the owner reads on their phone an hour before a meeting.
Use only what's in the meeting details, the attendee memories and recent history. Keep it skimmable and
specific to these people; skip generic advice. If there's little history, say so and lean on their role
and the owner's goals for the questions.`;

function meBlock(me: { name: string; about: string; goals: string }) {
  return `About the owner (${me.name}):\n${me.about || "(not filled in)"}\n\nTheir current goals:\n${me.goals || "(not filled in)"}`;
}

export class ClaudeService implements AIService {
  private client = new Anthropic();

  async buildMemory(input: MemoryInput): Promise<Memory> {
    const p = input.person;
    const timeline = input.timeline.length
      ? input.timeline
          .map((t) => {
            const who = t.from === "me" ? input.me.name : t.from === "them" ? p.name : "Private note";
            return `[${t.at.slice(0, 10)}] ${t.kind} · ${who}${t.subject ? ` · ${t.subject}` : ""}\n${t.body}`;
          })
          .join("\n\n")
      : "(no interactions yet)";

    const response = await this.client.beta.messages.parse({
      model: MEMORY_MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium", format: betaZodOutputFormat(MemorySchema) },
      system: [{ type: "text", text: `${MEMORY_SYSTEM}\n\n${STYLE}`, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `Today is ${input.today}.

${meBlock(input.me)}

Person: ${p.name}
Role: ${[p.title, p.company].filter(Boolean).join(" at ") || "unknown"}
Coffee-chat stage: ${p.stage ?? "New"}
Connected on LinkedIn: ${p.connectedOn ?? "unknown"}
Owner's private notes: ${p.myNotes || "(none)"}

Closed loops (already handled - do not list again):
${input.closedLoops.length ? input.closedLoops.map((l) => `- ${l}`).join("\n") : "(none)"}

Timeline, oldest first:
${timeline}`,
      }],
    });
    if (response.stop_reason === "refusal") throw new Error("The model declined to summarize this contact.");
    if (!response.parsed_output) throw new Error(`No memory returned (stop reason: ${response.stop_reason}).`);
    return undash(response.parsed_output);
  }

  async askNetwork(input: AskInput): Promise<AskAnswer> {
    const response = await this.client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium", format: betaZodOutputFormat(AskSchema) },
      system: [
        { type: "text", text: `${ASK_SYSTEM}\n\n${STYLE}` },
        // The roster is large and changes rarely, so cache it across questions.
        { type: "text", text: `${meBlock(input.me)}\n\nRoster:\n${input.roster}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: `Today is ${input.today}.\n\n${input.question}` }],
    });
    if (response.stop_reason === "refusal") throw new Error("The model declined to answer that question.");
    if (!response.parsed_output) throw new Error(`No answer returned (stop reason: ${response.stop_reason}).`);
    return undash(response.parsed_output);
  }

  async prepMeeting(input: PrepInput): Promise<MeetingPrep> {
    const people = input.attendees.map((a) => {
      const recent = a.recent.map((t) => `  [${t.at.slice(0, 10)}] ${t.kind} · ${t.from === "me" ? input.me.name : t.from === "them" ? a.name : "note"}: ${t.body.slice(0, 600)}`).join("\n");
      return `## ${a.name}, ${a.role} (${a.strength})
Memory: ${a.memory ?? "(none yet)"}
Open loops: ${a.openLoops.length ? a.openLoops.join("; ") : "(none)"}
Recent history:
${recent || "  (none)"}`;
    }).join("\n\n");

    const response = await this.client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium", format: betaZodOutputFormat(MeetingPrepSchema) },
      system: [{ type: "text", text: `${PREP_SYSTEM}\n\n${STYLE}`, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `Today is ${input.today}.

${meBlock(input.me)}

Meeting: ${input.meeting.title}
When: ${input.meeting.start}
Where: ${input.meeting.location ?? "unspecified"}
Details: ${input.meeting.description?.slice(0, 2000) || "(none)"}

Attendees:
${people || "(no known attendees)"}`,
      }],
    });
    if (response.stop_reason === "refusal") throw new Error("The model declined to write this brief.");
    if (!response.parsed_output) throw new Error(`No brief returned (stop reason: ${response.stop_reason}).`);
    return undash(response.parsed_output);
  }
}
