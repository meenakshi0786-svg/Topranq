import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Dashboard — Ranqapex",
  description: "Manage your domains, view audit scores, and access your SEO content pipeline.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
