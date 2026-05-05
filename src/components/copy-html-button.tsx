"use client";

import { useState } from "react";

interface Props {
  /** HTML string to copy. Will be put on the clipboard as both `text/html` and `text/plain`. */
  html: string;
  /** Plain text fallback. If omitted, the HTML is stripped of tags. */
  plainText?: string;
  label?: string;
}

export function CopyHtmlButton({ html, plainText, label = "Copy article" }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = plainText || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    try {
      // ClipboardItem supports rich HTML — pasting into Google Docs / Shopify
      // / WordPress preserves images, links, headings, etc.
      if (typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2400); } catch { /* ignore */ }
    }
  }

  return (
    <button
      onClick={copy}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
        padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: copied ? "#dcfce7" : "linear-gradient(135deg, #4F6EF7, #7C5CFC)",
        color: copied ? "#166534" : "#fff",
        border: copied ? "1px solid #bbf7d0" : "none",
        boxShadow: copied ? "none" : "0 2px 8px rgba(79, 110, 247, 0.25)",
        transition: "all 0.15s",
      }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Copied with images & links
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
