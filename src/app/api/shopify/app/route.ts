import { NextRequest, NextResponse } from "next/server";
import { validateShopDomain, verifyShopifyHmac, getShopAccessToken } from "@/lib/shopify";
import { templatesForClient } from "@/lib/blog-templates";

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
      border: 1px solid #e7e9ec;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 2px rgba(31,33,36,.05);
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

    .tabs {
      display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap;
      background: #fff; border: 1px solid #e1e3e5; border-radius: 12px; padding: 5px;
      box-shadow: 0 1px 2px rgba(31,33,36,.04);
    }
    .tab {
      padding: 8px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer;
      background: none; border: none; color: #6b7177; border-radius: 8px;
      transition: background .12s, color .12s;
    }
    .tab:hover { color: #202223; background: #f4f5f7; }
    .tab.active { color: #4F6EF7; background: #eef1ff; }

    /* ── Hero band ── */
    .hero {
      background: linear-gradient(135deg, #4F6EF7, #7C5CFC);
      border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; color: #fff;
      box-shadow: 0 8px 24px rgba(79,110,247,.28);
    }
    .hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .hero-hi { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .hero-sub { font-size: 13.5px; opacity: .9; margin-top: 3px; }
    .btn-hero { background: #fff; color: #4F6EF7; }
    .btn-hero:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.18); }
    .btn-hero-sec { background: rgba(255,255,255,.16); color: #fff; border: 1px solid rgba(255,255,255,.35); }
    .btn-hero-sec:hover { background: rgba(255,255,255,.24); }
    .hero-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12.5px; margin-top: 16px; opacity: .95; }
    .chip { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3); padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 11.5px; }
    .meter-track { height: 8px; background: rgba(255,255,255,.25); border-radius: 999px; margin-top: 8px; overflow: hidden; }
    .meter-fill { height: 100%; background: #fff; border-radius: 999px; transition: width .4s ease; }

    /* ── Templates gallery ── */
    .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-top: 16px; }
    .tpl-card {
      position: relative; background: #fff; border: 1px solid #e1e3e5; border-radius: 12px;
      padding: 18px; cursor: pointer; transition: transform .15s, box-shadow .15s, border-color .15s;
    }
    .tpl-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(31,33,36,.09); border-color: #c7d7fe; }
    .tpl-icon { font-size: 26px; margin-bottom: 10px; }
    .tpl-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .tpl-desc { font-size: 12.5px; color: #6b7177; line-height: 1.45; }
    .tpl-badge {
      position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: 800;
      letter-spacing: .06em; padding: 3px 8px; border-radius: 5px;
    }
    .tpl-badge.free { background: #dcfce7; color: #166534; }
    .tpl-badge.pro { background: linear-gradient(135deg, #4F6EF7, #7C5CFC); color: #fff; }
    .tpl-selected-chip {
      display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600;
      background: #f0f5ff; color: #4F6EF7; border: 1px solid #c7d7fe;
      padding: 6px 10px; border-radius: 8px; margin-bottom: 12px;
    }
    .tpl-selected-chip button { background: none; border: none; cursor: pointer; color: #6b7177; font-size: 13px; padding: 0; }

    /* ── Paywall modal ── */
    .pay-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 1000; }
    .pay-modal { background: #fff; border-radius: 14px; max-width: 440px; width: 100%; padding: 28px; text-align: center; box-shadow: 0 18px 50px rgba(0,0,0,.25); }
    .pay-lock { width: 54px; height: 54px; margin: 0 auto 14px; border-radius: 14px; background: linear-gradient(135deg, #4F6EF7, #7C5CFC); display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .pay-modal h3 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
    .pay-modal p { font-size: 13.5px; color: #6b7177; margin-bottom: 18px; }

    /* ── Onboarding wizard ── */
    .wiz-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; z-index: 999;
    }
    .wiz {
      background: #fff; border-radius: 14px; width: 100%; max-width: 720px;
      max-height: 88vh; overflow-y: auto; padding: 28px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.25);
    }
    .wiz h2 { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    .wiz .sub { color: #6b7177; font-size: 14px; margin-bottom: 20px; }
    .step { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f2f3; }
    .step:last-child { border-bottom: none; }
    .step-icon {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; background: #f1f2f3; color: #8c9196;
    }
    .step.active .step-icon { background: #e7ecff; color: #4F6EF7; }
    .step.done .step-icon { background: #dcfce7; color: #166534; }
    .step-label { font-size: 14px; font-weight: 600; color: #8c9196; }
    .step.active .step-label, .step.done .step-label { color: #202223; }
    .step-note { font-size: 12px; color: #6b7177; margin-left: auto; }
    .kw-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    .kw-table th {
      text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
      color: #6b7177; padding: 8px 10px; border-bottom: 1px solid #e1e3e5; white-space: nowrap;
    }
    .kw-table td { padding: 9px 10px; border-bottom: 1px solid #f1f2f3; }
    .kw-table tr:last-child td { border-bottom: none; }
    .kw-scroll { max-height: 320px; overflow-y: auto; border: 1px solid #e1e3e5; border-radius: 10px; margin-top: 12px; }
    .faq-item { padding: 9px 0; border-bottom: 1px solid #f1f2f3; font-size: 13px; color: #202223; }
    .faq-item:last-child { border-bottom: none; }

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
  <!-- App Bridge nav menu: renders sub-links under the app in Shopify's sidebar.
       The rel="home" link is required and is hidden from the rendered menu. -->
  <ui-nav-menu>
    <a href="/api/shopify/app?shop=${shop}" rel="home">Ranqapex</a>
    <a href="/api/shopify/app?shop=${shop}&tab=generate">Blog Generator</a>
    <a href="/api/shopify/app?shop=${shop}&tab=templates">Templates</a>
    <a href="/api/shopify/app?shop=${shop}&tab=audit">SEO Audit</a>
    <a href="/api/shopify/app?shop=${shop}&tab=visibility">AI Visibility</a>
    <a href="/api/shopify/app?shop=${shop}&tab=keywords">Keywords</a>
    <a href="/api/shopify/app?shop=${shop}&tab=links">Internal Links</a>
    <a href="/api/shopify/app?shop=${shop}&tab=products">Product Links</a>
  </ui-nav-menu>

  <div class="container">

    <!-- Header -->
    <div class="header">
      <div class="logo">R</div>
      <div>
        <h1>Ranqapex</h1>
        <p class="subtitle">Shop: ${shop}</p>
      </div>
    </div>

    <!-- Onboarding wizard (shown on first run) -->
    <div id="wiz-root"></div>

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
    const TEMPLATES = ${JSON.stringify(templatesForClient())};
    let PLAN = "free";
    let selectedTemplate = null;

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
      const planLabels = { free: "Free", starter: "Starter", growth: "Growth", dollar1: "Starter", dollar5: "Pro" };
      const planName = planLabels[data.plan] || data.plan;
      const credits = data.creditsRemaining != null
        ? data.creditsRemaining + " / " + data.creditsAllowance
        : "—";
      const trialNote = data.trialDaysRemaining > 0
        ? '<span class="chip">🎁 ' + data.trialDaysRemaining + '-day trial</span>'
        : "";
      const upgradeLabel = data.plan === "growth" ? "Manage plan" : "Upgrade plan";
      const storeName = data.storeName || data.shop.replace(".myshopify.com", "").split("-").map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
      const pct = data.creditsAllowance ? Math.max(0, Math.min(100, Math.round((data.creditsRemaining / data.creditsAllowance) * 100))) : 0;
      let resetStr = "";
      try { resetStr = new Date(data.periodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) {}
      content.innerHTML = \`
        <div class="hero">
          <div class="hero-top">
            <div>
              <div class="hero-hi">Hey \${storeName} 👋</div>
              <div class="hero-sub">Your AI SEO content team is on it — audits, keywords, articles, publishing. We've got it covered.</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-hero-sec" onclick="startOnboarding()">Build my SEO plan</button>
              \${data.upgradeUrl ? '<a class="btn btn-hero" href="' + data.upgradeUrl + '" target="_top">' + upgradeLabel + '</a>' : ""}
            </div>
          </div>
          <div class="hero-meta">
            <span><strong id="stat-credits">\${credits}</strong> credits</span>
            <span class="chip">\${planName} plan</span>
            \${trialNote}
            <span><strong id="stat-articles">\${data.articleCount}</strong> articles created</span>
            \${resetStr ? '<span style="margin-left:auto;">Credits reset ' + resetStr + '</span>' : ""}
          </div>
          <div class="meter-track"><div class="meter-fill" id="credit-bar" style="width:\${pct}%"></div></div>
        </div>

        <div class="tabs">
          <button class="tab active" data-tab="generate" onclick="switchTab('generate')">✍️ Blog Generator</button>
          <button class="tab" data-tab="templates" onclick="switchTab('templates')">📐 Templates</button>
          <button class="tab" data-tab="audit" onclick="switchTab('audit')">🔍 SEO Audit</button>
          <button class="tab" data-tab="visibility" onclick="switchTab('visibility')">🤖 AI Visibility</button>
          <button class="tab" data-tab="keywords" onclick="switchTab('keywords')">🎯 Keywords</button>
          <button class="tab" data-tab="links" onclick="switchTab('links')">🔗 Internal Links</button>
          <button class="tab" data-tab="products" onclick="switchTab('products')">🛍️ Product Links</button>
        </div>

        <div id="tab-generate" class="tab-panel">
          <div class="card">
            <h2>AI Blog Post Generator</h2>
            <p style="margin:8px 0 16px;">Generate an SEO + GEO-optimized article with your products woven in, then publish it to your store blog.</p>
            <div id="tpl-chip"></div>
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

        <div id="tab-templates" class="tab-panel" style="display:none;">
          <div class="card">
            <h2>Article Templates</h2>
            <p style="margin:8px 0 4px;">Proven article formats that rank. Pick one — it structures your next generated post. <strong>2 free</strong>, 8 with Starter/Growth.</p>
            <div id="tpl-grid" class="tpl-grid"></div>
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

        <div id="tab-visibility" class="tab-panel" style="display:none;">
          <div class="card">
            <h2>AI Visibility (GEO)</h2>
            <p style="margin:8px 0 16px;">See whether AI search engines — ChatGPT, Perplexity, Gemini, Claude — mention and cite your brand for real buyer questions.</p>
            <button id="vis-btn" class="btn btn-primary" onclick="runVisibility()">Run AI visibility scan</button>
            <span style="font-size:12px;color:#8c9196;margin-left:8px;" id="vis-cost"></span>
            <div id="vis-result" style="margin-top:16px;"></div>
          </div>
        </div>

        <div id="tab-keywords" class="tab-panel" style="display:none;">
          <div class="card">
            <h2>Keyword Discovery</h2>
            <p style="margin:8px 0 16px;">Find keyword and topic opportunities for your store. Click any keyword to start an article on it.</p>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Competitor domain <span style="color:#8c9196;font-weight:400;">(optional — steal their keywords)</span></label>
            <input id="kw-competitor" placeholder="e.g. competitor.com — leave empty for general discovery"
              style="width:100%;padding:10px 12px;border:1px solid #c9cccf;border-radius:8px;font-size:14px;margin-bottom:14px;" />
            <button id="kw-btn" class="btn btn-primary" onclick="runKeywords()">Discover keywords</button>
            <span style="font-size:12px;color:#8c9196;margin-left:8px;" id="kw-cost"></span>
            <div id="kw-result" style="margin-top:16px;"></div>
          </div>
        </div>

        <div id="tab-links" class="tab-panel" style="display:none;">
          <div class="card">
            <h2>Internal Link Suggestions</h2>
            <p style="margin:8px 0 16px;">Find high-value internal links between your store pages to boost SEO and keep visitors browsing. Run an SEO audit first so we have your pages.</p>
            <button id="links-btn" class="btn btn-primary" onclick="runInternalLinks()">Suggest internal links</button>
            <span style="font-size:12px;color:#8c9196;margin-left:8px;">Uses 2 credits.</span>
            <div id="links-result" style="margin-top:16px;"></div>
          </div>
        </div>

        <div id="tab-products" class="tab-panel" style="display:none;">
          <div class="card">
            <h2>Product Links in Articles</h2>
            <p style="margin:8px 0 16px;">Automatically weave links to your real products into your existing blog articles — turning readers into buyers.</p>
            <button id="prod-btn" class="btn btn-primary" onclick="runProductLinks()">Add product links to articles</button>
            <span style="font-size:12px;color:#8c9196;margin-left:8px;">Uses 2 credits.</span>
            <div id="prod-result" style="margin-top:16px;"></div>
          </div>
        </div>
      \`;
      PLAN = data.plan || "free";
      renderTemplates();
      loadArticles();
      loadAudit();
      loadVisibility();
      loadKeywords();

      // Honor ?tab= from the sidebar nav menu (and make tabs deep-linkable).
      try {
        const wanted = new URLSearchParams(window.location.search).get("tab");
        if (wanted && document.getElementById("tab-" + wanted)) switchTab(wanted);
      } catch (e) { /* ignore */ }

      // First run after install → launch the onboarding wizard automatically.
      wizState.upgradeUrl = data.upgradeUrl || null;
      let onboarded = true;
      try { onboarded = localStorage.getItem(WIZ_KEY) === "1"; } catch (e) { onboarded = true; }
      if (!onboarded) startOnboarding();
    }

    // ── Onboarding wizard ────────────────────────────────────────────
    const WIZ_KEY = "ranqapex_onboarded_" + SHOP;
    let wizState = { competitors: [], keywords: [], metrics: null, upgradeUrl: null };

    function wizStepsHtml(active, notes) {
      const steps = [
        ["sync-p", "Syncing your products"],
        ["sync-c", "Syncing your collections"],
        ["comp",   "Researching your competition"],
        ["kw",     "Finding your best keywords"],
      ];
      return steps.map(function(s, i) {
        const state = i < active ? "done" : (i === active ? "active" : "");
        const icon = i < active ? "✓" : (i === active ? '<span class="loading"></span>' : String(i + 1));
        const note = notes[s[0]] ? '<span class="step-note">' + notes[s[0]] + '</span>' : "";
        return '<div class="step ' + state + '"><div class="step-icon">' + icon + '</div>' +
               '<div class="step-label">' + s[1] + '</div>' + note + '</div>';
      }).join("");
    }

    function renderWizProgress(active, notes) {
      document.getElementById("wiz-root").innerHTML =
        '<div class="wiz-overlay"><div class="wiz">' +
          '<h2>Setting up Ranqapex for your store</h2>' +
          '<p class="sub">We\\'re analyzing your catalog and competition to build your SEO plan. This takes about a minute.</p>' +
          wizStepsHtml(active, notes || {}) +
        '</div></div>';
    }

    function closeWizard() {
      try { localStorage.setItem(WIZ_KEY, "1"); } catch (e) {}
      document.getElementById("wiz-root").innerHTML = "";
    }

    async function startOnboarding() {
      const notes = {};
      try {
        // Step 1 + 2: sync products and collections
        renderWizProgress(0, notes);
        const syncRes = await fetch("/api/shopify/embedded/onboarding?step=sync", { method: "POST" });
        const sync = await syncRes.json();
        if (!syncRes.ok) throw new Error(sync.error || "Product sync failed");
        notes["sync-p"] = sync.products + " products";
        renderWizProgress(1, notes);
        await new Promise(function(r) { setTimeout(r, 400); });
        notes["sync-c"] = sync.collections + " collections";

        // Step 3: competitor research
        renderWizProgress(2, notes);
        const compRes = await fetch("/api/shopify/embedded/onboarding?step=competitors", { method: "POST" });
        const comp = await compRes.json();
        if (!compRes.ok) throw new Error(comp.error || "Competitor research failed");
        wizState.competitors = (comp.competitors || []).map(function(c) { return c.domain; });
        notes["comp"] = wizState.competitors.length + " competitors";

        // Step 4: keyword research (Opus)
        renderWizProgress(3, notes);
        const kwRes = await fetch("/api/shopify/embedded/onboarding?step=keywords", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitors: wizState.competitors }),
        });
        const kw = await kwRes.json();
        if (kw.emptyCatalog) { renderWizEmptyCatalog(); return; }
        if (!kwRes.ok) throw new Error(kw.error || "Keyword research failed");
        wizState.keywords = kw.keywords || [];
        renderWizKeywords(kw);
      } catch (e) {
        document.getElementById("wiz-root").innerHTML =
          '<div class="wiz-overlay"><div class="wiz">' +
            '<h2>Setup didn\\'t finish</h2>' +
            '<div class="alert error" style="margin-top:12px;">' + e.message + '</div>' +
            '<div style="margin-top:16px;display:flex;gap:8px;">' +
              '<button class="btn btn-primary" onclick="startOnboarding()">Try again</button>' +
              '<button class="btn btn-secondary" onclick="closeWizard()">Skip for now</button>' +
            '</div>' +
          '</div></div>';
      }
    }

    function renderWizEmptyCatalog() {
      document.getElementById("wiz-root").innerHTML =
        '<div class="wiz-overlay"><div class="wiz">' +
          '<h2>Add products to unlock your SEO plan</h2>' +
          '<p class="sub">Ranqapex builds your keyword plan from your real product catalogue and collections — but your store doesn\\'t have any yet.</p>' +
          '<div class="alert">Add at least one product (and ideally a collection) in <strong>Products</strong>, then come back and click <strong>Build my SEO plan</strong>.</div>' +
          '<div style="margin-top:16px;display:flex;gap:8px;">' +
            '<a class="btn btn-primary" href="https://admin.shopify.com/store/' + SHOP.replace(".myshopify.com","") + '/products/new" target="_top">Add a product</a>' +
            '<button class="btn btn-secondary" onclick="closeWizard()">Close</button>' +
          '</div>' +
        '</div></div>';
    }

    function renderWizKeywords(kw) {
      const rows = wizState.keywords.map(function(k) {
        return '<tr><td><strong>' + k.keyword + '</strong></td>' +
               '<td><span class="badge ' + (k.intent === "informational" ? "pending" : "") + '">' + k.intent + '</span></td>' +
               '<td style="color:#6b7177;">' + (k.rationale || "") + '</td></tr>';
      }).join("");
      document.getElementById("wiz-root").innerHTML =
        '<div class="wiz-overlay"><div class="wiz">' +
          '<h2>' + wizState.keywords.length + ' high-intent keywords for your store</h2>' +
          '<p class="sub">Based on your ' + kw.productCount + ' products, ' + kw.collectionCount +
            ' collections, and ' + wizState.competitors.length + ' competitors' +
            (wizState.competitors.length ? ' (' + wizState.competitors.slice(0, 3).join(", ") + ')' : '') + '.</p>' +
          '<div class="kw-scroll"><table class="kw-table">' +
            '<thead><tr><th>Keyword</th><th>Intent</th><th>Targets</th></tr></thead><tbody>' + rows + '</tbody>' +
          '</table></div>' +
          '<div style="margin-top:18px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
            '<button id="wiz-metrics-btn" class="btn btn-primary" onclick="fetchWizMetrics()">Let\\'s find these metrics</button>' +
            '<button class="btn btn-secondary" onclick="closeWizard()">Skip for now</button>' +
            '<span style="font-size:12px;color:#8c9196;">Fetches real search volume &amp; difficulty.</span>' +
          '</div>' +
        '</div></div>';
    }

    async function fetchWizMetrics() {
      const btn = document.getElementById("wiz-metrics-btn");
      btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Fetching live metrics…';
      try {
        const res = await fetch("/api/shopify/embedded/keyword-metrics", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: wizState.keywords.map(function(k) { return k.keyword; }) }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Couldn't fetch metrics");
        wizState.metrics = d;
        renderWizPlan(d);
        refreshCredits();
      } catch (e) {
        btn.disabled = false; btn.innerHTML = "Let's find these metrics";
        const box = document.createElement("div");
        box.className = "alert error"; box.style.marginTop = "12px"; box.textContent = e.message;
        btn.parentNode.appendChild(box);
      }
    }

    function renderWizPlan(d) {
      const withVol = (d.metrics || []).filter(function(m) { return m.volume != null; });
      const totalVol = withVol.reduce(function(s, m) { return s + (m.volume || 0); }, 0);
      const easy = withVol.filter(function(m) { return (m.difficulty || 0) <= 30; }).length;

      const rows = (d.metrics || []).slice(0, 50).map(function(m) {
        const diff = m.difficulty == null ? "—" : m.difficulty;
        const diffColor = m.difficulty == null ? "#6b7177" : (m.difficulty <= 30 ? "#166534" : (m.difficulty <= 60 ? "#92400e" : "#991b1b"));
        return '<tr><td><strong>' + m.keyword + '</strong></td>' +
               '<td>' + (m.volume != null ? m.volume.toLocaleString() : "—") + '</td>' +
               '<td style="color:' + diffColor + ';font-weight:700;">' + diff + '</td>' +
               '<td style="color:#6b7177;">' + (m.topCompetitor || "—") + '</td></tr>';
      }).join("");

      const faqs = (d.peopleAlsoAsk || []).map(function(q) {
        return '<div class="faq-item">• ' + q + '</div>';
      }).join("");

      document.getElementById("wiz-root").innerHTML =
        '<div class="wiz-overlay"><div class="wiz">' +
          '<h2>Your page-1 ranking plan</h2>' +
          '<p class="sub">Based on your product catalogue, collections, and competitor research, these are the keywords we\\'re aiming to rank you on page 1 for.</p>' +
          '<div class="stat-row">' +
            '<div class="stat"><div class="stat-value">' + wizState.keywords.length + '</div><div class="stat-label">Keywords</div></div>' +
            '<div class="stat"><div class="stat-value">' + totalVol.toLocaleString() + '</div><div class="stat-label">Monthly searches</div></div>' +
            '<div class="stat"><div class="stat-value" style="color:#166534;">' + easy + '</div><div class="stat-label">Easy wins</div></div>' +
          '</div>' +
          '<div class="kw-scroll"><table class="kw-table">' +
            '<thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>Ranking now</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>' +
          (faqs ? '<h2 style="font-size:15px;margin-top:20px;">People also ask</h2>' +
                  '<p class="sub" style="margin-bottom:8px;">We\\'ll answer these in your content to win featured snippets.</p>' + faqs : "") +
          '<div style="margin-top:22px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
            '<button class="btn btn-primary" onclick="executePlan()">Execute this plan</button>' +
            '<button class="btn btn-secondary" onclick="closeWizard()">Maybe later</button>' +
          '</div>' +
        '</div></div>';
    }

    function executePlan() {
      // Executing the plan requires a paid subscription — send them to Shopify's
      // managed pricing page. Mark onboarding done so it doesn't re-trigger.
      try { localStorage.setItem(WIZ_KEY, "1"); } catch (e) {}
      if (wizState.upgradeUrl) window.open(wizState.upgradeUrl, "_top");
      else closeWizard();
    }

    function switchTab(name) {
      document.querySelectorAll(".tab-panel").forEach(function(p) { p.style.display = "none"; });
      document.querySelectorAll(".tab").forEach(function(t) { t.classList.toggle("active", t.dataset.tab === name); });
      const panel = document.getElementById("tab-" + name);
      if (panel) panel.style.display = "block";
    }

    // ── Templates ────────────────────────────────────────────────────
    function renderTemplates() {
      const grid = document.getElementById("tpl-grid");
      if (!grid) return;
      grid.innerHTML = TEMPLATES.map(function(t) {
        const locked = t.premium && PLAN === "free";
        return '<div class="tpl-card" onclick="selectTemplate(\\'' + t.id + '\\')">' +
          '<span class="tpl-badge ' + (t.premium ? "pro" : "free") + '">' + (t.premium ? (locked ? "🔒 PRO" : "PRO") : "FREE") + '</span>' +
          '<div class="tpl-icon">' + t.icon + '</div>' +
          '<div class="tpl-name">' + t.name + '</div>' +
          '<div class="tpl-desc">' + t.description + '</div>' +
        '</div>';
      }).join("");
    }

    function selectTemplate(id) {
      const t = TEMPLATES.find(function(x) { return x.id === id; });
      if (!t) return;
      if (t.premium && PLAN === "free") { showPaywall(t); return; }
      selectedTemplate = t;
      const chip = document.getElementById("tpl-chip");
      if (chip) chip.innerHTML =
        '<span class="tpl-selected-chip">' + t.icon + ' Template: <strong>' + t.name + '</strong>' +
        '<button onclick="clearTemplate()" title="Remove template">✕</button></span>';
      const topic = document.getElementById("gen-topic");
      if (topic && !topic.value) topic.placeholder = "e.g. " + t.exampleTopic;
      switchTab("generate");
      if (topic) topic.focus();
    }

    function clearTemplate() {
      selectedTemplate = null;
      const chip = document.getElementById("tpl-chip");
      if (chip) chip.innerHTML = "";
    }

    function showPaywall(t) {
      const root = document.getElementById("wiz-root");
      root.innerHTML =
        '<div class="pay-overlay" onclick="if(event.target===this)this.remove()">' +
          '<div class="pay-modal">' +
            '<div class="pay-lock">🔒</div>' +
            '<h3>' + t.icon + ' ' + t.name + ' is a premium template</h3>' +
            '<p>Unlock all 10 proven article templates — comparisons, buying guides, gift guides and more — with the Starter ($29/mo) or Growth ($99/mo) plan. 7-day free trial.</p>' +
            '<div style="display:flex;gap:8px;justify-content:center;">' +
              (wizState.upgradeUrl ? '<a class="btn btn-primary" href="' + wizState.upgradeUrl + '" target="_top">Start free trial</a>' : "") +
              '<button class="btn btn-secondary" onclick="document.querySelector(\\'.pay-overlay\\').remove()">Maybe later</button>' +
            '</div>' +
          '</div>' +
        '</div>';
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
          body: JSON.stringify({ topic, keywords, template: selectedTemplate ? selectedTemplate.id : undefined }),
        });
        const data = await res.json();
        if (data.premiumTemplate) {
          const t = selectedTemplate; clearTemplate();
          btn.disabled = false; btn.innerHTML = "Generate article";
          showPaywall(t); return;
        }
        if (!res.ok) throw new Error(data.error || "Generation failed");
        clearTemplate();
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
        const bar = document.getElementById("credit-bar");
        if (bar && data.creditsAllowance) {
          bar.style.width = Math.max(0, Math.min(100, Math.round((data.creditsRemaining / data.creditsAllowance) * 100))) + "%";
        }
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

    const ENGINE_LABELS = { perplexity: "Perplexity", chatgpt: "ChatGPT", gemini: "Gemini", claude: "Claude" };

    async function loadVisibility() {
      try {
        const res = await fetch("/api/shopify/embedded/visibility");
        if (!res.ok) return;
        const d = await res.json();
        const costEl = document.getElementById("vis-cost");
        if (costEl) costEl.textContent = "Uses " + (d.cost || 20) + " credits per scan.";
        if (d.status === "complete") renderVisibility(d, document.getElementById("vis-result"), true);
      } catch (e) { /* ignore */ }
    }

    async function runVisibility() {
      const btn = document.getElementById("vis-btn");
      const result = document.getElementById("vis-result");
      btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Scanning AI engines… (~1 min)';
      result.innerHTML = "";
      try {
        const res = await fetch("/api/shopify/embedded/visibility", { method: "POST" });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Scan failed");
        renderVisibility(d, result, false);
        refreshCredits();
      } catch (e) {
        result.innerHTML = '<div class="alert error">' + e.message + '</div>';
      }
      btn.disabled = false; btn.innerHTML = "Re-run AI visibility scan";
    }

    function renderVisibility(d, result, cached) {
      if (!result) return;
      const score = d.overallScore != null ? Math.round(d.overallScore) : "—";
      const scoreColor = score >= 60 ? "#166534" : (score >= 30 ? "#92400e" : "#991b1b");
      let html = \`
        <div class="stat-row">
          <div class="stat"><div class="stat-value" style="color:\${scoreColor}">\${score}</div><div class="stat-label">AI Visibility</div></div>
          <div class="stat"><div class="stat-value">\${d.mentionRate != null ? d.mentionRate + "%" : "—"}</div><div class="stat-label">Mentioned</div></div>
          <div class="stat"><div class="stat-value">\${d.citationRate != null ? d.citationRate + "%" : "—"}</div><div class="stat-label">Cited</div></div>
        </div>\`;
      if (d.engines && d.engines.length && d.engines[0].score != null) {
        html += '<div style="margin-top:8px;">' + d.engines.map(function(e) {
          return '<div class="article-row"><div class="article-info"><div class="article-title">' +
            (ENGINE_LABELS[e.engine] || e.engine) + '</div><div class="article-meta">mentioned ' + e.mentionRate + '% · cited ' + e.citationRate + '%</div></div>' +
            '<span class="stat-value" style="font-size:18px;">' + e.score + '</span></div>';
        }).join("") + '</div>';
      }
      if (cached) html += '<p style="color:#8c9196;font-size:12px;margin-top:10px;">Last scan result. Re-run for fresh data.</p>';
      result.innerHTML = html;
    }

    async function loadKeywords() {
      try {
        const res = await fetch("/api/shopify/embedded/keywords");
        if (!res.ok) return;
        const d = await res.json();
        const costEl = document.getElementById("kw-cost");
        if (costEl) costEl.textContent = "Uses " + (d.cost || 2) + " credits per run.";
        if (d.keywords && d.keywords.length) renderKeywords(d.keywords, document.getElementById("kw-result"));
      } catch (e) { /* ignore */ }
    }

    async function runKeywords() {
      const btn = document.getElementById("kw-btn");
      const result = document.getElementById("kw-result");
      const competitorDomain = (document.getElementById("kw-competitor").value || "").trim();
      btn.disabled = true;
      btn.innerHTML = '<span class="loading"></span> ' + (competitorDomain ? 'Mining ' + competitorDomain + '…' : 'Discovering keywords…');
      result.innerHTML = "";
      try {
        const res = await fetch("/api/shopify/embedded/keywords", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitorDomain }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Discovery failed");
        if (!d.keywords || !d.keywords.length) { result.innerHTML = '<div class="alert">No keywords found. Try running an SEO audit first so we have store data to work from.</div>'; }
        else renderKeywords(d.keywords, result);
        refreshCredits();
      } catch (e) {
        result.innerHTML = '<div class="alert error">' + e.message + '</div>';
      }
      btn.disabled = false; btn.innerHTML = "Re-discover keywords";
    }

    function renderKeywords(keywords, result) {
      if (!result) return;
      result.innerHTML = keywords.map(function(k) {
        const diff = (k.difficulty || "").toLowerCase();
        const bc = diff === "high" ? "failed" : (diff === "low" ? "" : "pending");
        return '<div class="article-row"><div class="article-info"><div class="article-title">' + k.keyword +
          '</div><div class="article-meta"><span class="badge ' + bc + '">' + (k.difficulty || "") + '</span> &nbsp;' +
          (k.intent || "") + (k.relevancyScore != null ? ' · relevance ' + k.relevancyScore : '') + '</div></div>' +
          '<button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="useKeyword(\\'' + k.keyword.replace(/'/g, "\\\\'") + '\\')">Write article</button></div>';
      }).join("");
    }

    function useKeyword(kw) {
      switchTab("generate");
      const t = document.getElementById("gen-topic");
      const k = document.getElementById("gen-keywords");
      if (t) t.value = kw;
      if (k) k.value = kw;
      if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function runInternalLinks() {
      const btn = document.getElementById("links-btn");
      const result = document.getElementById("links-result");
      btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Analyzing…';
      result.innerHTML = "";
      try {
        const res = await fetch("/api/shopify/embedded/internal-links", { method: "POST" });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed");
        const s = d.stats || {};
        let html = '<div class="alert success">Analyzed ' + (s.totalPages || 0) + ' pages · ' + (d.suggestions ? d.suggestions.length : 0) + ' suggestions · ' + (s.orphanCount || 0) + ' orphan pages.</div>';
        if (d.suggestions && d.suggestions.length) {
          html += d.suggestions.map(function(x) {
            const bc = x.priority === "high" ? "failed" : (x.priority === "low" ? "" : "pending");
            return '<div class="article-row"><div class="article-info"><div class="article-title">' + x.sourceTitle + ' → ' + x.targetTitle +
              '</div><div class="article-meta"><span class="badge ' + bc + '">' + x.priority + '</span> &nbsp;anchor: "' + x.anchorText + '" · ' + x.reason + '</div></div></div>';
          }).join("");
        } else {
          html += '<p style="color:#6b7177;font-size:13px;margin-top:8px;">No suggestions yet. Run an SEO audit first so we can crawl your store pages.</p>';
        }
        result.innerHTML = html;
        refreshCredits();
      } catch (e) {
        result.innerHTML = '<div class="alert error">' + e.message + '</div>';
      }
      btn.disabled = false; btn.innerHTML = "Re-analyze internal links";
    }

    async function runProductLinks() {
      const btn = document.getElementById("prod-btn");
      const result = document.getElementById("prod-result");
      btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Weaving products in…';
      result.innerHTML = "";
      try {
        const res = await fetch("/api/shopify/embedded/product-links", { method: "POST" });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed");
        const s = d.stats || {};
        let html = \`
          <div class="stat-row">
            <div class="stat"><div class="stat-value">\${s.totalLinksInserted || 0}</div><div class="stat-label">Links added</div></div>
            <div class="stat"><div class="stat-value">\${s.articlesAnalyzed || 0}</div><div class="stat-label">Articles</div></div>
            <div class="stat"><div class="stat-value">\${s.productsMatched || 0}</div><div class="stat-label">Products used</div></div>
          </div>\`;
        if (d.articleDetails && d.articleDetails.length) {
          html += d.articleDetails.filter(function(a){return a.linksAdded > 0;}).map(function(a) {
            return '<div class="article-row"><div class="article-info"><div class="article-title">' + a.title +
              '</div><div class="article-meta">' + a.linksAdded + ' product link(s): ' + (a.products || []).join(", ") + '</div></div></div>';
          }).join("");
        }
        result.innerHTML = html;
        refreshCredits();
      } catch (e) {
        result.innerHTML = '<div class="alert error">' + e.message + '</div>';
      }
      btn.disabled = false; btn.innerHTML = "Re-run product links";
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
