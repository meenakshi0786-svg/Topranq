import { db, schema } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { fetchSearchAnalytics } from "./gsc";

/**
 * GSC Intelligence Layer — used by all agents to get keyword & page insights
 */

interface GSCKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  pages: string[];
  // Computed scores
  opportunityScore: number; // higher = bigger traffic opportunity
  intent: "informational" | "commercial" | "navigational" | "transactional";
}

interface GSCPageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queryCount: number;
}

export interface GSCInsights {
  connected: boolean;
  keywords: GSCKeyword[];
  pages: GSCPageData[];
  quickWins: GSCKeyword[];
  contentGaps: GSCKeyword[];
  commercialKeywords: GSCKeyword[];
  informationalKeywords: GSCKeyword[];
  topKeywordsForTopic: (topic: string) => GSCKeyword[];
  getBestKeywordsForBlog: (topic: string, existingKeywords: string[]) => { primary: string; secondary: string[]; longTail: string[]; relatedQueries: string[] };
}

// ── Intent classification patterns ──
const COMMERCIAL_PATTERNS = /\b(best|top|review|buy|price|cheap|affordable|vs|comparison|alternative|deal|discount|coupon|worth|recommend|cost|pricing)\b/i;
const TRANSACTIONAL_PATTERNS = /\b(buy|order|purchase|download|sign up|subscribe|get|hire|book|register|free trial)\b/i;
const INFORMATIONAL_PATTERNS = /\b(how|what|why|when|where|who|which|guide|tutorial|tips|learn|explain|example|steps|ways|meaning|definition)\b/i;
const NAVIGATIONAL_PATTERNS = /\b(login|sign in|website|official|contact|support|app|dashboard)\b/i;

function classifyIntent(query: string): GSCKeyword["intent"] {
  if (TRANSACTIONAL_PATTERNS.test(query)) return "transactional";
  if (COMMERCIAL_PATTERNS.test(query)) return "commercial";
  if (NAVIGATIONAL_PATTERNS.test(query)) return "navigational";
  if (INFORMATIONAL_PATTERNS.test(query)) return "informational";
  return "informational"; // default
}

function calculateOpportunityScore(kw: { impressions: number; clicks: number; position: number; ctr: number }): number {
  // Formula: high impressions + low position (close to page 1) + low CTR (room to improve) = high opportunity
  const positionScore = kw.position <= 3 ? 10 : kw.position <= 10 ? 70 : kw.position <= 20 ? 50 : 20;
  const impressionScore = Math.min(100, kw.impressions / 10);
  const ctrGap = kw.position <= 10 ? Math.max(0, 0.10 - kw.ctr) * 500 : 0; // CTR improvement potential
  return Math.round(positionScore + impressionScore + ctrGap);
}

/**
 * Fetch and analyze GSC data for a domain.
 */
