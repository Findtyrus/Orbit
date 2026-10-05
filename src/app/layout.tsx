import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Orbit",
  description: "Stay close to the people who matter.",
  appleWebApp: { capable: true, title: "Orbit", statusBarStyle: "default" },
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
  // "light" | "dark" pins the theme; anything else follows the phone's setting.
  const pref = (await cookies()).get("theme")?.value;
  const theme = pref === "light" || pref === "dark" ? pref : undefined;
  return (
    <html lang="en" data-theme={theme} className={`${instrument.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
