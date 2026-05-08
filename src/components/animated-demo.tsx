"use client";

import { useEffect, useState } from "react";

const PHASES = [
  { id: "enter-url", duration: 3500, label: "Enter URL" },
  { id: "audit", duration: 4000, label: "Site audit" },
  { id: "results", duration: 4000, label: "Results" },
  { id: "keywords", duration: 4500, label: "Keywords" },
  { id: "article", duration: 5000, label: "AI article" },
  { id: "llms", duration: 3500, label: "llms.txt" },
];

export function AnimatedDemo() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setPhaseIdx((p) => (p + 1) % PHASES.length), PHASES[phaseIdx].duration);
    return () => clearTimeout(t);
  }, [phaseIdx, paused]);

  const phaseId = PHASES[phaseIdx].id;

  return (
    <section style={{ background: "var(--bg)", borderTop: "1px solid var(--border-light)" }}>
      <style dangerouslySetInnerHTML={{ __html: animationCSS }} />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "80px 24px" }}>
        {/* Section heading */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 12 }}>
            See it in action
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 12px" }}>
            From URL to ranked article in 5 minutes
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto" }}>
            Watch the full Ranqapex workflow — audit, keyword discovery, article generation, and llms.txt — without signing up.
          </p>
        </div>

        {/* Browser frame */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 14px 50px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.04)",
            border: "1px solid var(--border-light)",
          }}
        >
          {/* Browser chrome */}
          <div style={{ padding: "10px 14px", background: "#f1f3f6", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
            <div style={{ flex: 1, marginLeft: 12, padding: "5px 12px", background: "#fff", borderRadius: 6, fontSize: 11, color: "var(--text-muted)", fontFamily: "ui-monospace, monospace" }}>
              ranqapex.com
            </div>
          </div>

          {/* Phase content area */}
          <div style={{ position: "relative", height: 380, background: "#fafbfd", overflow: "hidden" }}>
            {phaseId === "enter-url" && <PhaseEnterURL key={phaseIdx} />}
            {phaseId === "audit" && <PhaseAudit key={phaseIdx} />}
            {phaseId === "results" && <PhaseResults key={phaseIdx} />}
            {phaseId === "keywords" && <PhaseKeywords key={phaseIdx} />}
            {phaseId === "article" && <PhaseArticle key={phaseIdx} />}
            {phaseId === "llms" && <PhaseLlms key={phaseIdx} />}
          </div>

          {/* Step indicator footer */}
          <div style={{ display: "flex", padding: "12px 16px", borderTop: "1px solid var(--border-light)", background: "#fff", gap: 6, alignItems: "center" }}>
            {PHASES.map((p, i) => (
              <div key={p.id} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{
                  height: 3,
                  borderRadius: 2,
                  overflow: "hidden",
                  background: "var(--border-light)",
                }}>
                  <div style={{
                    height: "100%",
                    background: i < phaseIdx
                      ? "var(--accent)"
                      : i === phaseIdx
                      ? "linear-gradient(90deg, #4F6EF7, #7C5CFC)"
                      : "transparent",
                    width: i < phaseIdx ? "100%" : i === phaseIdx ? "0%" : "0%",
                    animation: i === phaseIdx && !paused ? `progress-fill ${p.duration}ms linear forwards` : "none",
                  }} />
                </div>
                <p style={{
                  fontSize: 10,
                  fontWeight: i === phaseIdx ? 700 : 500,
                  color: i === phaseIdx ? "var(--accent)" : "var(--text-muted)",
                  textAlign: "center",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  {p.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 16 }}>
          Hover to pause · Auto-loops every 25s · Real workflow shown with example data
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Phase 1: URL entry with typing animation
function PhaseEnterURL() {
  const url = "kataparis.com";
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(url.slice(0, i));
      if (i >= url.length) clearInterval(t);
    }, 110);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={phaseWrap}>
      <p style={phaseStep}>STEP 1</p>
      <h3 style={phaseTitle}>Enter your domain</h3>
      <p style={phaseSubtitle}>Type any website. We crawl up to 50 pages in seconds.</p>
      <div style={{
        marginTop: 28,
        maxWidth: 480,
        display: "flex",
        background: "#fff",
        borderRadius: 12,
        border: "1px solid var(--border)",
        boxShadow: "0 8px 24px rgba(79, 110, 247, 0.08)",
        overflow: "hidden",
      }}>
        <span style={{ padding: "14px 12px 14px 16px", color: "var(--text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
        </span>
        <div style={{ flex: 1, padding: "14px 6px", fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center" }}>
          <span>{typed}</span>
          <span style={{ display: "inline-block", width: 1.5, height: 18, background: "var(--accent)", marginLeft: 2, animation: "blink 1s step-end infinite" }} />
        </div>
        <button style={{
          padding: "10px 20px", margin: 4, borderRadius: 8,
          background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)",
          color: "#fff", fontSize: 13, fontWeight: 600, border: "none",
          opacity: typed.length === url.length ? 1 : 0.5,
          transition: "opacity 0.3s",
        }}>
          Free Audit →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Phase 2: Audit running with progress bar
function PhaseAudit() {
  const [pages, setPages] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPages((p) => Math.min(125, p + 4)), 100);
    return () => clearInterval(t);
  }, []);
  const pct = Math.min(100, (pages / 125) * 100);
  return (
    <div style={phaseWrap}>
      <p style={phaseStep}>STEP 2</p>
      <h3 style={phaseTitle}>Crawling your site</h3>
      <p style={phaseSubtitle}>Analyzing every page for SEO & GEO issues.</p>
      <div style={{ marginTop: 32, width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, color: "var(--text-secondary)" }}>
          <span>Pages crawled</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{pages} / 125</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "#e6e9f1", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #4F6EF7, #7C5CFC)", borderRadius: 4, transition: "width 0.1s linear" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {["Meta tags", "H1 hierarchy", "Schema", "llms.txt", "Internal links", "Images alt"].map((c, i) => (
            <span key={c} style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 999,
              background: i * 2 < pages / 6 ? "#dcfce7" : "#f3f4f6",
              color: i * 2 < pages / 6 ? "#166534" : "var(--text-muted)",
              fontWeight: 500,
              transition: "all 0.3s",
            }}>
              {i * 2 < pages / 6 ? "✓ " : ""}{c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Phase 3: Score reveal
function PhaseResults() {
  const [score, setScore] = useState(30);
  useEffect(() => {
    const target = 91;
    const start = Date.now();
    const t = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 1500) { setScore(target); clearInterval(t); return; }
      const eased = 1 - Math.pow(1 - elapsed / 1500, 3);
      setScore(Math.round(30 + (target - 30) * eased));
    }, 30);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={phaseWrap}>
      <p style={phaseStep}>STEP 3</p>
      <h3 style={phaseTitle}>Audit complete</h3>
      <p style={phaseSubtitle}>SEO + AI readiness score with prioritized fixes.</p>
      <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ position: "relative", width: 130, height: 130 }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#e6e9f1" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#score-grad)" strokeWidth="8"
              strokeDasharray={`${(score / 100) * 264} 264`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.1s linear" }} />
            <defs>
              <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F6EF7" />
                <stop offset="100%" stopColor="#7C5CFC" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{score}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>/ 100</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Pill bg="#fee2e2" color="#991b1b" label="4 critical" />
          <Pill bg="#fef3c7" color="#92400e" label="12 high" />
          <Pill bg="#fef9c3" color="#854d0e" label="8 medium" />
          <Pill bg="#dcfce7" color="#166534" label="✓ HTTPS configured" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Phase 4: Keywords
function PhaseKeywords() {
  const keywords = [
    { kw: "jupe longue noire", diff: "L" },
    { kw: "robe satin élégante", diff: "L" },
    { kw: "blouse dentelle blanche", diff: "M" },
    { kw: "ensemble lin femme", diff: "L" },
    { kw: "pantalon palazzo", diff: "M" },
    { kw: "manteau cachemire", diff: "H" },
    { kw: "robe boho été", diff: "L" },
    { kw: "veste tweed femme", diff: "M" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setShown((s) => Math.min(keywords.length, s + 1)), 350);
    return () => clearInterval(t);
  }, [keywords.length]);
  const diffColor = (d: string) => d === "L" ? { bg: "#dcfce7", text: "#166534" } : d === "M" ? { bg: "#fef9c3", text: "#854d0e" } : { bg: "#fee2e2", text: "#991b1b" };
  return (
    <div style={phaseWrap}>
      <p style={phaseStep}>STEP 4</p>
      <h3 style={phaseTitle}>Keywords discovered</h3>
      <p style={phaseSubtitle}>Low-hanging keywords from competitor SERPs and your GSC.</p>
      <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 580, justifyContent: "center" }}>
        {keywords.slice(0, shown).map((k, i) => {
          const c = diffColor(k.diff);
          return (
            <span
              key={k.kw}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: "#fff", border: "1.5px solid var(--border-light)",
                color: "var(--text-primary)",
                animation: `pop-in 0.4s ${i * 0.05}s both`,
              }}
            >
              {k.kw}
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: c.bg, color: c.text }}>
                {k.diff}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Phase 5: Article generation
function PhaseArticle() {
  return (
    <div style={phaseWrap}>
      <p style={phaseStep}>STEP 5</p>
      <h3 style={phaseTitle}>AI article generated</h3>
      <p style={phaseSubtitle}>Editorial quality. Your products woven in. Quality scored.</p>
      <div style={{
        marginTop: 24, width: "100%", maxWidth: 540,
        background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, padding: 18,
        animation: "slide-up 0.5s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534", textTransform: "uppercase" }}>
            Quality 90/100
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>1,547 words · French · Sonnet</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px", lineHeight: 1.3 }}>
          Jupe longue: 10 looks élégants pour un style moderne
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 12px" }}>
          La jupe longue s&apos;impose comme la pièce maîtresse du vestiaire moderne. Polyvalente, élégante et adaptée à toutes les morphologies, elle se décline aujourd&apos;hui en mille variations...
        </p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["Jupe Satin", "Jupe Plissée", "Robe Manouche", "Top Caraco"].map((p, i) => (
            <span key={p} style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 10,
              background: "#f0f5ff", color: "#1e40af", border: "1px solid #c7d7fe",
              animation: `pop-in 0.3s ${0.5 + i * 0.1}s both`,
            }}>
              {p}
            </span>
          ))}
          <span style={{ fontSize: 10, padding: "2px 8px", color: "var(--text-muted)" }}>+5 more linked</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Phase 6: llms.txt download
function PhaseLlms() {
  return (
    <div style={phaseWrap}>
      <p style={phaseStep}>STEP 6</p>
      <h3 style={phaseTitle}>llms.txt ready</h3>
      <p style={phaseSubtitle}>Your site is now AI-readable. ChatGPT, Perplexity, and Gemini can cite you.</p>
      <div style={{
        marginTop: 24, width: "100%", maxWidth: 460,
        background: "#fff", border: "1px solid #c7d7fe", borderRadius: 12, padding: 16,
        display: "flex", alignItems: "center", gap: 14,
        animation: "slide-up 0.5s ease-out",
        boxShadow: "0 8px 24px rgba(79, 110, 247, 0.08)",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" }}>llms.txt generated</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, fontFamily: "ui-monospace, monospace" }}>llms.txt · 18.4 KB · 376 products indexed</p>
        </div>
        <button style={{
          padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", color: "#fff", border: "none",
          whiteSpace: "nowrap",
        }}>
          Download
        </button>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Now discoverable by:</span>
        {["ChatGPT", "Perplexity", "Gemini", "Claude"].map((ai, i) => (
          <span key={ai} style={{
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
            background: "#fff", border: "1px solid var(--border-light)", color: "var(--text-secondary)",
            animation: `fade-in 0.4s ${0.3 + i * 0.15}s both`,
          }}>
            {ai}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function Pill({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, background: bg, color, animation: "fade-in 0.4s both",
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared phase styles
const phaseWrap: React.CSSProperties = {
  position: "absolute", inset: 0,
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "32px 28px",
  animation: "fade-in 0.4s ease-out",
};
const phaseStep: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
  color: "var(--accent)", margin: "0 0 6px",
};
const phaseTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px", letterSpacing: "-0.01em",
};
const phaseSubtitle: React.CSSProperties = {
  fontSize: 13, color: "var(--text-secondary)", margin: 0, textAlign: "center", maxWidth: 460,
};

const animationCSS = `
  @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pop-in { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
  @keyframes progress-fill { from { width: 0%; } to { width: 100%; } }
`;
