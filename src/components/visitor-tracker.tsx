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

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        visitorId,
        sessionId,
        referer: document.referrer || "",
      }),
      keepalive: true,
    }).catch(() => { /* silent — tracking should never break UX */ });
  }, [pathname]);

  return null;
}
