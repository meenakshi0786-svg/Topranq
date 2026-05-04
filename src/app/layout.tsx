import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://ranqapex.com";
const SITE_NAME = "Ranqapex";
const DEFAULT_TITLE = "Ranqapex — SEO Autopilot";
const DEFAULT_DESCRIPTION = "AI agents that crawl, audit, strategize, write, and publish SEO content. Get cited by ChatGPT, Perplexity, and Google AI Overviews.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  icons: {
    icon: "/favicon.ico",
  },
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
