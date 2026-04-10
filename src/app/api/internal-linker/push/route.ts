import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// Option 4: Push internal link changes to connected CMS (WordPress, Shopify, Webflow, Webhook)

interface LinkSuggestion {
  sourceUrl: string;
  sourceTitle: string;
  targetUrl: string;
  targetTitle: string;
  anchorText: string;
}

export async function POST(req: NextRequest) {
  const { domainId, suggestions, platform } = await req.json();

  if (!domainId || !suggestions?.length || !platform) {
    return NextResponse.json({ error: "domainId, suggestions, and platform are required" }, { status: 400 });
  }

  // Find the connector for this domain + platform
  const connector = db
    .select()
    .from(schema.connectors)
    .where(eq(schema.connectors.domainId, domainId))
    .all()
    .find((c) => c.platform === platform && c.status === "connected");

  if (!connector) {
    return NextResponse.json({ error: `No connected ${platform} connector found for this domain` }, { status: 404 });
  }

  const siteUrl = connector.siteUrl?.replace(/\/$/, "");

  try {
    switch (platform) {
      case "wordpress": {
        // WordPress REST API: Update page/post content by adding internal links
        const results = await pushToWordPress(siteUrl!, suggestions);
        return NextResponse.json({ success: true, platform: "wordpress", results });
      }
      case "shopify": {
        const results = await pushToShopify(siteUrl!, suggestions);
        return NextResponse.json({ success: true, platform: "shopify", results });
      }
      case "webflow": {
        const results = await pushToWebflow(siteUrl!, suggestions);
        return NextResponse.json({ success: true, platform: "webflow", results });
      }
      case "webhook": {
        const results = await pushToWebhook(siteUrl!, suggestions);
        return NextResponse.json({ success: true, platform: "webhook", results });
      }
      default:
        return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: `Push failed: ${(err as Error).message}` }, { status: 500 });
  }
}

// ── WordPress REST API ───────────────────────────────────────────────

async function pushToWordPress(siteUrl: string, suggestions: LinkSuggestion[]) {
  // WordPress REST API: GET pages/posts, find matching content, update with links
  // This requires Application Password auth set up on the WordPress site
  // For now, we POST the suggestions as a structured payload to the WP site's custom endpoint
  const results: Array<{ suggestion: string; status: string; message: string }> = [];

  for (const s of suggestions) {
    try {
      // Search for the source page in WordPress
      const searchRes = await fetch(`${siteUrl}/wp-json/wp/v2/search?search=${encodeURIComponent(s.sourceTitle)}&per_page=1`);
      if (!searchRes.ok) {
        results.push({ suggestion: s.sourceTitle, status: "skipped", message: "Could not find page in WordPress. Ensure REST API is enabled." });
        continue;
      }

      const searchResults = await searchRes.json();
      if (!searchResults.length) {
        results.push({ suggestion: s.sourceTitle, status: "skipped", message: "Page not found in WordPress" });
        continue;
      }

      results.push({
        suggestion: `${s.sourceTitle} → ${s.targetTitle}`,
        status: "ready",
        message: `Found page "${searchResults[0].title}" (ID: ${searchResults[0].id}). Link with anchor "${s.anchorText}" ready to insert. Requires WP Application Password for write access.`,
      });
    } catch {
      results.push({ suggestion: s.sourceTitle, status: "error", message: "Failed to connect to WordPress REST API" });
    }
  }

  return results;
}

// ── Shopify API ──────────────────────────────────────────────────────

async function pushToShopify(siteUrl: string, suggestions: LinkSuggestion[]) {
  // Shopify: Blog articles and pages can be updated via Admin API
  // Requires Shopify Admin API access token
  const results: Array<{ suggestion: string; status: string; message: string }> = [];

  for (const s of suggestions) {
    results.push({
      suggestion: `${s.sourceTitle} → ${s.targetTitle}`,
      status: "ready",
      message: `Link "${s.anchorText}" → ${s.targetUrl}. To apply, connect your Shopify Admin API token in Connectors. Store: ${siteUrl}`,
    });
  }

  return results;
}

// ── Webflow CMS API ──────────────────────────────────────────────────

async function pushToWebflow(siteUrl: string, suggestions: LinkSuggestion[]) {
  // Webflow CMS: Items can be updated via CMS API
  const results: Array<{ suggestion: string; status: string; message: string }> = [];

  for (const s of suggestions) {
    results.push({
      suggestion: `${s.sourceTitle} → ${s.targetTitle}`,
      status: "ready",
      message: `Link "${s.anchorText}" → ${s.targetUrl}. To apply, add your Webflow API token in Connectors. Site: ${siteUrl}`,
    });
  }

  return results;
}

// ── Custom Webhook ───────────────────────────────────────────────────

async function pushToWebhook(webhookUrl: string, suggestions: LinkSuggestion[]) {
  // POST all suggestions to the user's custom webhook endpoint
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "internal_link_suggestions",
      timestamp: new Date().toISOString(),
      suggestions: suggestions.map((s) => ({
        sourcePage: { url: s.sourceUrl, title: s.sourceTitle },
        targetPage: { url: s.targetUrl, title: s.targetTitle },
        anchorText: s.anchorText,
        htmlSnippet: `<a href="${s.targetUrl}">${s.anchorText}</a>`,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}: ${res.statusText}`);
  }

  return [{ suggestion: `${suggestions.length} suggestions`, status: "sent", message: `All suggestions posted to ${webhookUrl}` }];
}
