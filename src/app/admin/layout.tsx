import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Admin — Ranqapex",
  description: "Internal admin dashboard.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
