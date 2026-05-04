import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Terms of Service — Ranqapex",
  description: "Terms governing your use of Ranqapex's SEO autopilot service.",
  alternates: { canonical: "/terms" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
