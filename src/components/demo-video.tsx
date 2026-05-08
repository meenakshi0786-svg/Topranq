"use client";

import { useState } from "react";

// Update YOUTUBE_ID once you upload a demo video.
// To get the ID: from https://www.youtube.com/watch?v=ABCDE12345 — ID is "ABCDE12345"
const YOUTUBE_ID = ""; // e.g. "dQw4w9WgXcQ"

export function DemoVideo() {
  const [playing, setPlaying] = useState(false);

  // If no video ID yet, show a "Demo coming soon" placeholder
  // that doesn't break the layout
  if (!YOUTUBE_ID) {
    return (
      <section style={{ background: "var(--bg)", borderTop: "1px solid var(--border-light)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 12 }}>
              See it in action
            </p>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 12px" }}>
              From URL to ranked article in 5 minutes
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 540, margin: "0 auto" }}>
              Watch a complete workflow — site audit, keyword discovery, pillar generation, and article publishing — without signing up.
            </p>
          </div>
          <div style={{
            position: "relative",
            paddingTop: "56.25%", // 16:9
            background: "linear-gradient(135deg, #1a1a2e, #2d2d4f)",
            borderRadius: 16,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 14,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 10px 32px rgba(79, 110, 247, 0.4)",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              </div>
              <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, opacity: 0.85 }}>
                Demo video coming soon
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: "var(--bg)", borderTop: "1px solid var(--border-light)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 12 }}>
            See it in action
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 12px" }}>
            From URL to ranked article in 5 minutes
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 540, margin: "0 auto" }}>
            Watch a complete workflow — site audit, keyword discovery, pillar generation, and article publishing.
          </p>
        </div>
        <div style={{
          position: "relative",
          paddingTop: "56.25%",
          borderRadius: 16,
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 14px 50px rgba(0,0,0,0.15)",
        }}>
          {playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0`}
              title="Ranqapex demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            <button
              onClick={() => setPlaying(true)}
              aria-label="Play demo video"
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                background: `url(https://img.youtube.com/vi/${YOUTUBE_ID}/maxresdefault.jpg) center/cover`,
                border: "none", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#4F6EF7">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
