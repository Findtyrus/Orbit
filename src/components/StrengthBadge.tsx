import type { Strength } from "@/lib/types";

// Strength is shown by weight, not color: solid for your strongest relationships, fading to gray.
const STYLE: Record<Strength, string> = {
  Strong: "border-ink bg-ink text-bg",
  Warm: "border-ink text-ink",
  Developing: "border-line-strong text-muted",
  New: "border-line text-faint",
  Dormant: "border-line text-faint",
};

export function StrengthBadge({ strength, score }: { strength: Strength; score?: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium tabular-nums ${STYLE[strength]}`}>
      {strength}{score !== undefined && strength !== "New" && <span className="opacity-60">{score}</span>}
    </span>
  );
}
