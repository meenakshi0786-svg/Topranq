import { NextRequest, NextResponse } from "next/server";
import { validateShopDomain, verifyShopifyHmac, getShopAccessToken } from "@/lib/shopify";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com";
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";

// GET /api/shopify/app?shop=xxx.myshopify.com
// Renders the embedded Shopify app HTML (loaded inside Shopify admin iframe).
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const shop = sp.get("shop") || "";

  if (!shop || !validateShopDomain(shop)) {
    return new NextResponse("Invalid shop parameter", { status: 400 });
  }

  // If Shopify added HMAC, verify it
  if (sp.get("hmac") && !verifyShopifyHmac(sp)) {
    return new NextResponse("Invalid HMAC", { status: 401 });
  }

  // Look up the access token
  const connected = await getShopAccessToken(shop);

  // If not connected, kick back to install
  if (!connected) {
    return NextResponse.redirect(`${APP_URL}/api/shopify/install?shop=${encodeURIComponent(shop)}`);
  }

  const html = renderAppHtml(shop, SHOPIFY_CLIENT_ID);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Required to allow embedding inside Shopify admin
      "Content-Security-Policy": `frame-ancestors https://${shop} https://admin.shopify.com;`,
    },
  });
}

function renderAppHtml(shop: string, apiKey: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ranqapex — SEO + GEO Autopilot</title>
  <!-- App Bridge: meta tag must precede the app-bridge.js script, which must be
       the first script on the page. App Bridge auto-attaches the session token
       as a Bearer header to same-origin fetch requests. -->
  <meta name="shopify-api-key" content="${apiKey}" />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      background: #f6f6f7;
      color: #202223;
      line-height: 1.5;
      padding: 24px;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .logo {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, #4F6EF7, #7C5CFC);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 18px;
    }
    h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { color: #6b7177; font-size: 13px; margin-top: 2px; }

    .card {
      background: #fff;
      border: 1px solid #e1e3e5;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .card h2 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .card p { color: #6b7177; font-size: 14px; }

    .connect-box {
      background: linear-gradient(135deg, #f0f5ff, #f5f3ff);
      border: 1px solid #c7d7fe;
    }

    .btn {
      display: inline-block; padding: 10px 18px; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      border: none; text-decoration: none;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4F6EF7, #7C5CFC);
      color: #fff;
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,110,247,0.3); }
    .btn-secondary {
      background: #fff; color: #202223; border: 1px solid #babfc3;
    }
    .btn-secondary:hover { background: #f6f6f7; }

    .empty {
      text-align: center; padding: 48px 24px; color: #6b7177;
    }
    .empty-icon {
      width: 56px; height: 56px; margin: 0 auto 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, #4F6EF7, #7C5CFC);
      display: flex; align-items: center; justify-content: center;
    }
    .stat-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      margin: 16px 0;
    }
    .stat {
      padding: 12px 16px; background: #f6f6f7;
      border-radius: 10px; text-align: center;
    }
    .stat-value { font-size: 22px; font-weight: 800; color: #202223; }
    .stat-label { font-size: 11px; color: #6b7177; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

    .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid #e1e3e5; }
    .tab {
      padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
      background: none; border: none; color: #6b7177;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .tab:hover { color: #202223; }
    .tab.active { color: #4F6EF7; border-bottom-color: #4F6EF7; }

    .article-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 0; border-bottom: 1px solid #e1e3e5;
    }
    .article-row:last-child { border-bottom: none; }
    .article-info { flex: 1; min-width: 0; }
    .article-title { font-size: 14px; font-weight: 600; color: #202223; margin-bottom: 4px; }
    .article-meta { font-size: 11px; color: #6b7177; }
    .badge {
      display: inline-block; font-size: 10px; font-weight: 700;
      padding: 2px 8px; border-radius: 4px;
      background: #dcfce7; color: #166534;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .badge.pending { background: #fef3c7; color: #92400e; }
    .badge.failed { background: #fee2e2; color: #991b1b; }

    .alert {
      padding: 12px 16px; border-radius: 8px;
      background: #fef9c3; color: #854d0e;
      font-size: 13px; margin-bottom: 16px;
    }
    .alert.error { background: #fee2e2; color: #991b1b; }
    .alert.success { background: #dcfce7; color: #166534; }

    .loading { display: inline-block; width: 14px; height: 14px;
      border: 2px solid #e1e3e5; border-top-color: #4F6EF7;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <div class="header">
      <div class="logo">R</div>
      <div>
        <h1>Ranqapex</h1>
        <p class="subtitle">Shop: ${shop}</p>
      </div>
    </div>

    <!-- Status -->
    <div id="alert-area"></div>

    <!-- Link account or article list (rendered by JS) -->
    <div id="content">
      <div class="empty">
        <div class="empty-icon">
          <div class="loading"></div>
        </div>
        <h2 style="margin-bottom:8px; font-size:18px;">Loading...</h2>
      </div>
    </div>
  </div>

  <script>
    const SHOP = ${JSON.stringify(shop)};

    function alertBox(msg, kind) {
      document.getElementById("alert-area").innerHTML =
        '<div class="alert ' + (kind || "") + '">' + msg + '</div>';
    }

    // App Bridge auto-attaches the session token to same-origin fetches, so this
    // call to our backend is authenticated without cookies — required for review.
    async function loadAccount() {
      try {
        const res = await fetch("/api/shopify/embedded/me", { headers: { "Accept": "application/json" } });
        if (res.status === 401) {
          alertBox("Couldn't authenticate this session. Try reloading the app from your Shopify admin.", "error");
          renderError();
          return;
        }
        if (!res.ok) throw new Error("Request failed (" + res.status + ")");
        const data = await res.json();
        renderHome(data);
      } catch (e) {
        alertBox("Something went wrong loading your account. Please reload.", "error");
        renderError();
      }
    }

    function renderHome(data) {
      const content = document.getElementById("content");
      const planLabels = { free: "Free", dollar1: "Starter", dollar5: "Pro" };
      const planName = planLabels[data.plan] || data.plan;
      const credits = data.creditsRemaining != null
        ? data.creditsRemaining + " / " + data.creditsAllowance
        : "—";
      const trialNote = data.trialDaysRemaining > 0
        ? '<span style="font-size:11px;font-weight:600;color:#166534;background:#dcfce7;padding:2px 8px;border-radius:4px;margin-left:8px;">' + data.trialDaysRemaining + '-day trial</span>'
        : "";
      const upgradeLabel = data.plan === "dollar5" ? "Manage plan" : "Upgrade plan";
      content.innerHTML = \`
        <div class="card">
          <div class="stat-row">
            <div class="stat"><div class="stat-value" id="stat-credits">\${credits}</div><div class="stat-label">Credits left</div></div>
            <div class="stat"><div class="stat-value">\${planName}\${trialNote}</div><div class="stat-label">Plan</div></div>
            <div class="stat"><div class="stat-value" id="stat-articles">\${data.articleCount}</div><div class="stat-label">Articles</div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;flex-wrap:wrap;">
            <p style="color:#6b7177;font-size:13px;margin:0;">Each article uses 3 credits. Credits refresh every billing cycle.</p>
            \${data.upgradeUrl ? '<a class="btn btn-primary" href="' + data.upgradeUrl + '" target="_top">' + upgradeLabel + '</a>' : ""}
          </div>
        </div>

        <div class="tabs">
          <button class="tab active" data-tab="generate" onclick="switchTab('generate')">Blog Generator</button>
          <button class="tab" data-tab="audit" onclick="switchTab('audit')">SEO Audit</button>
        </div>

        <div id="tab-generate" class="tab-panel">
          <div class="card">
            <h2>AI Blog Post Generator</h2>
            <p style="margin:8px 0 16px;">Generate an SEO + GEO-optimized article with your products woven in, then publish it to your store blog.</p>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Topic</label>
            <input id="gen-topic" placeholder="e.g. How to choose running shoes for flat feet"
              style="width:100%;padding:10px 12px;border:1px solid #c9cccf;border-radius:8px;font-size:14px;margin-bottom:12px;" />
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Target keywords <span style="color:#8c9196;font-weight:400;">(optional, comma-separated)</span></label>
            <input id="gen-keywords" placeholder="running shoes, flat feet, arch support"
              style="width:100%;padding:10px 12px;border:1px solid #c9cccf;border-radius:8px;font-size:14px;margin-bottom:16px;" />
            <button id="gen-btn" class="btn btn-primary" onclick="generate()">Generate article</button>
            <div id="gen-result" style="margin-top:16px;"></div>
          </div>

          <div class="card">
            <h2>Your articles</h2>
            <div id="articles-list" style="margin-top:8px;"><p style="color:#6b7177;font-size:13px;">Loading…</p></div>
          </div>
        </div>

        <div id="tab-audit" class="tab-panel" style="display:none;">
          <div class="card">
            <h2>SEO Audit</h2>
            <p style="margin:8px 0 16px;">Crawl your storefront and score its SEO health — meta tags, headings, speed, structured data — with prioritized fixes.</p>
            <button id="audit-btn" class="btn btn-primary" onclick="runAudit()">Run SEO audit</button>
            <div id="audit-result" style="margin-top:16px;"></div>
          </div>
        </div>
      \`;
      loadArticles();
      loadAudit();
    }

    function switchTab(name) {
      document.querySelectorAll(".tab-panel").forEach(function(p) { p.style.display = "none"; });
      document.querySelectorAll(".tab").forEach(function(t) { t.classList.toggle("active", t.dataset.tab === name); });
      const panel = document.getElementById("tab-" + name);
      if (panel) panel.style.display = "block";
    }

    async function generate() {
      const topic = document.getElementById("gen-topic").value.trim();
      const keywords = document.getElementById("gen-keywords").value.trim();
      const btn = document.getElementById("gen-btn");
      const result = document.getElementById("gen-result");
      if (!topic) { result.innerHTML = '<div class="alert error">Please enter a topic.</div>'; return; }
      btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Generating… (~30s)';
      result.innerHTML = "";
      try {
        const res = await fetch("/api/shopify/embedded/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, keywords }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        result.innerHTML = \`
          <div class="alert success">Generated "\${data.title}" — \${data.wordCount} words\${data.qualityScore != null ? ", quality " + data.qualityScore + "/100" : ""}\${data.usedProducts ? " · products woven in" : ""}.</div>
          <button class="btn btn-primary" onclick="publish('\${data.articleId}', this)">Publish to store blog</button>
        \`;
        document.getElementById("gen-topic").value = "";
        document.getElementById("gen-keywords").value = "";
        loadArticles();
        refreshCredits();
      } catch (e) {
        result.innerHTML = '<div class="alert error">' + e.message + '</div>';
      }
      btn.disabled = false; btn.innerHTML = "Generate article";
    }

    async function publish(articleId, btn) {
      btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Publishing…';
      try {
        const res = await fetch("/api/shopify/embedded/publish", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Publish failed");
        btn.outerHTML = '<a class="btn btn-secondary" href="' + data.url + '" target="_blank">View published post →</a>';
        loadArticles();
      } catch (e) {
        btn.disabled = false; btn.innerHTML = "Publish to store blog";
        alertBox(e.message, "error");
      }
    }

    async function refreshCredits() {
      try {
        const res = await fetch("/api/shopify/embedded/me", { headers: { "Accept": "application/json" } });
        if (!res.ok) return;
        const data = await res.json();
        const el = document.getElementById("stat-credits");
        if (el && data.creditsRemaining != null) el.textContent = data.creditsRemaining + " / " + data.creditsAllowance;
      } catch (e) { /* ignore */ }
    }

    let auditPoll = null;
    async function runAudit() {
      const btn = document.getElementById("audit-btn");
      const result = document.getElementById("audit-result");
      btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Auditing your store…';
      try {
        const res = await fetch("/api/shopify/embedded/audit", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Audit failed to start");
        result.innerHTML = '<div class="alert">Audit started — crawling and analyzing your store. This can take a minute…</div>';
        if (auditPoll) clearInterval(auditPoll);
        auditPoll = setInterval(loadAudit, 5000);
      } catch (e) {
        btn.disabled = false; btn.innerHTML = "Run SEO audit";
        result.innerHTML = '<div class="alert error">' + e.message + '</div>';
      }
    }

    async function loadAudit() {
      try {
        const res = await fetch("/api/shopify/embedded/audit");
        if (!res.ok) return;
        const d = await res.json();
        const btn = document.getElementById("audit-btn");
        const result = document.getElementById("audit-result");
        if (!result) return;
        if (d.status === "none") { if (btn) { btn.disabled = false; btn.innerHTML = "Run SEO audit"; } return; }

        const running = ["queued", "crawling", "analyzing"].includes(d.status);
        if (btn) { btn.disabled = running; btn.innerHTML = running ? '<span class="loading"></span> Auditing…' : "Re-run SEO audit"; }
        if (running) {
          result.innerHTML = '<div class="alert">Audit in progress (' + d.status + ')… crawled ' + (d.pagesCrawled || 0) + ' pages so far.</div>';
          if (!auditPoll) auditPoll = setInterval(loadAudit, 5000);
          return;
        }
        if (auditPoll) { clearInterval(auditPoll); auditPoll = null; }
        if (d.status === "failed") {
          result.innerHTML = '<div class="alert error">Audit failed: ' + (d.errorMessage || "unknown error") + '. If your storefront is password-protected, disable it and try again.</div>';
          return;
        }
        renderAudit(d, result);
      } catch (e) { /* ignore */ }
    }

    function renderAudit(d, result) {
      const score = d.overallScore != null ? Math.round(d.overallScore) : "—";
      const ic = d.issueCounts || {};
      const scoreColor = score >= 80 ? "#166534" : (score >= 50 ? "#92400e" : "#991b1b");
      let html = \`
        <div class="stat-row" style="grid-template-columns:repeat(4,1fr);">
          <div class="stat"><div class="stat-value" style="color:\${scoreColor}">\${score}</div><div class="stat-label">SEO Score</div></div>
          <div class="stat"><div class="stat-value" style="color:#991b1b">\${ic.critical || 0}</div><div class="stat-label">Critical</div></div>
          <div class="stat"><div class="stat-value" style="color:#92400e">\${ic.high || 0}</div><div class="stat-label">High</div></div>
          <div class="stat"><div class="stat-value">\${d.pagesCrawled || 0}</div><div class="stat-label">Pages</div></div>
        </div>\`;
      if (d.topIssues && d.topIssues.length) {
        html += '<div style="margin-top:8px;">' + d.topIssues.map(function(i) {
          const bc = i.severity === "critical" ? "failed" : (i.severity === "low" ? "" : "pending");
          return '<div class="article-row"><div class="article-info"><div class="article-title">' +
            (i.description || i.issueType) + '</div><div class="article-meta"><span class="badge ' + bc + '">' + i.severity + '</span>' +
            (i.recommendation ? ' &nbsp;' + i.recommendation : '') + '</div></div></div>';
        }).join("") + '</div>';
      } else {
        html += '<p style="color:#166534;font-size:13px;margin-top:12px;">No issues found. 🎉</p>';
      }
      result.innerHTML = html;
    }

    async function loadArticles() {
      try {
        const res = await fetch("/api/shopify/embedded/articles");
        if (!res.ok) return;
        const rows = await res.json();
        const el = document.getElementById("articles-list");
        if (!el) return;
        const statEl = document.getElementById("stat-articles");
        if (statEl) statEl.textContent = rows.length;
        if (!rows.length) { el.innerHTML = '<p style="color:#6b7177;font-size:13px;">No articles yet. Generate your first one above.</p>'; return; }
        el.innerHTML = rows.map(function(a) {
          const badgeClass = a.status === "published" ? "" : (a.status === "rejected" ? "failed" : "pending");
          const right = a.publishedUrl
            ? '<a href="' + a.publishedUrl + '" target="_blank" style="font-size:12px;color:#4F6EF7;text-decoration:none;font-weight:600;">View →</a>'
            : '<button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="publish(\\'' + a.id + '\\', this)">Publish</button>';
          return '<div class="article-row"><div class="article-info"><div class="article-title">' + a.title +
            '</div><div class="article-meta"><span class="badge ' + badgeClass + '">' + a.status + '</span></div></div>' + right + '</div>';
        }).join("");
      } catch (e) { /* ignore */ }
    }

    function renderError() {
      document.getElementById("content").innerHTML =
        '<div class="empty"><h2 style="font-size:18px;">Unable to load</h2><p>Reopen the app from your Shopify admin.</p></div>';
    }

    loadAccount();
  </script>
</body>
</html>`;
}
