import "server-only";
import { cookies } from "next/headers";

/** The viewer's timezone, reported by their device (see TabBar). Falls back to Central for first loads. */
export async function userTimeZone() {
  const tz = (await cookies()).get("tz")?.value;
  try {
    if (tz) new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz || "America/Chicago";
  } catch {
    return "America/Chicago";
  }
}

/** Formatters bound to a timezone, so server-rendered times match the user's clock. */
export function inZone(tz: string) {
  return {
    day: (d: string | Date) => new Date(d).toLocaleDateString("en-CA", { timeZone: tz }),
    time: (d: string | Date) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }),
    date: (d: string | Date, o: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString("en-US", { ...o, timeZone: tz }),
    hour: (d: string | Date) => Number(new Date(d).toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz })),
  };
}
