"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getOrCreate(key: string, storage: Storage): string {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) return;

    // Persistent visitor ID (across sessions, days, weeks)
    const visitorId = getOrCreate("ranq_visitor_id", localStorage);
    // Per-browser-session ID (cleared when browser closes)
    const sessionId = getOrCreate("ranq_session_id", sessionStorage);

    // Capture UTM params from current URL or store from first visit in session
    const url = new URL(window.location.href);
    const currentUtmSource = url.searchParams.get("utm_source") || "";
    const currentUtmMedium = url.searchParams.get("utm_medium") || "";
    const currentUtmCampaign = url.searchParams.get("utm_campaign") || "";

    // Sticky UTMs: remember the FIRST attribution per session (don't overwrite)
    if (currentUtmSource && !sessionStorage.getItem("ranq_utm_source")) {
      sessionStorage.setItem("ranq_utm_source", currentUtmSource);
      sessionStorage.setItem("ranq_utm_medium", currentUtmMedium);
      sessionStorage.setItem("ranq_utm_campaign", currentUtmCampaign);
    }

    const utmSource = currentUtmSource || sessionStorage.getItem("ranq_utm_source") || "";
    const utmMedium = currentUtmMedium || sessionStorage.getItem("ranq_utm_medium") || "";
    const utmCampaign = currentUtmCampaign || sessionStorage.getItem("ranq_utm_campaign") || "";

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        visitorId,
        sessionId,
        referer: document.referrer || "",
        utmSource,
        utmMedium,
        utmCampaign,
      }),
      keepalive: true,
    }).catch(() => { /* silent — tracking should never break UX */ });
  }, [pathname]);

  return null;
}
