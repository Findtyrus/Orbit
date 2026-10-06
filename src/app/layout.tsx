import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });

const SITE = "https://buildyourorbit.com";
const TAGLINE = "The networking app for finance and accounting students. Your career has gravity.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Orbit",
  description: TAGLINE,
  appleWebApp: { capable: true, title: "Orbit", statusBarStyle: "default" },
  // Link previews on texts, LinkedIn, Instagram DMs and Slack.
  openGraph: { type: "website", siteName: "Orbit", url: SITE, title: "Orbit | Your career has gravity", description: TAGLINE,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Orbit, the networking app for finance and accounting students" }] },
  twitter: { card: "summary_large_image", title: "Orbit | Your career has gravity", description: TAGLINE, images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Light by default. "dark" pins dark mode; "system" follows the phone's setting.
  const pref = (await cookies()).get("theme")?.value;
  const theme = pref === "dark" ? "dark" : pref === "system" ? undefined : "light";
  return (
    <html lang="en" data-theme={theme} className={`${instrument.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
