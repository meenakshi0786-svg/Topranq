import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TopRanq — SEO Autopilot",
  description: "AI agents that crawl, audit, strategize, write, and publish SEO content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
