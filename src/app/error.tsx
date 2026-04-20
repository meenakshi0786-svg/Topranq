"use client";

import { Logo } from "@/components/logo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--bg)" }}>
      <Logo size={36} />
      <h1 className="text-2xl font-bold mt-8 mb-2" style={{ color: "var(--text-primary)" }}>Something went wrong</h1>
      <p className="text-sm mb-6 max-w-md text-center" style={{ color: "var(--text-secondary)" }}>
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary px-5 py-2.5 text-sm cursor-pointer">
          Try again
        </button>
        <a href="/dashboard" className="px-5 py-2.5 text-sm rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          Dashboard
        </a>
      </div>
    </div>
  );
}
