/**
 * Competitor Research — Searches Google for a keyword, analyzes top-ranking pages,
 * and feeds insights to Claude for better article generation.
 */

import * as cheerio from "cheerio";

const SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || "";
const SEARCH_CX = process.env.GOOGLE_SEARCH_CX || "";

export interface CompetitorPage {
  title: string;
  url: string;
  snippet: string;
  position: number;
  headings: string[];
  wordCount: number;
  topics: string[];
}

export interface CompetitorAnalysis {
  keyword: string;
  topResults: CompetitorPage[];
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  avgWordCount: number;
  commonHeadings: string[];
  contentBrief: string;
}

/**
 * Search Google for a keyword and analyze the top results
 */
export async function analyzeCompetitors(keyword: string): Promise<CompetitorAnalysis> {
  const empty: CompetitorAnalysis = {
    keyword,
    topResults: [],
    peopleAlsoAsk: [],
    relatedSearches: [],
    avgWordCount: 1500,
    commonHeadings: [],
    contentBrief: "",
  };

  if (!SEARCH_API_KEY || !SEARCH_CX) return empty;

  try {
    // 1. Search Google
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${SEARCH_API_KEY}&cx=${SEARCH_CX}&q=${encodeURIComponent(keyword)}&num=10`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.error("[Competitor Research] Google Search API error:", searchRes.status);
      return empty;
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];

    if (items.length === 0) return empty;

    // 2. Extract basic info from search results
    const topResults: CompetitorPage[] = items.slice(0, 7).map((item: { title: string; link: string; snippet: string }, i: number) => ({
      title: item.title || "",
      url: item.link || "",
      snippet: item.snippet || "",
      position: i + 1,
      headings: [],
      wordCount: 0,
      topics: [],
    }));

    // 3. Scrape top 3 results for headings and structure
    const scrapePromises = topResults.slice(0, 3).map(async (result, idx) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(result.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RanqapexBot/1.0)",
            "Accept": "text/html",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) return;

        const html = await res.text();
        const $ = cheerio.load(html);

        // Extract headings
        const headings: string[] = [];
        $("h1, h2, h3").each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 3 && text.length < 200) {
            headings.push(text);
          }
        });

        // Estimate word count from body text
        const bodyText = $("article, main, .content, .post-content, .entry-content, body")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim();
        const wordCount = bodyText.split(/\s+/).length;

        topResults[idx].headings = headings.slice(0, 15);
        topResults[idx].wordCount = wordCount;
        topResults[idx].topics = extractTopics(headings);
      } catch {
        // Scraping failed — continue with search snippet data
      }
    });

    await Promise.all(scrapePromises);

    // 4. Extract "People Also Ask" from search results (if available)
    const peopleAlsoAsk: string[] = [];
    if (searchData.queries?.request) {
      // Google Custom Search doesn't return PAA directly, but we can infer from related
    }

    // 5. Related searches
    const relatedSearches: string[] = [];
    if (searchData.queries?.related) {
      for (const r of searchData.queries.related) {
        relatedSearches.push(r.title || "");
      }
    }

    // 6. Compute averages and common patterns
    const wordCounts = topResults.filter((r) => r.wordCount > 100).map((r) => r.wordCount);
    const avgWordCount = wordCounts.length > 0
      ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
      : 1500;

    // Find common headings/topics across results
    const allHeadings = topResults.flatMap((r) => r.headings);
    const headingFreq = new Map<string, number>();
    for (const h of allHeadings) {
      const normalized = h.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      if (normalized.length > 5) {
        headingFreq.set(normalized, (headingFreq.get(normalized) || 0) + 1);
      }
    }
    const commonHeadings = Array.from(headingFreq.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([heading]) => heading);

    // 7. Build content brief
    const contentBrief = buildContentBrief(keyword, topResults, avgWordCount, commonHeadings);

    return {
      keyword,
      topResults,
      peopleAlsoAsk,
      relatedSearches,
      avgWordCount,
      commonHeadings,
      contentBrief,
    };
  } catch (err) {
    console.error("[Competitor Research] Error:", err);
    return empty;
  }
}

function extractTopics(headings: string[]): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "and", "or", "to", "in", "for", "of", "with", "how", "what", "why", "your", "our", "this", "that"]);
  const topics = new Map<string, number>();

  for (const h of headings) {
    const words = h.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
    for (const w of words) {
      topics.set(w, (topics.get(w) || 0) + 1);
    }
  }

  return Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic);
}

function buildContentBrief(
  keyword: string,
  topResults: CompetitorPage[],
  avgWordCount: number,
  commonHeadings: string[],
): string {
  const parts: string[] = [];

  parts.push(`COMPETITOR ANALYSIS FOR: "${keyword}"`);
  parts.push(`\nTop ${topResults.length} Google results analyzed:`);

  for (const r of topResults.slice(0, 5)) {
    parts.push(`\n#${r.position}: "${r.title}"`);
    parts.push(`   URL: ${r.url}`);
    if (r.wordCount > 100) parts.push(`   Word count: ~${r.wordCount}`);
    if (r.headings.length > 0) {
      parts.push(`   Headings: ${r.headings.slice(0, 8).join(" | ")}`);
    }
  }

  parts.push(`\nAVG WORD COUNT of top results: ${avgWordCount}`);

  if (commonHeadings.length > 0) {
    parts.push(`\nCOMMON TOPICS covered by multiple competitors:`);
    parts.push(commonHeadings.map((h) => `  - ${h}`).join("\n"));
  }

  parts.push(`\nTO OUTRANK THESE COMPETITORS:`);
  parts.push(`  - Write at least ${Math.round(avgWordCount * 1.2)} words (20% more than average)`);
  parts.push(`  - Cover ALL common topics listed above`);
  parts.push(`  - Add unique sections they DON'T cover`);
  parts.push(`  - Include more specific examples and data points`);
  parts.push(`  - Better structure: more subheadings, bullet points, tables`);

  return parts.join("\n");
}
