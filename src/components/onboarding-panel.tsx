"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  domainId: string;
  domainUrl: string;
  /** set to true when the page just returned from GSC OAuth (?gscConnected=1) */
  justConnectedGsc: boolean;
}

type StepStatus = "todo" | "doing" | "done" | "locked";

const GSC_PROGRESS_MESSAGES = [
  "We are running a full analysis",
  "Scanning your Products",
  "Generating a Strategy",
  "Fetching your GSC data",
];

export function OnboardingPanel({ domainId, domainUrl, justConnectedGsc }: Props) {
  const [gscConnected, setGscConnected] = useState<boolean | null>(null);
  const [hasProducts, setHasProducts] = useState<boolean | null>(null);
  const [gscSkipped, setGscSkipped] = useState(false);
  const [productsSkipped, setProductsSkipped] = useState(false);
  const [gscFetching, setGscFetching] = useState(false);
  const [gscProgressIdx, setGscProgressIdx] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const autoFetchTriggered = useRef(false);

  const refresh = useCallback(async () => {
    const [gsc, products] = await Promise.all([
      fetch(`/api/domains/${domainId}/gsc?action=status`).then((r) => r.json()).catch(() => ({ connected: false })),
      fetch(`/api/products/import?domainId=${domainId}`).then((r) => r.json()).catch(() => []),
    ]);
    setGscConnected(Boolean(gsc?.connected));
    setHasProducts(Array.isArray(products) && products.length > 0);
    return { gsc, products };
  }, [domainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // After OAuth returns with ?gscConnected=1, auto-fetch GSC data with progress UI
  useEffect(() => {
    if (!justConnectedGsc || autoFetchTriggered.current) return;
    autoFetchTriggered.current = true;
    (async () => {
      setGscFetching(true);
      try {
        const status = await fetch(`/api/domains/${domainId}/gsc?action=status`).then((r) => r.json());
        const siteUrl = pickSiteUrl(status?.sites || [], domainUrl);
        if (!siteUrl) return;
        await fetch(`/api/domains/${domainId}/gsc?action=fetch&siteUrl=${encodeURIComponent(siteUrl)}&days=28`);
      } finally {
        setGscFetching(false);
        // Clean up the URL param and re-check status
        window.history.replaceState({}, "", `/domain/${domainId}`);
        refresh();
      }
    })();
  }, [justConnectedGsc, domainId, domainUrl, refresh]);

  // Rotate progress messages while fetching
  useEffect(() => {
    if (!gscFetching) { setGscProgressIdx(0); return; }
    const t = setInterval(() => {
      setGscProgressIdx((i) => (i + 1) % GSC_PROGRESS_MESSAGES.length);
    }, 2000);
    return () => clearInterval(t);
  }, [gscFetching]);

  if (gscConnected === null) {
    // Loading skeleton while checking onboarding status
    return (
      <div className="card-static p-7 mb-5 fade-in">
        <div className="h-4 w-24 rounded mb-5 animate-pulse" style={{ background: "var(--border-light)" }} />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "var(--border-light)" }} />
              <div className="flex-1">
                <div className="h-3.5 w-48 rounded mb-2 animate-pulse" style={{ background: "var(--border-light)" }} />
                <div className="h-3 w-64 rounded animate-pulse" style={{ background: "var(--border-light)" }} />
              </div>
              <div className="w-20 h-8 rounded-lg animate-pulse" style={{ background: "var(--border-light)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const allDone = (gscConnected || gscSkipped) && (hasProducts || productsSkipped);

  const gscStatus: StepStatus = gscFetching ? "doing" : gscConnected ? "done" : gscSkipped ? "done" : "todo";
  const productStatus: StepStatus = hasProducts ? "done" : productsSkipped ? "done" : "todo";
  const strategyStatus: StepStatus = "todo";

  return (
    <div className="card-static p-7 mb-5 fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {allDone ? "Setup complete" : "Get set up"}
        </h2>
        {allDone && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded" style={{ background: "var(--low-bg)", color: "var(--success)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            All done
          </span>
        )}
      </div>
      <div className="space-y-3">
        <StepCard
          number={1}
          status={gscStatus}
          title="Connect to Google Search Console"
          description="We&apos;ll pull your top-ranking queries to guide strategy and pillars."
          actionLabel={gscConnected ? "Connected" : gscSkipped ? "Skipped" : "Connect"}
          onAction={() => { window.location.href = `/api/gsc/auth?domainId=${domainId}`; }}
          progressMessage={gscFetching ? GSC_PROGRESS_MESSAGES[gscProgressIdx] : null}
          onSkip={!gscConnected && !gscSkipped ? () => setGscSkipped(true) : undefined}
        />
        <StepCard
          number={2}
          status={productStatus}
          title="Add your Products"
          description="Import a CSV so article heroes use real product photos."
          actionLabel={hasProducts ? "Imported" : productsSkipped ? "Skipped" : "Import"}
          onAction={() => setShowImport(true)}
          onSkip={!hasProducts && !productsSkipped ? () => setProductsSkipped(true) : undefined}
          onRemove={hasProducts && !productsSkipped ? async () => {
            if (!confirm("Remove imported products? You can re-import anytime.")) return;
            await fetch(`/api/products/import`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ domainId, products: [] }),
            });
            refresh();
          } : undefined}
        />
        <StepCard
          number={3}
          status={strategyStatus}
          title="Now let's plan a strategy for you"
          description="Discover low-hanging keywords, find competitor gaps, and build your content pipeline."
          actionLabel="Magic Keyword Planner"
          onAction={() => { window.location.href = `/domain/${domainId}/keyword-planner`; }}
        />
        <StepCard
          number={4}
          status={"todo"}
          title="Make your site AI-ready"
          description="Generate llms.txt so AI engines like ChatGPT, Claude, and Perplexity can discover and cite your content."
          actionLabel="GEO Toolkit"
          onAction={() => { window.location.href = `/domain/${domainId}/geo`; }}
        />
      </div>

      {showImport && (
        <ProductImportModal
          domainId={domainId}
          domainUrl={domainUrl}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refresh(); }}
        />
      )}
    </div>
  );
}

