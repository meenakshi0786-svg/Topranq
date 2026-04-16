"use client";

import { useState } from "react";

interface Props {
  text: string;
  label?: string;
  size?: number;
}

export function CopyButton({ text, label, size = 14 }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); copy(); }}
      className="inline-flex items-center gap-1 cursor-pointer shrink-0"
      style={{ color: copied ? "var(--success)" : "var(--text-muted)" }}
      title={copied ? "Copied!" : label || "Copy to clipboard"}
    >
      {copied ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
      {label && <span className="text-[11px]">{copied ? "Copied!" : label}</span>}
    </button>
  );
}
