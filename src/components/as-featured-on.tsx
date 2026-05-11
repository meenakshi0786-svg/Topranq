"use client";

const PRODUCT_HUNT_URL = "https://www.producthunt.com/products/ranqapex?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-ranqapex";
const PRODUCT_HUNT_BADGE = "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1139019&theme=light&t=1778480579906";

// Text-only listings (added as Ranqapex gets approved on each directory).
const OTHER_LISTINGS: Array<{ name: string; url: string }> = [
  { name: "Toolify", url: "https://www.toolify.ai/" },
  { name: "Futurepedia", url: "https://www.futurepedia.io/" },
  { name: "There's An AI For That", url: "https://theresanaiforthat.com/" },
  { name: "AlternativeTo", url: "https://alternativeto.net/" },
  { name: "SaaSHub", url: "https://www.saashub.com/" },
];

export function AsFeaturedOn() {
  return (
    <section style={{ background: "var(--bg-white)", borderTop: "1px solid var(--border-light)", borderBottom: "1px solid var(--border-light)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <p style={{
          textAlign: "center", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--text-muted)", marginBottom: 24,
        }}>
          Featured on
        </p>

        {/* Product Hunt official badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <a
            href={PRODUCT_HUNT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ranqapex - SEO + GEO on autopilot - rank on Google and AI engines | Product Hunt"
            style={{ display: "inline-block", transition: "transform 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Ranqapex - SEO + GEO on autopilot - rank on Google and AI engines | Product Hunt"
              width={250}
              height={54}
              src={PRODUCT_HUNT_BADGE}
              style={{ display: "block" }}
            />
          </a>
        </div>

        {/* Other listings */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          flexWrap: "wrap", gap: 28, opacity: 0.6,
        }}>
          {OTHER_LISTINGS.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13, fontWeight: 700,
                color: "var(--text-secondary)",
                textDecoration: "none",
                letterSpacing: "-0.01em",
                transition: "color 0.15s",
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
