import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy Policy — Ranqapex",
  description: "How Ranqapex collects, uses, and protects your data. GDPR compliant.",
  alternates: { canonical: "/privacy" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
