import { setAIEnabled } from "../account-actions";

/** Plain-language answer to "what does the AI see?", with the student's own off switch. */
export function PrivacyAI({ enabled }: { enabled: boolean }) {
  return (
    <section className="space-y-3 rounded-lg border border-line bg-card p-4 text-sm">
      <div>
        <h2 className="font-semibold">Your data and AI</h2>
        <p className="mt-1 text-muted">
          Your network is visible only to you. When you use an AI feature, Orbit sends the AI provider (Anthropic) only
          what that task needs, such as the notes and messages for one person when it writes a memory or a draft. It is
          not used to train AI models, it is never sold, and no ads are built from it. Orbit never messages anyone for you.
        </p>
      </div>
      <form action={setAIEnabled.bind(null, !enabled)} className="flex items-center justify-between gap-3">
        <p className="font-medium">AI features: {enabled ? "On" : "Off"}</p>
        <button className="rounded-md border border-line bg-card px-4 py-2 font-medium">
          {enabled ? "Turn off" : "Turn on"}
        </button>
      </form>
      {!enabled && <p className="text-muted">While AI is off, nothing is sent to the AI provider. The rest of Orbit keeps working.</p>}
    </section>
  );
}
