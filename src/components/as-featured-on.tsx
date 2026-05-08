"use client";

// Add new directories here as Ranqapex gets listed.
// Each badge: name + url + (optional logo SVG/img). Default uses styled text.
const FEATURED_ON: Array<{ name: string; url: string; logo?: string }> = [
  { name: "Product Hunt", url: "https://www.producthunt.com/" },
  { name: "Toolify", url: "https://www.toolify.ai/" },
  { name: "Futurepedia", url: "https://www.futurepedia.io/" },
  { name: "There's An AI For That", url: "https://theresanaiforthat.com/" },
  { name: "AlternativeTo", url: "https://alternativeto.net/" },
  { name: "SaaSHub", url: "https://www.saashub.com/" },
];

export function AsFeaturedOn() {
  if (FEATURED_ON.length === 0) return null;
  return (
    <section style={{ background: "var(--bg-white)", borderTop: "1px solid var(--border-light)", borderBottom: "1px solid var(--border-light)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{
          textAlign: "center", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--text-muted)", marginBottom: 24,
        }}>
          Listed on
        </p>
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          flexWrap: "wrap", gap: 32, opacity: 0.7,
        }}>
          {FEATURED_ON.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 14, fontWeight: 700,
                color: "var(--text-secondary)",
                textDecoration: "none",
                letterSpacing: "-0.01em",
                transition: "color 0.15s, opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
