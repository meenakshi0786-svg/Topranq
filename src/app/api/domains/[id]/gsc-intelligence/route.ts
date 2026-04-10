import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────

interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  pages: string[];
}

interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queryCount: number;
}

// ── GET /api/domains/:id/gsc-intelligence ─────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get cached GSC data from DB
  const rawData = db
    .select()
    .from(schema.searchConsoleData)
    .where(eq(schema.searchConsoleData.domainId, id))
    .orderBy(desc(schema.searchConsoleData.date))
    .limit(500)
    .all();

  if (rawData.length === 0) {
    // Fallback: extract keywords from crawled pages when no GSC data
    const pages = db.select().from(schema.pages).where(eq(schema.pages.domainId, id)).all();
    if (pages.length === 0) {
      return NextResponse.json({ error: "No data found. Run an audit first to crawl pages.", hasData: false });
    }

    // Extract keywords from page titles, H1s, meta descriptions
    const extractedKeywords = extractKeywordsFromPages(pages);
    return NextResponse.json({
      hasData: true,
      source: "crawled_pages",
      summary: { totalQueries: extractedKeywords.length, totalPages: pages.length, totalClicks: 0, totalImpressions: 0 },
      keywordInsights: {
        highOpportunity: [],
        quickWins: extractedKeywords.slice(0, 15).map((k) => ({ query: k.keyword, clicks: 0, impressions: k.score * 10, ctr: 0, position: 0, insight: k.source, action: "Create content targeting this keyword" })),
        contentGaps: extractedKeywords.slice(0, 10).map((k) => ({ query: k.keyword, clicks: 0, impressions: k.score * 10, ctr: 0, position: 0, insight: `Found in: ${k.source}`, action: "Create a dedicated blog post", suggestedTitle: generateTitle(k.keyword) })),
        highIntent: extractedKeywords.filter((k) => /best|top|review|buy|price|vs/i.test(k.keyword)).slice(0, 10).map((k) => ({ query: k.keyword, clicks: 0, impressions: k.score * 10, ctr: 0, position: 0, insight: "Commercial intent keyword", action: "Create comparison or buying guide" })),
        informational: extractedKeywords.filter((k) => /how|what|guide|tips|tutorial/i.test(k.keyword)).slice(0, 10).map((k) => ({ query: k.keyword, clicks: 0, impressions: k.score * 10, ctr: 0, position: 0, insight: "Informational query", action: "Create comprehensive guide" })),
      },
      pagePerformance: { underperforming: [], almostRanking: [], highTraffic: [], weakPages: [] },
      strategy: { contentPlan: { newTopics: [], optimizeExisting: [], keywordClusters: [] }, linkingPlan: { needMoreLinks: [], authorityPages: [], suggestions: [] }, monetizationPlan: { pagesToMonetize: [], commercialKeywords: [] } },
      priorityTasks: extractedKeywords.slice(0, 5).map((k, i) => ({
        rank: i + 1,
        action: `Create blog post targeting "${k.keyword}" — found across ${k.source}`,
        impact: "Medium",
        effort: "Medium",
        agent: "Blog Writer",
      })),
    });
  }

  // Get existing articles and pages for gap analysis
  const articles = db.select().from(schema.articles).where(eq(schema.articles.domainId, id)).all();
  const pages = db.select().from(schema.pages).where(eq(schema.pages.domainId, id)).all();
  const internalLinks = db.select().from(schema.internalLinks).where(eq(schema.internalLinks.domainId, id)).all();

  // ── Aggregate queries ──
  const queryMap = new Map<string, QueryRow>();
  for (const row of rawData) {
    const q = row.query || "";
    if (!q) continue;
    const existing = queryMap.get(q);
    if (existing) {
      existing.clicks += row.clicks || 0;
      existing.impressions += row.impressions || 0;
      existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      existing.position = (existing.position + (row.avgPosition || 0)) / 2;
      if (row.pageUrl && !existing.pages.includes(row.pageUrl)) existing.pages.push(row.pageUrl);
    } else {
      queryMap.set(q, {
        query: q,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.avgPosition || 0,
        pages: row.pageUrl ? [row.pageUrl] : [],
      });
    }
  }

  // ── Aggregate pages ──
  const pageMap = new Map<string, PageRow>();
  for (const row of rawData) {
    const p = row.pageUrl || "";
    if (!p) continue;
    const existing = pageMap.get(p);
    if (existing) {
      existing.clicks += row.clicks || 0;
      existing.impressions += row.impressions || 0;
      existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      existing.position = (existing.position + (row.avgPosition || 0)) / 2;
      existing.queryCount++;
    } else {
      pageMap.set(p, {
        page: p,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.avgPosition || 0,
        queryCount: 1,
      });
    }
  }

  const allQueries = Array.from(queryMap.values());
  const allPages = Array.from(pageMap.values());

  // ══════════════════════════════════════════════════════════════════════
  // STEP 1: KEYWORD CLASSIFICATION
  // ══════════════════════════════════════════════════════════════════════

  // 1. High Opportunity: high impressions, low CTR, position 5-20
  const highOpportunity = allQueries
    .filter((q) => q.impressions >= 100 && q.ctr < 0.02 && q.position >= 5 && q.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((q) => ({
      ...q,
      insight: `${q.impressions} impressions but only ${(q.ctr * 100).toFixed(1)}% CTR at position ${q.position.toFixed(1)}. Improving rank to top 3 could 5x clicks.`,
      action: q.position <= 10
        ? "Optimize existing content: improve title/meta, add FAQ schema, enhance content depth"
        : "Create dedicated long-form content targeting this keyword cluster",
    }));

  // 2. Quick Wins: position 5-10, moderate impressions
  const quickWins = allQueries
    .filter((q) => q.position >= 4 && q.position <= 10 && q.impressions >= 10)
    .sort((a, b) => a.position - b.position)
    .slice(0, 15)
    .map((q) => ({
      ...q,
      insight: `Ranking at position ${q.position.toFixed(1)} — just off page 1 or bottom of page 1. Small improvements can drive big gains.`,
      action: "Add internal links, update content freshness, optimize meta title for higher CTR",
    }));

  // 3. Content Gaps: queries with impressions but no dedicated page
  const existingPagePaths = new Set([
    ...pages.map((p) => new URL(p.url).pathname.toLowerCase()),
    ...articles.map((a) => a.slug?.toLowerCase() || ""),
  ]);

  const contentGaps = allQueries
    .filter((q) => {
      const queryWords = q.query.toLowerCase().split(/\s+/);
      // Check if any existing page specifically targets this query
      const hasPage = q.pages.some((p) => {
        const path = new URL(p).pathname.toLowerCase();
        return queryWords.some((w) => w.length > 3 && path.includes(w));
      });
      return !hasPage && q.impressions >= 20;
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((q) => ({
      ...q,
      insight: `Getting ${q.impressions} impressions for "${q.query}" but no dedicated page exists.`,
      action: `Create a new blog post or landing page specifically targeting "${q.query}"`,
      suggestedTitle: generateTitle(q.query),
    }));

  // 4. High-Intent (commercial) Keywords
  const commercialPatterns = /\b(best|top|review|buy|price|cheap|affordable|vs|comparison|alternative|deal|discount|coupon|worth|recommend)\b/i;
  const highIntent = allQueries
    .filter((q) => commercialPatterns.test(q.query) && q.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((q) => ({
      ...q,
      intent: "commercial",
      insight: `Commercial intent keyword — users searching "${q.query}" are closer to making a purchase decision.`,
      action: "Add product links, comparison tables, CTAs, and buying guides",
    }));

  // 5. Informational Keywords
  const infoPatterns = /\b(how|what|guide|tips|tutorial|learn|explain|why|when|steps|ways|example)\b/i;
  const informational = allQueries
    .filter((q) => infoPatterns.test(q.query) && q.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((q) => ({
      ...q,
      intent: "informational",
      insight: `Informational query — users want to learn. Great for building authority and top-of-funnel traffic.`,
      action: "Create comprehensive guides with internal links to product/service pages",
    }));

  // ══════════════════════════════════════════════════════════════════════
  // STEP 2: PAGE PERFORMANCE ANALYSIS
  // ══════════════════════════════════════════════════════════════════════

  // Underperforming: high impressions but low CTR
  const underperforming = allPages
    .filter((p) => p.impressions >= 50 && p.ctr < 0.015)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      issue: "High visibility but low engagement",
      fix: "Rewrite title tag and meta description to be more compelling. Add structured data for rich snippets.",
    }));

  // Almost ranking (positions 5-15)
  const almostRanking = allPages
    .filter((p) => p.position >= 5 && p.position <= 15 && p.impressions >= 20)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      issue: `Position ${p.position.toFixed(1)} — close to page 1`,
      fix: "Add 2-3 internal links from high-authority pages. Update content with fresh information.",
    }));

  // High traffic pages (authority pages)
  const highTraffic = allPages
    .filter((p) => p.clicks >= 5)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      role: "Authority page — pass link equity from here to weaker pages",
    }));

  // Weak/orphan pages
  const pageInboundCounts = new Map<string, number>();
  for (const link of internalLinks) {
    if (link.toPageId) {
      pageInboundCounts.set(link.toPageId, (pageInboundCounts.get(link.toPageId) || 0) + 1);
    }
  }

  const weakPages = allPages
    .filter((p) => p.impressions < 10 && p.clicks === 0)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      issue: "Very low visibility — may lack internal links or content quality",
      fix: "Either improve content quality or consolidate into a stronger page (301 redirect).",
    }));

  // ══════════════════════════════════════════════════════════════════════
  // STEP 3: STRATEGY GENERATION
  // ══════════════════════════════════════════════════════════════════════

  // A. CONTENT PLAN (for Blog Writer)
  const contentPlan = {
    newTopics: contentGaps.slice(0, 8).map((g) => ({
      topic: g.suggestedTitle || g.query,
      targetKeyword: g.query,
      impressions: g.impressions,
      reason: g.insight,
      priority: g.impressions >= 100 ? "high" : g.impressions >= 30 ? "medium" : "low",
    })),
    optimizeExisting: underperforming.slice(0, 5).map((p) => ({
      page: p.page,
      currentCTR: (p.ctr * 100).toFixed(1) + "%",
      impressions: p.impressions,
      reason: p.issue,
      suggestion: p.fix,
    })),
    keywordClusters: buildKeywordClusters(allQueries),
  };

  // B. INTERNAL LINKING PLAN (for Internal Linker)
  const linkingPlan = {
    needMoreLinks: almostRanking.slice(0, 5).map((p) => ({
      page: p.page,
      position: p.position.toFixed(1),
      reason: `At position ${p.position.toFixed(1)} with ${p.impressions} impressions. 2-3 more internal links could push to page 1.`,
    })),
    authorityPages: highTraffic.slice(0, 5).map((p) => ({
      page: p.page,
      clicks: p.clicks,
      reason: `Gets ${p.clicks} clicks — link FROM this page to boost weaker pages.`,
    })),
    suggestions: generateLinkSuggestions(highTraffic, almostRanking, allQueries),
  };

  // C. MONETIZATION PLAN (for Product Infuser)
  const monetizationPlan = {
    pagesToMonetize: highTraffic
      .filter((p) => p.clicks >= 3)
      .slice(0, 8)
      .map((p) => ({
        page: p.page,
        traffic: p.clicks,
        queries: p.queryCount,
        strategy: p.ctr > 0.05 ? "soft-mention" : "comparison-table",
        reason: `${p.clicks} clicks, ${p.queryCount} keyword variations — high value for product placement`,
      })),
    commercialKeywords: highIntent.slice(0, 8).map((q) => ({
      keyword: q.query,
      impressions: q.impressions,
      position: q.position.toFixed(1),
      placementType: q.query.includes("vs") || q.query.includes("comparison")
        ? "comparison-table"
        : q.query.includes("best") || q.query.includes("top")
          ? "listicle-with-products"
          : "soft-cta",
    })),
  };

  // ══════════════════════════════════════════════════════════════════════
  // STEP 4: PRIORITY TASK LIST
  // ══════════════════════════════════════════════════════════════════════

  const priorityTasks = generatePriorityTasks(
    highOpportunity, quickWins, contentGaps,
    underperforming, almostRanking, highIntent,
  );

  return NextResponse.json({
    hasData: true,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQueries: allQueries.length,
      totalPages: allPages.length,
      totalClicks: allQueries.reduce((s, q) => s + q.clicks, 0),
      totalImpressions: allQueries.reduce((s, q) => s + q.impressions, 0),
    },
    keywordInsights: {
      highOpportunity,
      quickWins,
      contentGaps,
      highIntent,
      informational,
    },
    pagePerformance: {
      underperforming,
      almostRanking,
      highTraffic,
      weakPages,
    },
    strategy: {
      contentPlan,
      linkingPlan,
      monetizationPlan,
    },
    priorityTasks,
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateTitle(query: string): string {
  const q = query.trim();
  if (/^(how|what|why|when|where)/i.test(q)) {
    return q.charAt(0).toUpperCase() + q.slice(1) + " — Complete Guide";
  }
  if (/\b(best|top)\b/i.test(q)) {
    return q.charAt(0).toUpperCase() + q.slice(1) + " in " + new Date().getFullYear();
  }
  return "The Ultimate Guide to " + q.charAt(0).toUpperCase() + q.slice(1);
}

function buildKeywordClusters(queries: QueryRow[]): Array<{ cluster: string; keywords: string[]; totalImpressions: number }> {
  const clusters = new Map<string, { keywords: Set<string>; impressions: number }>();

  for (const q of queries) {
    const words = q.query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const word of words) {
      const existing = clusters.get(word);
      if (existing) {
        existing.keywords.add(q.query);
        existing.impressions += q.impressions;
      } else {
        clusters.set(word, { keywords: new Set([q.query]), impressions: q.impressions });
      }
    }
  }

  return Array.from(clusters.entries())
    .filter(([, data]) => data.keywords.size >= 2)
    .map(([cluster, data]) => ({
      cluster,
      keywords: Array.from(data.keywords).slice(0, 6),
      totalImpressions: data.impressions,
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions)
    .slice(0, 8);
}

function generateLinkSuggestions(
  authorityPages: Array<{ page: string; clicks: number }>,
  weakPages: Array<{ page: string; position: number; impressions: number }>,
  queries: QueryRow[],
): Array<{ from: string; to: string; anchorText: string; reason: string }> {
  const suggestions: Array<{ from: string; to: string; anchorText: string; reason: string }> = [];

  for (const weak of weakPages.slice(0, 5)) {
    // Find a query that this weak page ranks for
    const relatedQuery = queries.find((q) => q.pages.includes(weak.page));
    if (!relatedQuery) continue;

    for (const auth of authorityPages.slice(0, 3)) {
      if (auth.page === weak.page) continue;
      suggestions.push({
        from: auth.page,
        to: weak.page,
        anchorText: relatedQuery.query,
        reason: `Pass authority from page with ${auth.clicks} clicks to boost "${relatedQuery.query}" from position ${weak.position.toFixed(1)}`,
      });
      break;
    }
  }

  return suggestions.slice(0, 8);
}

function generatePriorityTasks(
  highOpp: Array<{ query: string; impressions: number; position: number }>,
  quickWins: Array<{ query: string; position: number; impressions: number }>,
  gaps: Array<{ query: string; impressions: number; suggestedTitle?: string }>,
  underperf: Array<{ page: string; impressions: number; ctr: number }>,
  almostRank: Array<{ page: string; position: number; impressions: number }>,
  highIntent: Array<{ query: string; impressions: number }>,
): Array<{ rank: number; action: string; impact: string; effort: string; agent: string }> {
  const tasks: Array<{ action: string; impactScore: number; impact: string; effort: string; agent: string }> = [];

  // Quick wins first (low effort, high impact)
  for (const qw of quickWins.slice(0, 3)) {
    tasks.push({
      action: `Optimize content for "${qw.query}" — currently at position ${qw.position.toFixed(1)}`,
      impactScore: 90 - qw.position * 2,
      impact: "High",
      effort: "Low",
      agent: "Internal Linker",
    });
  }

  // Content gaps
  for (const gap of gaps.slice(0, 3)) {
    tasks.push({
      action: `Create new blog post: "${gap.suggestedTitle || gap.query}" (${gap.impressions} impressions, no page)`,
      impactScore: Math.min(85, gap.impressions / 5),
      impact: gap.impressions >= 100 ? "High" : "Medium",
      effort: "Medium",
      agent: "Blog Writer",
    });
  }

  // Underperforming pages
  for (const up of underperf.slice(0, 2)) {
    tasks.push({
      action: `Fix low CTR on ${new URL(up.page).pathname} — ${up.impressions} impressions but ${(up.ctr * 100).toFixed(1)}% CTR`,
      impactScore: up.impressions / 10,
      impact: "High",
      effort: "Low",
      agent: "Blog Writer",
    });
  }

  // Almost ranking pages
  for (const ar of almostRank.slice(0, 2)) {
    tasks.push({
      action: `Add internal links to ${new URL(ar.page).pathname} — at position ${ar.position.toFixed(1)}`,
      impactScore: 80 - ar.position * 3,
      impact: "Medium",
      effort: "Low",
      agent: "Internal Linker",
    });
  }

  // High intent keywords
  for (const hi of highIntent.slice(0, 2)) {
    tasks.push({
      action: `Add product placements for "${hi.query}" — ${hi.impressions} commercial-intent impressions`,
      impactScore: hi.impressions / 3,
      impact: "Medium",
      effort: "Low",
      agent: "Product Infuser",
    });
  }

  // High opportunity
  for (const ho of highOpp.slice(0, 2)) {
    tasks.push({
      action: `Target "${ho.query}" — ${ho.impressions} impressions at position ${ho.position.toFixed(1)} with very low CTR`,
      impactScore: ho.impressions / 8,
      impact: "High",
      effort: "Medium",
      agent: "Blog Writer",
    });
  }

  return tasks
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10)
    .map((t, i) => ({ rank: i + 1, ...t }));
}

// ── Fallback: extract keywords from crawled pages ────────────────────

function extractKeywordsFromPages(
  pages: Array<{ url: string; title: string | null; h1: string | null; metaDescription: string | null; wordCount: number | null }>,
): Array<{ keyword: string; score: number; source: string }> {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "and", "but", "or",
    "not", "no", "so", "yet", "both", "either", "each", "every", "all",
    "any", "few", "more", "most", "other", "some", "such", "than", "too",
    "very", "just", "about", "up", "out", "if", "then", "that", "this",
    "these", "those", "it", "its", "how", "what", "when", "where", "who",
    "which", "why", "your", "our", "we", "you", "they", "my", "me", "us",
    "home", "page", "contact", "about", "privacy", "terms", "menu",
    "new", "get", "make", "use", "like", "also", "one", "two", "first",
  ]);

  const phraseFreq = new Map<string, { count: number; sources: Set<string> }>();

  for (const page of pages) {
    const texts = [
      { text: page.title || "", source: "title" },
      { text: page.h1 || "", source: "h1" },
      { text: page.metaDescription || "", source: "meta" },
    ];

    for (const { text, source } of texts) {
      const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

      // Single words
      for (const w of words) {
        if (w.length < 4) continue;
        const existing = phraseFreq.get(w);
        if (existing) { existing.count++; existing.sources.add(source); }
        else phraseFreq.set(w, { count: 1, sources: new Set([source]) });
      }

      // 2-word phrases
      for (let i = 0; i < words.length - 1; i++) {
        if (stopWords.has(words[i]) || stopWords.has(words[i + 1])) continue;
        const phrase = `${words[i]} ${words[i + 1]}`;
        const existing = phraseFreq.get(phrase);
        if (existing) { existing.count++; existing.sources.add(source); }
        else phraseFreq.set(phrase, { count: 1, sources: new Set([source]) });
      }

      // 3-word phrases
      for (let i = 0; i < words.length - 2; i++) {
        if (stopWords.has(words[i]) || stopWords.has(words[i + 2])) continue;
        const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        const existing = phraseFreq.get(phrase);
        if (existing) { existing.count++; existing.sources.add(source); }
        else phraseFreq.set(phrase, { count: 1, sources: new Set([source]) });
      }
    }
  }

  return Array.from(phraseFreq.entries())
    .filter(([, data]) => data.count >= 2 || data.sources.size >= 2)
    .map(([keyword, data]) => ({
      keyword,
      score: data.count * data.sources.size * (keyword.split(" ").length > 1 ? 2 : 1), // Boost multi-word phrases
      source: Array.from(data.sources).join(", "),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}
