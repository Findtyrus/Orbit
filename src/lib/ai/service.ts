import { z } from "zod";

/**
 * Provider-agnostic AI surface. The app only talks to this interface;
 * `getAI()` picks the implementation (Claude today).
 */
export interface AIService {
  /** Rebuild one person's living memory from their whole history. */
  buildMemory(input: MemoryInput): Promise<Memory>;
  /** Answer a question about the whole network. */
  askNetwork(input: AskInput): Promise<AskAnswer>;
  /** Brief for an upcoming meeting. */
  prepMeeting(input: PrepInput): Promise<MeetingPrep>;
  /** One outreach draft (cold intro, follow-up, or check-in) for the daily queue. */
  draftOutreach(input: OutreachInput): Promise<OutreachDraft>;
}

export type OutreachInput = {
  today: string;
  me: { name: string; about: string; goals: string };
  kind: "intro" | "follow_up" | "check_in";
  channel: "linkedin" | "email";
  person: { name: string; title: string | null; company: string | null; isTargetFirm: boolean };
  memory: string | null;        // relationship summary, if built
  recent: TimelineEntry[];      // newest last
};

export const OutreachSchema = z.object({
  subject: z.string().describe("Email subject line, under 60 characters. Empty string for LinkedIn."),
  body: z.string().describe("The message, ready to send after a quick read."),
});
export type OutreachDraft = z.infer<typeof OutreachSchema>;

export type PrepInput = {
  today: string;
  me: { name: string; about: string; goals: string };
  meeting: { title: string; start: string; description: string | null; location: string | null };
  attendees: {
    name: string;
    role: string;
    strength: string;
    memory: string | null; // synopsis + facts, if built
    openLoops: string[];
    recent: TimelineEntry[]; // newest last
  }[];
};

export const MeetingPrepSchema = z.object({
  purpose: z.string().describe("Why this meeting is happening and what a good outcome looks like, 1-2 sentences."),
  context: z.array(z.string()).describe("What to remember going in: last interaction, key facts, anything you owe them."),
  your_angle: z.string().describe("Which parts of the owner's background are most relevant to bring up."),
  questions: z.array(z.string()).describe("3-5 specific, non-generic questions worth asking."),
  follow_up: z.string().describe("What to do right after (e.g. thank-you note within 4 hours mentioning X)."),
});
export type MeetingPrep = z.infer<typeof MeetingPrepSchema>;

export type TimelineEntry = {
  at: string; // ISO
  kind: string;
  from: "me" | "them" | "note";
  subject?: string | null;
  body: string;
};

export type MemoryInput = {
  today: string;
  me: { name: string; about: string; goals: string };
  person: {
    name: string;
    title: string | null;
    company: string | null;
    connectedOn: string | null;
    myNotes: string | null;
    stage?: string | null;
  };
  timeline: TimelineEntry[];
  closedLoops: string[]; // already done / dismissed — don't recreate
};

export const MemorySchema = z.object({
  summary: z.string().describe("3-5 sentence relationship synopsis: who they are, why you connected, where things stand."),
  facts: z.object({
    career: z.array(z.string()).describe("Their career path and current role, as stated or clearly shown."),
    they_told_you: z.array(z.string()),
    you_told_them: z.array(z.string()),
    advice_given: z.array(z.string()).describe("Concrete advice they gave you."),
    personal: z.array(z.string()).describe("Personal details worth remembering (hometown, school, family, interests)."),
  }),
  open_loops: z.array(
    z.object({
      text: z.string().describe("Short imperative, e.g. 'Send resume to Mark'."),
      owner: z.enum(["me", "them"]).describe("'me' if the account owner owes it, 'them' if the contact does."),
      due_on: z.string().nullable().describe("YYYY-MM-DD if a time was stated or implied, else null."),
    }),
  ),
  talking_points: z.array(z.string()).describe("2-4 things worth bringing up next conversation."),
  next_step: z.string().describe("The single best next action, one sentence."),
  why_now: z.string().describe("One sentence on why this action matters now (or 'No rush' if it doesn't)."),
  follow_up_on: z.string().nullable().describe("YYYY-MM-DD when the next touchpoint makes sense, else null."),
  suggested_message: z.string().describe("A ready-to-edit message in the owner's voice for the next step."),
  tags: z.array(z.string()).describe("1-4 short group labels for this person, e.g. 'Audit → TAS → IB', 'Search funds', 'MSU alumni'."),
});
export type Memory = z.infer<typeof MemorySchema>;

export type AskInput = {
  today: string;
  me: { name: string; about: string; goals: string };
  roster: string; // one line per person, keyed by a short ref like "#12"
  question: string;
};

export const AskSchema = z.object({
  answer: z.string().describe("Direct answer in 2-6 sentences."),
  people: z.array(
    z.object({
      ref: z.string().describe("The person's roster ref, e.g. '#12'."),
      why: z.string().describe("Why this person is relevant, grounded in the roster."),
      action: z.string().describe("Suggested next action with this person."),
    }),
  ).describe("Most relevant people first; at most 8."),
});
export type AskAnswer = z.infer<typeof AskSchema>;

let instance: AIService | null = null;
export async function getAI(): Promise<AIService> {
  if (!instance) {
    const { ClaudeService } = await import("./claude");
    instance = new ClaudeService();
  }
  return instance;
}
