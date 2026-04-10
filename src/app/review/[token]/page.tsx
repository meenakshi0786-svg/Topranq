"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ArticleData {
  id: string;
  domainId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  h1: string;
  bodyMarkdown: string;
  bodyHtml: string;
  targetKeyword: string;
  intent: string;
  audience: string;
  tone: string;
  qualityScore: number;
  readabilityScore: number;
  wordCount: number;
  faqSchema: Array<{ question: string; answer: string }> | null;
  imageSuggestions: Array<{ placement: string; altText: string; description: string }> | null;
  internalLinks: Array<{ anchorText: string; targetUrl: string }> | null;
  schemaJsonLd: Record<string, unknown> | null;
  revisionCount: number;
  status: string;
}

interface ReviewData {
  id: string;
  revision: number;
  status: string;
  expiresAt: string;
}

interface ConnectorData {
  id: string;
  platform: string;
  siteUrl: string;
  status: string;
}

type ActionResult = {
  status: string;
  message: string;
  publishedUrl?: string;
  error?: string;
};

export default function ReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"preview" | "seo" | "raw">("preview");
  const [connectors, setConnectors] = useState<ConnectorData[]>([]);
  const [showReworkForm, setShowReworkForm] = useState(false);
  const [showPublishPicker, setShowPublishPicker] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<string>("");
  const [reworkNotes, setReworkNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showShopifyInput, setShowShopifyInput] = useState(false);
  const [shopifyStore, setShopifyStore] = useState("");
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/review/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load review");
          return;
        }
        setArticle(data.article);
        setReview(data.review);
        if (data.connectors) setConnectors(data.connectors);
      } catch {
        setError("Failed to connect");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleAction(action: "accept" | "rework", connectorId?: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reworkNotes: action === "rework" ? reworkNotes : undefined,
          publishTo: action === "accept" ? (connectorId || selectedConnector || undefined) : undefined,
        }),
      });
      const data = await res.json();
      setActionResult(data);
      if (res.ok) {
        setShowReworkForm(false);
      }
    } catch {
      setActionResult({ status: "error", message: "Failed to submit. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e5e5e5", borderTopColor: "#4F6EF7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#666", fontSize: 14 }}>Loading review...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "40px 48px", textAlign: "center", maxWidth: 420, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#1a1a2e" }}>Review Unavailable</h1>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (actionResult) {
    const isSuccess = actionResult.status === "published" || actionResult.status === "approved";
    const isRework = actionResult.status === "rework_requested" || actionResult.status === "rework_regenerated";

    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "40px 48px", textAlign: "center", maxWidth: 480, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {isSuccess ? "\u2705" : isRework ? "\u270F\uFE0F" : "\u26A0\uFE0F"}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#1a1a2e" }}>
            {isSuccess ? "Article Accepted" : isRework ? "Rework Requested" : "Action Complete"}
          </h1>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 16 }}>{actionResult.message}</p>
          {actionResult.publishedUrl && (
            <a
              href={actionResult.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", background: "#4F6EF7", color: "#fff", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              View Published Article
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!article || !review) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", padding: "24px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ranqapex Article Review</p>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{article.title}</h1>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: "Keyword", value: article.targetKeyword },
              { label: "Intent", value: article.intent },
              { label: "Words", value: article.wordCount.toLocaleString() },
              { label: "Quality", value: `${article.qualityScore}/100` },
              { label: "Readability", value: `${article.readabilityScore}/100` },
              { label: "Revision", value: `#${article.revisionCount}` },
            ].map((item) => (
              <span key={item.label} style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{item.label}: </span>
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {/* Action Bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const connected = connectors.find((c) => c.status === "connected");
              if (connected) {
                handleAction("accept", connected.id);
              } else {
                setShowPublishPicker(true);
              }
            }}
            disabled={submitting}
            style={{ background: "#22c55e", color: "#fff", border: "none", padding: "14px 36px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}
          >
            {submitting ? "Publishing..." : "Accept & Publish"}
          </button>
          <button
            onClick={() => { setShowReworkForm(!showReworkForm); setShowPublishPicker(false); }}
            disabled={submitting}
            style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "14px 36px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}
          >
            Request Rework
          </button>
          <span style={{ fontSize: 11, color: "#999", alignSelf: "center" }}>
            Expires: {new Date(review.expiresAt).toLocaleString()}
          </span>
        </div>

        {/* Publish Destination Picker */}
        {showPublishPicker && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, border: "2px solid #22c55e" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "#1a1a2e" }}>Publish Your Article</h3>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>Choose where to publish this article. If already connected, it will publish directly.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {(() => {
                const shopifyConnector = connectors.find((c) => c.platform === "shopify" && c.status === "connected");
                return (
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                      borderRadius: 12, border: `2px solid ${shopifyConnector ? "#a7f3d0" : "#e5e5e5"}`,
                      background: shopifyConnector ? "#f0fdf4" : "#fff",
                    }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: "#95BF4715", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20.5 6.5l-1.5-.5-.5-1.5s-1-1-2-1l-1 7.5 4-1.5s1-.5 1-1.5-.5-1.5-.5-1.5z" fill="#95BF47"/>
                        <path d="M15.5 3.5l-1 7.5-3-1V3l2-.5 2 1z" fill="#5E8E3E"/>
                        <path d="M12.5 3l-1 .5v7L7 9l1-6 4.5.5z" fill="#95BF47"/>
                        <path d="M8 3l-1 6-2.5-1S4 7.5 4 6.5 5 4 5 4l3-1z" fill="#5E8E3E"/>
                        <path d="M14.5 11l-1 9.5-4-1.5-3-1L8 9l3 1.5 3.5.5z" fill="#95BF47"/>
                        <path d="M11.5 11.5L7.5 18l-1-9 5 2.5z" fill="#5E8E3E"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Shopify</p>
                        {shopifyConnector && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#dcfce7", color: "#166534" }}>Connected</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "#999", margin: "2px 0 0" }}>
                        {shopifyConnector ? shopifyConnector.siteUrl : "Connect your Shopify store to publish articles"}
                      </p>
                    </div>

                    {shopifyConnector ? (
                      <button
                        onClick={() => handleAction("accept", shopifyConnector.id)}
                        disabled={submitting}
                        style={{ fontSize: 13, fontWeight: 700, padding: "10px 24px", borderRadius: 10, background: "#95BF47", color: "#fff", border: "none", cursor: "pointer", opacity: submitting ? 0.5 : 1 }}
                      >
                        {submitting ? "Publishing..." : "Publish"}
                      </button>
                    ) : showShopifyInput ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="text"
                          value={shopifyStore}
                          onChange={(e) => setShopifyStore(e.target.value)}
                          placeholder="yourstore.myshopify.com"
                          style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", width: 200, outline: "none" }}
                        />
                        <button
                          onClick={() => {
                            if (!shopifyStore.trim()) return;
                            const shop = shopifyStore.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
                            window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shop)}&domainId=${article?.domainId}&reviewToken=${token}`;
                          }}
                          style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, background: "#95BF47", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          Connect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowShopifyInput(true)}
                        style={{ fontSize: 13, fontWeight: 700, padding: "10px 24px", borderRadius: 10, background: "#fff", color: "#95BF47", border: "2px solid #95BF47", cursor: "pointer" }}
                      >
                        Connect Shopify
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={() => { setSelectedConnector(""); handleAction("accept"); }}
                disabled={submitting}
                style={{ background: "transparent", color: "#666", border: "1px solid #e5e5e5", padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}
              >
                {submitting ? "Processing..." : "Approve Without Publishing"}
              </button>
              <button
                onClick={() => setShowPublishPicker(false)}
                style={{ background: "transparent", color: "#999", border: "none", padding: "12px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rework Form */}
        {showReworkForm && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, border: "2px solid #f59e0b" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#1a1a2e" }}>What should be changed?</h3>
            <textarea
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              placeholder="e.g., Change the tone to be more casual, add a section about pricing, remove the FAQ, include more examples..."
              rows={4}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => handleAction("rework")}
                disabled={!reworkNotes.trim() || submitting}
                style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !reworkNotes.trim() || submitting ? 0.5 : 1 }}
              >
                Submit Rework Request
              </button>
              <button
                onClick={() => setShowReworkForm(false)}
                style={{ background: "transparent", color: "#666", border: "1px solid #e5e5e5", padding: "10px 24px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#e5e5e5", padding: 4, borderRadius: 10, width: "fit-content" }}>
          {(["preview", "seo", "raw"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#fff" : "transparent",
                color: activeTab === tab ? "#1a1a2e" : "#666",
                border: "none",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab === "preview" ? "Preview" : tab === "seo" ? "SEO Details" : "Raw Markdown"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {activeTab === "preview" && (
            <div style={{ padding: "32px 40px" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#1a1a2e" }}>{article.h1}</h1>
              <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>/{article.slug}</p>
              <div
                style={{ fontSize: 15, lineHeight: 1.8, color: "#333" }}
                dangerouslySetInnerHTML={{ __html: article.bodyHtml || article.bodyMarkdown.replace(/\n/g, "<br>") }}
              />

              {/* FAQ */}
              {article.faqSchema && article.faqSchema.length > 0 && (
                <div style={{ marginTop: 32, padding: 24, background: "#f8f9fc", borderRadius: 10 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Frequently Asked Questions</h2>
                  {article.faqSchema.map((faq, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{faq.question}</p>
                      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Suggestions */}
              {article.imageSuggestions && article.imageSuggestions.length > 0 && (
                <div style={{ marginTop: 24, padding: 16, background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8, textTransform: "uppercase" }}>Image Suggestions</p>
                  {article.imageSuggestions.map((img, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#78350f", marginBottom: 8 }}>
                      <strong>{img.placement}</strong>: {img.description}
                      <br />
                      <span style={{ fontSize: 11, color: "#a16207" }}>alt=&quot;{img.altText}&quot;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "seo" && (
            <div style={{ padding: "32px 40px" }}>
              {/* SERP Preview */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>Google SERP Preview</p>
                <div style={{ padding: 16, background: "#f8f9fc", borderRadius: 8 }}>
                  <p style={{ fontSize: 18, color: "#1a0dab", marginBottom: 4 }}>{article.metaTitle}</p>
                  <p style={{ fontSize: 13, color: "#006621", marginBottom: 4 }}>example.com/{article.slug}</p>
                  <p style={{ fontSize: 13, color: "#545454" }}>{article.metaDescription}</p>
                </div>
              </div>

              {/* Meta Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Meta Title", value: `${article.metaTitle} (${article.metaTitle?.length || 0} chars)`, good: (article.metaTitle?.length || 0) <= 60 },
                  { label: "Meta Description", value: `${article.metaDescription?.slice(0, 80)}... (${article.metaDescription?.length || 0} chars)`, good: (article.metaDescription?.length || 0) >= 120 && (article.metaDescription?.length || 0) <= 160 },
                  { label: "Target Keyword", value: article.targetKeyword },
                  { label: "Slug", value: `/${article.slug}`, good: article.slug?.length <= 60 },
                  { label: "Quality Score", value: `${article.qualityScore}/100`, good: article.qualityScore >= 75 },
                  { label: "Readability", value: `${article.readabilityScore}/100`, good: article.readabilityScore >= 60 },
                ].map((item) => (
                  <div key={item.label} style={{ padding: 12, background: "#f8f9fc", borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: "#999", marginBottom: 4, textTransform: "uppercase" }}>{item.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: item.good === false ? "#ef4444" : item.good === true ? "#22c55e" : "#1a1a2e" }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Internal Links */}
              {article.internalLinks && article.internalLinks.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>Internal Links ({article.internalLinks.length})</p>
                  {article.internalLinks.map((link: { anchorText: string; targetUrl: string }, i: number) => (
                    <div key={i} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <span style={{ color: "#4F6EF7", fontWeight: 500 }}>{link.anchorText}</span>
                      <span style={{ color: "#999" }}> → {link.targetUrl}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Schema JSON-LD */}
              {article.schemaJsonLd && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>Schema JSON-LD</p>
                  <pre style={{ background: "#1a1a2e", color: "#a5f3fc", padding: 16, borderRadius: 8, fontSize: 11, overflow: "auto", maxHeight: 200 }}>
                    {JSON.stringify(article.schemaJsonLd, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === "raw" && (
            <div style={{ padding: "32px 40px" }}>
              <pre style={{ background: "#f8f9fc", padding: 20, borderRadius: 8, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#333", maxHeight: 600, overflow: "auto" }}>
                {article.bodyMarkdown}
              </pre>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>
    </div>
  );
}