function StepCard({
  number, status, title, description, actionLabel, onAction, progressMessage, onRemove, onSkip,
}: {
  number: number;
  status: StepStatus;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  progressMessage?: string | null;
  onRemove?: () => void;
  onSkip?: () => void;
}) {
  const locked = status === "locked";
  const done = status === "done";
  const doing = status === "doing";
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-lg"
      style={{
        background: done ? "var(--low-bg)" : locked ? "var(--bg)" : "var(--bg)",
        opacity: locked ? 0.55 : 1,
        border: "1px solid var(--border-light)",
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: done ? "var(--low)" : doing ? "var(--accent)" : "var(--border-light)",
          color: done || doing ? "#fff" : "var(--text-muted)",
        }}
      >
        {done ? "✓" : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {progressMessage || description}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
      {done && onRemove && (
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
          style={{ background: "var(--critical-bg)", color: "var(--critical)" }}
          title="Remove and re-import"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      {!done && !doing && onSkip && (
        <button
          onClick={onSkip}
          className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
        >
          Skip
        </button>
      )}
      <button
        disabled={locked || done || doing}
        onClick={onAction}
        className="px-4 py-2 rounded-lg text-xs font-semibold text-white shrink-0 cursor-pointer"
        style={{
          background: done ? "var(--low)" : doing ? "var(--text-muted)" : "var(--accent)",
          cursor: locked || done || doing ? "default" : "pointer",
          opacity: locked ? 0.6 : 1,
        }}
      >
        {doing ? "Fetching..." : actionLabel}
      </button>
      </div>
    </div>
  );
}

/**
 * Parse CSV properly — handles commas inside quoted fields, newlines in quotes,
 * and escaped quotes (""). Standard CSV per RFC 4180.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        row.push(cell);
        cell = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        cell += ch;
      }
    }
  }
  // Last cell/row
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);

  return rows;
}

function pickSiteUrl(sites: string[], domainUrl: string): string | null {
  if (sites.length === 0) return null;
  const host = (() => { try { return new URL(domainUrl).hostname; } catch { return domainUrl; } })();
  const match = sites.find((s) => s.includes(host));
  return match || sites[0];
}

function ProductImportModal({
  domainId, domainUrl, onClose, onImported,
}: {
  domainId: string;
  domainUrl: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) { setErr("CSV must have a header row and at least one product."); return; }
      const header = rows[0].map((h) => h.toLowerCase().trim());
      const ix = {
        name: header.findIndex((h) => h === "name" || h === "title" || h === "product" || h.includes("product name") || h.includes("product title")),
        url: header.findIndex((h) => (h.includes("url") || h.includes("link") || h.includes("handle")) && !h.includes("image") && !h.includes("cdn") && !h.includes("photo")),
        price: header.findIndex((h) => h.includes("price") || h.includes("cost") || h.includes("variant price")),
        desc: header.findIndex((h) => h.includes("desc") || h.includes("body")),
        cat: header.findIndex((h) => h.includes("categ") || h.includes("type") || h.includes("collection") || h.includes("product type")),
        img: header.findIndex((h) => h.includes("image") || h.includes("cdn") || h.includes("photo") || h.includes("picture")),
      };
      if (ix.name === -1) { setErr("CSV must have a 'name' or 'title' column. Found headers: " + header.slice(0, 8).join(", ")); return; }
      // Detect if the URL column is a Shopify "Handle" (not a full URL)
      const isHandleColumn = header[ix.url] === "handle";
      const domainBase = (() => { try { return new URL(domainUrl).origin; } catch { return ""; } })();

      const products = rows.slice(1).map((cols) => {
        const name = cols[ix.name]?.trim() || "";
        let url = ix.url >= 0 ? cols[ix.url]?.trim() || "" : "";
        if (url && !url.startsWith("http")) {
          const path = url.startsWith("/") ? url : `/products/${url}`;
          url = domainBase ? `${domainBase}${path}` : path;
        }
        return {
          name,
          url,
          price: ix.price >= 0 ? cols[ix.price]?.trim() || "" : "",
          description: ix.desc >= 0 ? cols[ix.desc]?.trim().slice(0, 300) || "" : "",
          category: ix.cat >= 0 ? cols[ix.cat]?.trim() || "" : "",
          imageUrl: ix.img >= 0 ? cols[ix.img]?.trim() || "" : "",
        };
      }).filter((p) => p.name && p.name.length > 2);
      if (products.length === 0) { setErr("No valid products found in CSV."); return; }
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, products }),
      });
      if (!res.ok) { setErr("Import failed."); return; }
      onImported();
    } catch {
      setErr("Failed to parse CSV file.");
    } finally {
      setUploading(false);
    }
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
        <h3 className="font-semibold text-base mb-2">Import products</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          CSV needs a name column. Image column (image / cdn / photo) is highly recommended.
        </p>
        <label className="block p-6 text-center rounded-lg cursor-pointer" style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}>
          <p className="text-sm mb-1">Drop your CSV here or click to browse</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {uploading ? "Uploading..." : "Accepts .csv files"}
          </p>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
        {err && <p className="text-xs mt-3" style={{ color: "var(--critical)" }}>{err}</p>}
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="text-sm px-4 py-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
