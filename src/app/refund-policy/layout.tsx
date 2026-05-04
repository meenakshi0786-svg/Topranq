import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Refund Policy — Ranqapex",
  description: "Ranqapex refund policy for $1 and $5 plans.",
  alternates: { canonical: "/refund-policy" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
