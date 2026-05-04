"use client";

import { useEffect } from "react";

const CRISP_WEBSITE_ID = "b7f5d786-42bc-4f2f-a102-4148bbe75491";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export function CrispChat() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("crisp-chat-script")) return; // already loaded

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement("script");
    script.id = "crisp-chat-script";
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    // After Crisp loads, try to identify the logged-in user
    const hasLoginCookie = document.cookie.includes("logged_in=1");
    if (hasLoginCookie) {
      fetch("/api/credits")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || !data.email || data.isDemo) return;
          // Identify user in Crisp
          (window.$crisp as unknown[]).push(["set", "user:email", [data.email]]);
          if (data.name) {
            (window.$crisp as unknown[]).push(["set", "user:nickname", [data.name]]);
          }
          (window.$crisp as unknown[]).push([
            "set",
            "session:data",
            [[["plan", data.plan || "free"], ["articles_used", data.articles?.used || 0]]],
          ]);
        })
        .catch(() => { /* ignore */ });
    }
  }, []);

  return null;
}
