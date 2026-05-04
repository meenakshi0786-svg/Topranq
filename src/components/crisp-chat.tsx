"use client";

import { useEffect, useState } from "react";

const CRISP_WEBSITE_ID = "b7f5d786-42bc-4f2f-a102-4148bbe75491";
const BUTTON_LABEL = "Ask Ranq";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export function CrispChat() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("crisp-chat-script")) {
      setLoaded(true);
      return;
    }

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // Hide the default Crisp bubble — we use our own custom button
    (window.$crisp as unknown[]).push(["safe", true]);
    (window.$crisp as unknown[]).push(["do", "chat:hide"]);
    (window.$crisp as unknown[]).push(["on", "chat:closed", () => {
      (window.$crisp as unknown[]).push(["do", "chat:hide"]);
    }]);

    const script = document.createElement("script");
    script.id = "crisp-chat-script";
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    // After Crisp loads, try to identify the logged-in user
    const hasLoginCookie = document.cookie.includes("logged_in=1");
    if (hasLoginCookie) {
      fetch("/api/credits")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || !data.email || data.isDemo) return;
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

  function openChat() {
    if (typeof window === "undefined") return;
    (window.$crisp as unknown[]).push(["do", "chat:show"]);
    (window.$crisp as unknown[]).push(["do", "chat:open"]);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .crisp-client #crisp-chatbox > div > a[class*="cc-"] { display: none !important; }
        @keyframes ranq-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      ` }} />

      <button
        onClick={openChat}
        aria-label="Open chat support"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: loaded ? "flex" : "none",
          alignItems: "center",
          gap: 10,
          padding: "14px 22px 14px 18px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg, #4F6EF7 0%, #7C5CFC 100%)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          boxShadow: "0 8px 24px rgba(79, 110, 247, 0.35), 0 4px 8px rgba(124, 92, 252, 0.2)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(79, 110, 247, 0.45), 0 6px 12px rgba(124, 92, 252, 0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0) scale(1)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(79, 110, 247, 0.35), 0 4px 8px rgba(124, 92, 252, 0.2)";
        }}
      >
        {/* Animated dot */}
        <span style={{ position: "relative", width: 10, height: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{
            position: "absolute", width: 10, height: 10, borderRadius: "50%",
            background: "#22ee88", opacity: 0.7,
            animation: "ranq-ping 1.6s cubic-bezier(0,0,.2,1) infinite",
          }} />
          <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "#22ee88" }} />
        </span>

        {/* Logo mini */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>

        <span>{BUTTON_LABEL}</span>
      </button>
    </>
  );
}
