/** The Orbit mark: a ring with a planet riding it. The planet's halo is masked out, so the gap is truly transparent. */
export function Mark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <mask id="orbit-gap">
          <rect width="100" height="100" fill="white" />
          <circle cx="71.92" cy="28.08" r="13" fill="black" />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" strokeWidth="8" mask="url(#orbit-gap)" />
      <circle cx="71.92" cy="28.08" r="8.5" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <Mark size={size} />
      <span className="font-semibold tracking-[-0.03em]" style={{ fontSize: size * 0.95 }}>orbit</span>
    </span>
  );
}
