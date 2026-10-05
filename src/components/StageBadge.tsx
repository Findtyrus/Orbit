const STAGE_STYLE: Record<string, string> = {
  Researching: "border-line text-faint",
  Networking: "border-line-strong text-muted",
  Referral: "border-ink text-ink",
  Applied: "border-ink text-ink",
  Interviewing: "border-ink bg-ink text-bg",
  Offer: "border-good/40 bg-good-soft text-good",
  Closed: "border-line text-faint",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`shrink-0 rounded border px-1.5 py-px text-[11px] font-medium ${STAGE_STYLE[stage] ?? ""}`}>{stage}</span>
  );
}
