"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface ConnectorData {
  id: string;
  platform: string;
  siteUrl: string | null;
  status: string;
  connectedAt: string | null;
}

const PLATFORMS = [
  {
    id: "wordpress",
    name: "WordPress",
    icon: "M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2z",
    desc: "Publish articles directly to your WordPress site via REST API",
    color: "#21759B",
  },
  {
    id: "shopify",
    name: "Shopify",
    icon: "M15.337 3.415L13.16 2.253c-.148-.08-.33-.08-.478 0L10.5 3.415 8.337 2.253c-.148-.08-.33-.08-.478 0L5.697 3.415A.5.5 0 005.5 3.85v16.3a.5.5 0 00.697.435l2.162-1.162 2.163 1.162c.148.08.33.08.478 0l2.162-1.162 2.163 1.162a.5.5 0 00.675-.435V3.85a.5.5 0 00-.263-.435z",
    desc: "Sync blog content with your Shopify store pages",
    color: "#96BF48",
  },
  {
    id: "webflow",
    name: "Webflow",
    icon: "M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z",
    desc: "Push content to Webflow CMS collections automatically",
    color: "#4353FF",
  },
  {
    id: "webhook",
    name: "Custom Webhook",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    desc: "Send article data to any URL via POST webhook",
    color: "#5A6178",
  },
];

export default function ConnectorsPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [connectors, setConnectors] = useState<ConnectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/domains/${domainId}/connectors`)
      .then((r) => r.json())
      .then((data) => { setConnectors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [domainId]);

  const connectPlatform = async (platform: string) => {
    if (!siteUrl.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/domains/${domainId}/connectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, siteUrl: siteUrl.trim() }),
    });
    if (res.ok) {
      const connector = await res.json();
      setConnectors((prev) => {
        const without = prev.filter((c) => c.platform !== platform);
        return [...without, connector];
      });
    }
    setSaving(false);
    setShowForm(null);
    setSiteUrl("");
  };

  const disconnectPlatform = async (connectorId: string, platform: string) => {
    await fetch(`/api/domains/${domainId}/connectors`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId }),
    });
    setConnectors((prev) =>
      prev.map((c) => c.id === connectorId ? { ...c, status: "disconnected" } : c)
    );
  };

  const getConnector = (platform: string) =>
    connectors.find((c) => c.platform === platform && c.status === "connected");

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Connectors</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Publishing Connectors</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Connect your CMS to publish AI-generated articles directly to your website.
          </p>
        </div>

        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading connectors...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform, i) => {
              const connected = getConnector(platform.id);
              return (
                <div
                  key={platform.id}
                  className="card-static p-6 fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${platform.color}15` }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={platform.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm">{platform.name}</h3>
                        {connected && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--low-bg)", color: "var(--success)" }}>
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {platform.desc}
                      </p>
                    </div>
                  </div>

                  {connected ? (
                    <div className="p-3 rounded-xl mb-3" style={{ background: "var(--bg)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Site URL</p>
                      <p className="text-sm font-medium" style={{ fontFamily: "monospace" }}>{connected.siteUrl}</p>
                      {connected.connectedAt && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          Connected {new Date(connected.connectedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {showForm === platform.id ? (
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        placeholder={platform.id === "webhook" ? "https://your-api.com/webhook" : `https://your-${platform.id}-site.com`}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => connectPlatform(platform.id)}
                          disabled={saving || !siteUrl.trim()}
                          className="btn-primary px-4 py-2 text-xs cursor-pointer"
                        >
                          {saving ? "Connecting..." : "Connect"}
                        </button>
                        <button
                          onClick={() => { setShowForm(null); setSiteUrl(""); }}
                          className="px-4 py-2 text-xs font-medium rounded-lg cursor-pointer"
                          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {connected ? (
                        <button
                          onClick={() => disconnectPlatform(connected.id, platform.id)}
                          className="px-4 py-2 text-xs font-medium rounded-lg cursor-pointer"
                          style={{ border: "1px solid var(--border)", color: "var(--critical)" }}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowForm(platform.id)}
                          className="btn-primary px-4 py-2 text-xs cursor-pointer"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="card-static p-5 mt-6 fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <p className="text-sm font-medium mb-1">How publishing works</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Once connected, articles approved in the Articles tab can be published directly to your CMS.
                For WordPress and Shopify, we use their REST APIs. Webflow uses the CMS API.
                Custom webhooks receive a POST with the article JSON payload.
                All publish actions are logged and can be reverted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
