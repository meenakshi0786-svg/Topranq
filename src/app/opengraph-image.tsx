import { ImageResponse } from "next/og";

export const alt = "Ranqapex — SEO Autopilot. AI agents that audit, strategize, and write SEO content.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #4F6EF7 0%, #7C5CFC 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "80px",
        }}
      >
        {/* Logo + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
              <div style={{ width: 6, height: 14, background: "#fff", borderRadius: 2, opacity: 0.6 }} />
              <div style={{ width: 6, height: 22, background: "#fff", borderRadius: 2, opacity: 0.75 }} />
              <div style={{ width: 6, height: 30, background: "#fff", borderRadius: 2, opacity: 0.9 }} />
              <div style={{ width: 6, height: 38, background: "#fff", borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em" }}>
            Ranqapex
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: 24,
            maxWidth: 1000,
          }}
        >
          Audit, fix, and publish
          <br />SEO content — on autopilot
        </div>

        {/* Subhead */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.9)",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          AI agents that crawl, audit, strategize, write & publish.
          <br />Get cited by ChatGPT, Perplexity & Google AI Overviews.
        </div>

        {/* Pill CTA */}
        <div
          style={{
            marginTop: 48,
            background: "#fff",
            color: "#4F6EF7",
            fontSize: 22,
            fontWeight: 700,
            padding: "14px 36px",
            borderRadius: 14,
          }}
        >
          ranqapex.com · Plans from $1
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
