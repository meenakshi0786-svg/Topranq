"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "ranq_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip admin/api paths
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) return;

    const sessionId = getOrCreateSessionId();
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        sessionId,
        referer: document.referrer || "",
      }),
      keepalive: true,
    }).catch(() => { /* silent — tracking should never break UX */ });
  }, [pathname]);

  return null;
}