export async function getGSCInsights(domainId: string): Promise<GSCInsights> {
  const empty: GSCInsights = {
    connected: false,
    keywords: [],
    pages: [],
    quickWins: [],
    contentGaps: [],
    commercialKeywords: [],
    informationalKeywords: [],
    topKeywordsForTopic: () => [],
    getBestKeywordsForBlog: () => ({ primary: "", secondary: [], longTail: [], relatedQueries: [] }),
  };

  // Check if GSC is connected
  const connection = db
    .select()
    .from(schema.domainLearnings)
    .where(
      and(
        eq(schema.domainLearnings.domainId, domainId),
        eq(schema.domainLearnings.learningType, "gsc_connection")
      )
    )
    .orderBy(desc(schema.domainLearnings.createdAt))
    .get();

  if (!connection) return empty;

  let connectionData: { refreshToken: string; sites: string[] };
  try {
    connectionData = JSON.parse(connection.insight);
  } catch {
    return empty;
  }

  // Get cached data from DB
  let rawData = db
    .select()
    .from(schema.searchConsoleData)
    .where(eq(schema.searchConsoleData.domainId, domainId))
    .orderBy(desc(schema.searchConsoleData.date))
    .limit(1000)
    .all();

  // If no cached data or data is old (>24h), try fetching fresh
  if (rawData.length === 0 || isDataStale(rawData)) {
    try {
      const siteUrl = connectionData.sites?.[0];
      if (siteUrl && connectionData.refreshToken) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 28);
        const fmt = (d: Date) => d.toISOString().split("T")[0];

        const freshData = await fetchSearchAnalytics(
          connectionData.refreshToken,
          siteUrl,
          {
            startDate: fmt(startDate),
            endDate: fmt(endDate),
            dimensions: ["query", "page"],
            rowLimit: 1000, // Fetch up to 1000 rows for better coverage
          }
        );

        // Store fresh data
        for (const row of freshData) {
          db.insert(schema.searchConsoleData)
            .values({
              domainId,
              pageUrl: row.page,
              query: row.query,
              impressions: row.impressions,
              clicks: row.clicks,
              ctr: row.ctr,
              avgPosition: row.position,
              date: fmt(endDate),
            })
            .run();
        }

        rawData = db
          .select()
          .from(schema.searchConsoleData)
          .where(eq(schema.searchConsoleData.domainId, domainId))
          .orderBy(desc(schema.searchConsoleData.date))
          .limit(1000)
          .all();
      }
    } catch {
      // Use cached data
    }
  }

  if (rawData.length === 0) return { ...empty, connected: true };

  // ── Aggregate keywords ──
  const keywordMap = new Map<string, GSCKeyword>();
  for (const row of rawData) {
    const q = (row.query || "").trim().toLowerCase();
    if (!q || q.length < 2) continue;
    const existing = keywordMap.get(q);
    if (existing) {
      existing.clicks += row.clicks || 0;
      existing.impressions += row.impressions || 0;
      existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      existing.position = (existing.position + (row.avgPosition || 0)) / 2;
      if (row.pageUrl && !existing.pages.includes(row.pageUrl)) existing.pages.push(row.pageUrl);
    } else {
      const kw: GSCKeyword = {
        query: q,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.avgPosition || 0,
        pages: row.pageUrl ? [row.pageUrl] : [],
        opportunityScore: 0,
        intent: classifyIntent(q),
      };
      kw.opportunityScore = calculateOpportunityScore(kw);
      keywordMap.set(q, kw);
    }
  }

  // Recalculate opportunity scores after aggregation
  for (const kw of keywordMap.values()) {
    kw.opportunityScore = calculateOpportunityScore(kw);
  }

  // ── Aggregate pages ──
  const pageMap = new Map<string, GSCPageData>();
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

  const keywords = Array.from(keywordMap.values()).sort((a, b) => b.opportunityScore - a.opportunityScore);
  const pages = Array.from(pageMap.values()).sort((a, b) => b.clicks - a.clicks);

  // ── Classify keyword groups ──

  // Quick wins: position 4-15, decent impressions, sorted by opportunity
  const quickWins = keywords
    .filter((q) => q.position >= 4 && q.position <= 15 && q.impressions >= 10)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 20);

  // Content gaps: high impressions but only 1 page (or no good page)
  const contentGaps = keywords
    .filter((q) => q.impressions >= 15 && q.pages.length <= 1 && q.position > 10)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  // Commercial intent keywords
  const commercialKeywords = keywords
    .filter((q) => (q.intent === "commercial" || q.intent === "transactional") && q.impressions >= 5)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 20);

  // Informational keywords (great for blogs)
  const informationalKeywords = keywords
    .filter((q) => q.intent === "informational" && q.impressions >= 5)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 20);

  // ── Topic matcher (semantic, not just substring) ──
  function topKeywordsForTopic(topic: string): GSCKeyword[] {
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(/\s+/).filter((w) => w.length > 2);
    // Remove very common words
    const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "how", "what", "are", "was", "will", "can"]);
    const significantWords = topicWords.filter((w) => !stopWords.has(w) && w.length > 3);

    return keywords
      .map((kw) => {
        const kwLower = kw.query.toLowerCase();
        let matchScore = 0;

        // Exact phrase match (strongest signal)
        if (kwLower.includes(topicLower) || topicLower.includes(kwLower)) {
          matchScore += 100;
        }

        // Word overlap scoring
        for (const word of significantWords) {
          if (kwLower.includes(word)) matchScore += 20;
          // Partial stem matching (e.g., "market" matches "marketing")
          if (word.length > 4) {
            const stem = word.slice(0, -2);
            if (kwLower.includes(stem)) matchScore += 10;
          }
        }

        // Boost by opportunity score
        matchScore += kw.opportunityScore / 10;

        return { kw, matchScore };
      })
      .filter(({ matchScore }) => matchScore >= 20)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 15)
      .map(({ kw }) => kw);
  }

  // ── Blog keyword selector: picks the best primary, secondary, long-tail keywords ──
  function getBestKeywordsForBlog(topic: string, existingKeywords: string[]): {
    primary: string;
    secondary: string[];
    longTail: string[];
    relatedQueries: string[];
  } {
    const existingSet = new Set(existingKeywords.map((k) => k.toLowerCase()));
    const topicKws = topKeywordsForTopic(topic);

    if (topicKws.length === 0) {
      return { primary: existingKeywords[0] || topic, secondary: existingKeywords.slice(1, 4), longTail: [], relatedQueries: [] };
    }

    // Primary keyword: highest opportunity score, 2-4 words preferred (most searchable)
    const primaryCandidates = topicKws
      .filter((kw) => {
        const wordCount = kw.query.split(/\s+/).length;
        return wordCount >= 1 && wordCount <= 4 && kw.impressions >= 10;
      })
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    const primary = primaryCandidates[0]?.query || existingKeywords[0] || topic;

    // Secondary keywords: 2-3 high-impression keywords related but different from primary
    const secondary = topicKws
      .filter((kw) => kw.query !== primary && !existingSet.has(kw.query) && kw.query.split(/\s+/).length <= 4)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3)
      .map((kw) => kw.query);

    // Long-tail keywords: 4+ words, lower volume but highly specific
    const longTail = topicKws
      .filter((kw) => kw.query.split(/\s+/).length >= 4 && kw.query !== primary && !secondary.includes(kw.query))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3)
      .map((kw) => kw.query);

    // Related queries: keywords that share a page with the primary keyword
    const primaryPages = topicKws.find((kw) => kw.query === primary)?.pages || [];
    const relatedQueries = keywords
      .filter((kw) => {
        if (kw.query === primary || secondary.includes(kw.query) || longTail.includes(kw.query)) return false;
        return kw.pages.some((p) => primaryPages.includes(p));
      })
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
      .map((kw) => kw.query);

    return { primary, secondary, longTail, relatedQueries };
  }

  return {
    connected: true,
    keywords,
    pages,
    quickWins,
    contentGaps,
    commercialKeywords,
    informationalKeywords,
    topKeywordsForTopic,
    getBestKeywordsForBlog,
  };
}

function isDataStale(data: Array<{ date: string | null }>): boolean {
  const latestDate = data[0]?.date;
  if (!latestDate) return true;
  const age = Date.now() - new Date(latestDate).getTime();
  return age > 24 * 60 * 60 * 1000;
}
