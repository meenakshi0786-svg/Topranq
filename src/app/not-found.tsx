import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--bg)" }}>
      <Logo size={36} />
      <h1 className="text-4xl font-bold mt-8 mb-3" style={{ color: "var(--text-primary)" }}>404</h1>
      <p className="text-base mb-6" style={{ color: "var(--text-secondary)" }}>
        This page doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn-primary px-5 py-2.5 text-sm">
          Go home
        </Link>
        <Link href="/dashboard" className="px-5 py-2.5 text-sm rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}
