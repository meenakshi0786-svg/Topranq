"use client";

import { useState } from "react";

interface Props {
  source?: string;
  variant?: "default" | "footer";
}

export function NewsletterSignup({ source = "landing", variant = "default" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to subscribe");
        setStatus("error");
        return;
      }
      setStatus(data.alreadySubscribed ? "already" : "success");
      setEmail("");
    } catch {
      setErrMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success" || status === "already") {
    return (
      <div style={{
        padding: "20px 24px", borderRadius: 14,
        background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
        border: "1px solid #86efac",
        textAlign: "center",
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>
          {status === "already" ? "You're already on the list" : "You're in!"}
        </p>
        <p style={{ fontSize: 12, color: "#166534", margin: 0, opacity: 0.85 }}>
          {status === "already" ? "We'll keep you posted." : "Thanks for subscribing — check your inbox for a welcome note."}
        </p>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <form onSubmit={submit} style={{ display: "flex", gap: 8, maxWidth: 360 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "loading"}
          style={{
            flex: 1, fontSize: 13, padding: "10px 14px", borderRadius: 10,
            border: "1px solid var(--border-light)", background: "#fff",
            outline: "none", color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          style={{
            fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10,
            background: "var(--accent)", color: "#fff", border: "none",
            cursor: status === "loading" ? "wait" : "pointer",
            opacity: status === "loading" ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
        {status === "error" && (
          <p style={{ position: "absolute", marginTop: 50, fontSize: 11, color: "#dc2626" }}>{errMsg}</p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        background: "#fff",
        borderRadius: 14,
        boxShadow: "var(--shadow-lg)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}>
        <div style={{ paddingLeft: 16, color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "loading"}
          style={{
            flex: 1, fontSize: 14, padding: "16px 14px",
            background: "transparent", border: "none", outline: "none",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          style={{
            fontSize: 14, fontWeight: 600, padding: "14px 24px", margin: 4,
            borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)",
            color: "#fff",
            cursor: status === "loading" ? "wait" : "pointer",
            opacity: status === "loading" || !email.trim() ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </div>
      {status === "error" && (
        <p style={{ fontSize: 12, color: "#dc2626", marginTop: 8, textAlign: "center" }}>{errMsg}</p>
      )}
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, textAlign: "center" }}>
        Weekly tips on AI SEO, GEO, and what ChatGPT is citing. No spam.
      </p>
    </form>
  );
}
