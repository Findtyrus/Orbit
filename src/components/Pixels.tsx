"use client";

import Script from "next/script";
import { useEffect } from "react";

const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
// Ids go into inline scripts, so only plain ids are accepted.
const META_OK = META && /^\d{5,20}$/.test(META);
const TIKTOK_OK = TIKTOK && /^[A-Z0-9]{8,32}$/.test(TIKTOK);

declare global {
  interface Window {
    fbq?: (...a: unknown[]) => void;
    ttq?: { track: (...a: unknown[]) => void };
  }
}

/** Meta and TikTok ad pixels. Each loads only when its id is set in the environment. */
export function Pixels() {
  return (
    <>
      {META_OK && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META}');fbq('track','PageView');`}</Script>
      )}
      {TIKTOK_OK && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=n,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]={};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${TIKTOK}');ttq.page()}(window,document,'ttq');`}</Script>
      )}
    </>
  );
}

/** Fires one conversion event (once per browser) when mounted, e.g. CompleteRegistration after sign-up. */
export function PixelEvent({ name, value }: { name: "CompleteRegistration" | "Subscribe"; value?: number }) {
  useEffect(() => {
    try {
      const key = `orbit_px_${name}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* storage blocked: fire anyway */
    }
    const extra = value ? { value, currency: "USD" } : undefined;
    window.fbq?.("track", name, extra);
    window.ttq?.track(name, extra);
  }, [name, value]);
  return null;
}
