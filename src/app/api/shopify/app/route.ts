import { NextRequest, NextResponse } from "next/server";
import { validateShopDomain, verifyShopifyHmac, getShopAccessToken } from "@/lib/shopify";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com";
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";

// GET /api/shopify/app?shop=xxx.myshopify.com
// Renders the embedded Shopify app HTML (loaded inside Shopify admin iframe).
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const shop = sp.get("shop") || "";
  const host = sp.get("host") || "";

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

  const html = renderAppHtml(shop, host, SHOPIFY_CLIENT_ID, APP_URL);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Required to allow embedding inside Shopify admin
      "Content-Security-Policy": `frame-ancestors https://${shop} https://admin.shopify.com;`,
    },
  });
}

function renderAppHtml(shop: string, host: string, apiKey: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ranqapex — SEO + GEO Autopilot</title>
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
    const HOST = ${JSON.stringify(host)};
    const API_KEY = ${JSON.stringify(apiKey)};
    const APP_URL = ${JSON.stringify(appUrl)};

    // Initialize Shopify App Bridge
    if (window["app-bridge"] && HOST) {
      window["app-bridge"].createApp({
        apiKey: API_KEY,
        host: HOST,
      });
    }

    // For now, the embedded app simply asks the user to sign into Ranqapex
    // and pick which of their Ranqapex articles to publish.
    function render() {
      const content = document.getElementById("content");
      content.innerHTML = \`
        <div class="card connect-box">
          <h2>Connect this store to your Ranqapex account</h2>
          <p style="margin: 8px 0 16px;">
            You're installed! To start publishing AI-generated articles to your Shopify blog,
            sign in to Ranqapex and link this store to a domain.
          </p>
          <a href="\${APP_URL}/dashboard?shopify_link=\${encodeURIComponent(SHOP)}" target="_blank" class="btn btn-primary">
            Open Ranqapex Dashboard →
          </a>
        </div>

        <div class="card">
          <h2>What happens next</h2>
          <ol style="margin: 12px 0 0 18px; color: #6b7177; font-size: 13px; line-height: 1.8;">
            <li>Open the Ranqapex dashboard (link above) and sign in with Google</li>
            <li>Go to your domain's "Connectors" page</li>
            <li>You'll see this Shopify store listed as connected</li>
            <li>Generate articles in Ranqapex, then click "Publish to Shopify" — they appear in your store's blog</li>
          </ol>
        </div>

        <div class="card">
          <h2>About Ranqapex</h2>
          <p>Ranqapex is an AI-powered SEO and GEO platform that audits your site, finds keyword opportunities, generates editorial articles with your products woven in, and creates llms.txt so ChatGPT and Perplexity can cite your content. Plans from $1.</p>
          <a href="\${APP_URL}" target="_blank" style="display:inline-block;margin-top:10px;color:#4F6EF7;text-decoration:none;font-size:13px;font-weight:600;">Learn more at ranqapex.com →</a>
        </div>
      \`;
    }

    render();
  </script>
</body>
</html>`;
}
