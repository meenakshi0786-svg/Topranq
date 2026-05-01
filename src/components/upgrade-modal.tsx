"use client";

interface Props {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  contactOnly?: boolean;
}

export function UpgradeModal({ onClose, title, subtitle, contactOnly }: Props) {
  const isContactMode = contactOnly || (subtitle || "").includes("contact");
  if (isContactMode) {
    return (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      >
        <div
          style={{ width: "100%", maxWidth: 420, margin: 16, borderRadius: 20, background: "#fff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ background: "linear-gradient(135deg, #7C5CFC, #4F6EF7)", padding: "32px 28px", textAlign: "center", position: "relative" }}>
            <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>
              {title || "Plan Limit Reached"}
            </h2>
          </div>
          <div style={{ padding: "28px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6, marginBottom: 24 }}>
              You&apos;ve used all articles on your current plan. Contact our support team to get more articles or a custom plan.
            </p>
            <a
              href="mailto:ranqapexcontact@gmail.com"
              style={{ display: "inline-block", padding: "12px 32px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", marginBottom: 12 }}
            >
              Email Support
            </a>
            <p style={{ fontSize: 12, color: "#999", margin: "12px 0 0" }}>ranqapexcontact@gmail.com</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 520, margin: 16, borderRadius: 20, background: "#fff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", padding: "28px 28px 20px", textAlign: "center", position: "relative" }}>
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>
            {title || "Upgrade to Unlock"}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
            {subtitle || "Choose a plan to access premium features"}
          </p>
        </div>

        {/* Plan Cards */}
        <div style={{ padding: "24px 24px 20px", display: "flex", gap: 12 }}>
          {/* $1 Plan */}
          <div
            style={{
              flex: 1, padding: 20, borderRadius: 14, border: "1.5px solid var(--border-light)",
              background: "#fff", textAlign: "center",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4F6EF7", marginBottom: 8 }}>Starter</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#1a1a2e", margin: "0 0 4px" }}>$1</p>
            <p style={{ fontSize: 11, color: "#999", marginBottom: 16 }}>One-time / 30 days</p>
            <div style={{ textAlign: "left", fontSize: 12, color: "#444", lineHeight: 2 }}>
              <div>&#10003; 10 AI articles (Sonnet)</div>
              <div>&#10003; 25-page site audit</div>
              <div>&#10003; Keyword planner</div>
              <div>&#10003; llms.txt generator</div>
              <div>&#10003; Pillar-cluster strategy</div>
            </div>
            <a
              href="/pricing"
              style={{
                display: "block", marginTop: 16, padding: "10px 0", borderRadius: 10,
                fontSize: 13, fontWeight: 700, color: "#4F6EF7", textDecoration: "none",
                border: "1.5px solid #4F6EF7", background: "#fff",
              }}
            >
              Get Started
            </a>
          </div>

          {/* $5 Plan */}
          <div
            style={{
              flex: 1, padding: 20, borderRadius: 14, border: "2px solid #7C5CFC",
              background: "linear-gradient(180deg, #f5f3ff, #fff)", textAlign: "center",
              position: "relative",
            }}
          >
            <span style={{
              position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
              fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
              background: "#7C5CFC", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>Best Value</span>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#7C5CFC", marginBottom: 8 }}>Pro</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#1a1a2e", margin: "0 0 4px" }}>$5</p>
            <p style={{ fontSize: 11, color: "#999", marginBottom: 16 }}>One-time / 30 days</p>
            <div style={{ textAlign: "left", fontSize: 12, color: "#444", lineHeight: 2 }}>
              <div>&#10003; 15 AI articles (Opus)</div>
              <div>&#10003; 50-page site audit</div>
              <div>&#10003; Everything in Starter</div>
              <div>&#10003; Hero image generation</div>
              <div>&#10003; GSC integration</div>
            </div>
            <a
              href="/pricing"
              style={{
                display: "block", marginTop: 16, padding: "10px 0", borderRadius: 10,
                fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none",
                border: "none", background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)",
              }}
            >
              Upgrade Now
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "0 24px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "#999", margin: 0 }}>
            One-time payment. No subscription. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  );
}
