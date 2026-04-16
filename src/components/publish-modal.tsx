"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  domainId: string;
  articleId: string;
  articleTitle: string;
  onClose: () => void;
  onPublished: (url: string) => void;
}

interface Connector {
  id: string;
  platform: string;
  siteUrl: string | null;
  status: string;
}

type Step = "pick" | "connect-shopify" | "connect-wordpress" | "publishing" | "done" | "error";

export function PublishModal({ domainId, articleId, articleTitle, onClose, onPublished }: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // WordPress fields
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [wpTesting, setWpTesting] = useState(false);

  // Shopify fields
  const [shopDomain, setShopDomain] = useState("");

  const loadConnectors = useCallback(async () => {
    const res = await fetch(`/api/domains/${domainId}/connectors`).catch(() => null);
    if (res?.ok) setConnectors(await res.json());
  }, [domainId]);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  const shopifyConnector = connectors.find((c) => c.platform === "shopify" && c.status === "connected");
  const wordpressConnector = connectors.find((c) => c.platform === "wordpress" && c.status === "connected");

  async function doPublish(connectorId: string) {
    setStep("publishing");
    try {
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorId, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Publish failed");
        setStep("error");
        return;
      }
      setPublishedUrl(data.url || "");
      setStep("done");
      onPublished(data.url || "");
    } catch {
      setErrorMsg("Network error — try again");
      setStep("error");
    }
  }

  async function connectWordPress() {
    if (!wpUrl || !wpUser || !wpPass) return;
    setWpTesting(true);
    setErrorMsg("");
    try {
      // Test connection first
      const testRes = await fetch("/api/connectors/test-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: wpUrl, username: wpUser, password: wpPass }),
      });
      if (!testRes.ok) {
        const d = await testRes.json();
        setErrorMsg(d.error || "WordPress connection failed. Check URL, username, and app password.");
        setWpTesting(false);
        return;
      }
      // Save connector
      const res = await fetch(`/api/domains/${domainId}/connectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "wordpress",
          siteUrl: wpUrl,
          authCredentials: JSON.stringify({ username: wpUser, password: wpPass }),
        }),
      });
      if (!res.ok) {
        setErrorMsg("Failed to save connector");
        setWpTesting(false);
        return;
      }
      const connector = await res.json();
      setWpTesting(false);
      await doPublish(connector.id);
    } catch {
      setErrorMsg("Connection failed");
      setWpTesting(false);
    }
  }

  function startShopifyOAuth() {
    const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!shop) return;
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shop)}&domainId=${domainId}&returnTo=${encodeURIComponent(`/domain/${domainId}/articles?publishArticle=${articleId}`)}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="card-static p-7 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--bg-white)" }}
      >
        {step === "pick" && (
          <>
            <h3 className="font-semibold text-base mb-1">Publish article</h3>
            <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
              {articleTitle}
            </p>
            <div className="space-y-2">
              {/* Shopify */}
              <PlatformButton
                name="Shopify"
                icon={<ShopifyIcon />}
                connected={!!shopifyConnector}
                onClick={() => {
                  if (shopifyConnector) doPublish(shopifyConnector.id);
                  else setStep("connect-shopify");
                }}
              />
              {/* WordPress */}
              <PlatformButton
                name="WordPress"
                icon={<WordPressIcon />}
                connected={!!wordpressConnector}
                onClick={() => {
                  if (wordpressConnector) doPublish(wordpressConnector.id);
                  else setStep("connect-wordpress");
                }}
              />
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={onClose} className="text-sm px-4 py-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>Cancel</button>
            </div>
          </>
        )}

        {step === "connect-shopify" && (
          <>
            <h3 className="font-semibold text-base mb-1">Connect Shopify</h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Enter your Shopify store domain (e.g. my-store.myshopify.com)
            </p>
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="my-store.myshopify.com"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none mb-3"
              style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
              onKeyDown={(e) => e.key === "Enter" && startShopifyOAuth()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setStep("pick")} className="text-sm px-4 py-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>Back</button>
              <button
                onClick={startShopifyOAuth}
                disabled={!shopDomain.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                style={{ background: "#96bf48" }}
              >
                Connect &amp; Publish
              </button>
            </div>
          </>
        )}

        {step === "connect-wordpress" && (
          <>
            <h3 className="font-semibold text-base mb-1">Connect WordPress</h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Use an Application Password — create one at yoursite.com/wp-admin → Users → Profile → Application Passwords.
            </p>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={wpUrl}
                onChange={(e) => setWpUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
              />
              <input
                type="text"
                value={wpUser}
                onChange={(e) => setWpUser(e.target.value)}
                placeholder="WordPress username"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
              />
              <input
                type="password"
                value={wpPass}
                onChange={(e) => setWpPass(e.target.value)}
                placeholder="Application password"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
              />
            </div>
            {errorMsg && <p className="text-xs mb-2" style={{ color: "var(--critical)" }}>{errorMsg}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setStep("pick"); setErrorMsg(""); }} className="text-sm px-4 py-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>Back</button>
              <button
                onClick={connectWordPress}
                disabled={wpTesting || !wpUrl || !wpUser || !wpPass}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                style={{ background: "#21759b" }}
              >
                {wpTesting ? "Testing..." : "Connect & Publish"}
              </button>
            </div>
          </>
        )}

        {step === "publishing" && (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto mb-4" style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--border-light)", borderTopColor: "var(--accent)" }} />
            <p className="text-sm font-medium">Publishing...</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--low-bg)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p className="text-sm font-semibold mb-1">Published!</p>
            {publishedUrl && (
              <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--accent)" }}>
                {publishedUrl}
              </a>
            )}
            <div className="mt-5">
              <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: "var(--accent)" }}>Done</button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-6">
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--critical)" }}>Publish failed</p>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>{errorMsg}</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setStep("pick")} className="px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ border: "1px solid var(--border)" }}>Try again</button>
              <button onClick={onClose} className="text-sm px-4 py-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformButton({ name, icon, connected, onClick }: { name: string; icon: React.ReactNode; connected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-lg text-left cursor-pointer"
      style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
    >
      <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs" style={{ color: connected ? "var(--success)" : "var(--text-muted)" }}>
          {connected ? "Connected — click to publish" : "Click to connect"}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
    </button>
  );
}

function ShopifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#96bf48">
      <path d="M15.337 3.178c-.07-.024-.138.018-.158.088-.018.06-.3 1.03-.3 1.03a3.25 3.25 0 00-.87-.33c-.03-.39-.07-.95-.14-1.28-.19-.96-.76-1.46-1.45-1.46h-.06c-.05-.06-.12-.12-.18-.16C11.677.7 11.157.84 10.737 1.38c-.54.7-.95 1.74-1.07 2.5a13.33 13.33 0 00-1.41.44c-.43.14-.44.15-.5.56-.04.3-1.17 9.02-1.17 9.02l8.76 1.52.04-.02V3.26c-.01-.04-.02-.07-.05-.08zM13.417 4.2c-.35.11-.74.23-1.14.35V4.3c0-.5-.07-.91-.18-1.23.45.09.77.52.92 1.13h.4zm-1.79-1c.12.3.2.74.2 1.35v.12l-2.34.73c.45-1.72 1.29-2.16 2.14-2.2zm-.76-.66c.07 0 .14.03.2.07-.8.37-1.65 1.3-2.01 3.16l-1.85.57c.37-1.78 1.7-3.8 3.66-3.8z" />
    </svg>
  );
}

function WordPressIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#21759b">
      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-1.178.25-2.3.69-3.318L8.08 20.26A8.57 8.57 0 013.443 12zm8.557 8.557c-.879 0-1.723-.141-2.514-.396l2.67-7.758 2.736 7.497c.018.044.04.085.063.124a8.525 8.525 0 01-2.955.533zm1.2-12.567c.536-.028 1.018-.085 1.018-.085.479-.057.423-.76-.057-.733 0 0-1.44.113-2.37.113-.876 0-2.347-.113-2.347-.113-.48-.028-.536.704-.057.733 0 0 .454.057.933.085l1.386 3.798-1.946 5.837L6.67 7.99c.536-.028 1.018-.085 1.018-.085.48-.057.423-.76-.056-.733 0 0-1.44.113-2.37.113-.167 0-.364-.004-.573-.01A8.527 8.527 0 0112 3.443c2.184 0 4.175.82 5.685 2.168-.036-.002-.072-.008-.11-.008-1.762 0-2.67 1.352-2.67 2.45 0 .733.423 1.352.874 2.084.338.593.733 1.352.733 2.45 0 .762-.292 1.646-.677 2.877l-.888 2.966-3.209-9.54z" />
    </svg>
  );
}
