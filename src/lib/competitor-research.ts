/**
 * Competitor Research / SERP Brief
 *
 * 1) Calls Serper.dev for real Google SERP data (top results, PAA, related searches)
 * 2) Fetches top blog results and extracts STRUCTURAL signals only:
 *    headings, topic words, word count, has-FAQ, has-tables.
 *    Body text is NEVER copied — only structure is used as guardrails for the LLM.
 * 3) Returns a brief that the article generator uses to write ORIGINAL content
 *    that covers the same topics with our own angle.
 */

import * as cheerio from "cheerio";

const SERPER_KEY = process.env.SERPER_API_KEY || "";

export interface CompetitorPage {
  title: string;
  url: string;
  snippet: string;
  position: number;
  headings: string[];
  wordCount: number;
  topics: string[];
  hasFaq: boolean;
  hasTable: boolean;
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

const empty = (keyword: string): CompetitorAnalysis => ({
  keyword,
  topResults: [],
  peopleAlsoAsk: [],
  relatedSearches: [],
  avgWordCount: 1500,
  commonHeadings: [],
  contentBrief: "",
});

export async function analyzeCompetitors(keyword: string): Promise<CompetitorAnalysis> {
  if (!SERPER_KEY) {
    console.warn("[Competitor Research] SERPER_API_KEY not set");
    return empty(keyword);
  }

  try {
    // 1. Real Google SERP via Serper
    const serpRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: keyword, num: 10 }),
    });

    if (!serpRes.ok) {
      console.error("[Competitor Research] Serper error:", serpRes.status);
      return empty(keyword);
    }

    const serp = await serpRes.json();
    const organic = (serp.organic || []) as Array<{ title: string; link: string; snippet: string; position: number }>;
    if (organic.length === 0) return empty(keyword);

    // Skip pure homepages / category pages — prefer article-like URLs
    const articleLikely = (url: string) => {
      const path = (() => { try { return new URL(url).pathname; } catch { return ""; } })();
      return path.split("/").filter(Boolean).length >= 2; // /blog/something or /guides/something
    };

    const candidatePages: CompetitorPage[] = organic.slice(0, 8).map((r, i) => ({
      title: r.title || "",
      url: r.link || "",
      snippet: r.snippet || "",
      position: r.position || i + 1,
      headings: [],
      wordCount: 0,
      topics: [],
      hasFaq: false,
      hasTable: false,
    }));

    // 2. Fetch top 3 article-like pages and extract STRUCTURE only
    const targetsForScrape = candidatePages
      .filter((p) => articleLikely(p.url))
      .slice(0, 3);

    await Promise.all(
      targetsForScrape.map(async (page) => {
        try {
          const ac = new AbortController();
          const timer = setTimeout(() => ac.abort(), 8000);
          const res = await fetch(page.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; RanqapexBot/1.0; +https://ranqapex.com)",
              Accept: "text/html",
            },
            signal: ac.signal,
          });
          clearTimeout(timer);
          if (!res.ok) return;
          const html = await res.text();
          const $ = cheerio.load(html);

          // Headings (structural signal — what topics did they cover?)
          const headings: string[] = [];
          $("h1, h2, h3").each((_, el) => {
            const text = $(el).text().trim().replace(/\s+/g, " ");
            if (text && text.length > 3 && text.length < 200) headings.push(text);
          });

          // Word count (length signal — to inform target length, not for copying)
          const bodyText = $("article, main, .content, .post-content, .entry-content, body")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();
          const wordCount = bodyText.split(/\s+/).length;

          page.headings = headings.slice(0, 20);
          page.wordCount = wordCount;
          page.topics = extractTopics(headings);
          page.hasFaq = /faq|frequently asked/i.test(html) || $("[itemtype*='FAQPage']").length > 0;
          page.hasTable = $("table").length > 0;
        } catch {
          // silent — fall back to snippet only
        }
      })
    );

    // 3. People Also Ask (real Google data via Serper)
    const peopleAlsoAsk: string[] = (serp.peopleAlsoAsk || [])
      .map((p: { question: string }) => p.question)
      .filter(Boolean)
      .slice(0, 8);

    // 4. Related searches
    const relatedSearches: string[] = (serp.relatedSearches || [])
      .map((r: { query: string }) => r.query)
      .filter(Boolean)
      .slice(0, 8);

    // 5. Aggregate signals
    const wordCounts = candidatePages.filter((r) => r.wordCount > 100).map((r) => r.wordCount);
    const avgWordCount = wordCounts.length > 0
      ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
      : 1500;

    const allHeadings = candidatePages.flatMap((r) => r.headings);
    const headingFreq = new Map<string, number>();
    for (const h of allHeadings) {
      const norm = h.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      if (norm.length > 5) headingFreq.set(norm, (headingFreq.get(norm) || 0) + 1);
    }
    const commonHeadings = Array.from(headingFreq.entries())
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([h]) => h);

    const contentBrief = buildContentBrief(
      keyword,
      candidatePages,
      avgWordCount,
      commonHeadings,
      peopleAlsoAsk,
      relatedSearches
    );

    return {
      keyword,
      topResults: candidatePages,
      peopleAlsoAsk,
      relatedSearches,
      avgWordCount,
      commonHeadings,
      contentBrief,
    };
  } catch (err) {
    console.error("[Competitor Research] Error:", err);
    return empty(keyword);
  }
}

function extractTopics(headings: string[]): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "and", "or", "to", "in", "for", "of",
    "with", "how", "what", "why", "your", "our", "this", "that", "you",
    "from", "into", "about", "best", "top", "use", "make", "way", "ways",
  ]);
  const topics = new Map<string, number>();
  for (const h of headings) {
    const words = h
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
    for (const w of words) topics.set(w, (topics.get(w) || 0) + 1);
  }
  return Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);
}

function buildContentBrief(
  keyword: string,
  pages: CompetitorPage[],
  avgWordCount: number,
  commonHeadings: string[],
  peopleAlsoAsk: string[],
  relatedSearches: string[]
): string {
  const lines: string[] = [];
  lines.push(`SERP BRIEF — KEYWORD: "${keyword}"`);
  lines.push(`Source: Google top ${pages.length} results (via Serper)`);
  lines.push("");

  lines.push(`TOP-RANKING URLS (for reference only — DO NOT COPY their content):`);
  for (const p of pages.slice(0, 5)) {
    const len = p.wordCount > 100 ? ` · ~${p.wordCount} words` : "";
    lines.push(`  #${p.position}. ${p.title} — ${p.url}${len}`);
  }
  lines.push("");

  lines.push(`AVG WORD COUNT of top results: ${avgWordCount}`);
  lines.push(`Target length for our article: at least ${Math.round(avgWordCount * 1.15)} words`);
  lines.push("");

  if (commonHeadings.length > 0) {
    lines.push(`TOPICS THE TOP RESULTS COVER (use as a topic checklist — write your own original sections):`);
    for (const h of commonHeadings) lines.push(`  - ${h}`);
    lines.push("");
  }

  if (peopleAlsoAsk.length > 0) {
    lines.push(`PEOPLE ALSO ASK on Google (turn these into FAQ items at the end of the article):`);
    for (const q of peopleAlsoAsk) lines.push(`  - ${q}`);
    lines.push("");
  }

  if (relatedSearches.length > 0) {
    lines.push(`RELATED SEARCHES (semantically related — weave these in naturally):`);
    for (const r of relatedSearches) lines.push(`  - ${r}`);
    lines.push("");
  }

  const hasFaqCount = pages.filter((p) => p.hasFaq).length;
  const hasTableCount = pages.filter((p) => p.hasTable).length;
  if (hasFaqCount > 0 || hasTableCount > 0) {
    lines.push(`FORMAT SIGNALS:`);
    if (hasFaqCount > 0) lines.push(`  - ${hasFaqCount}/${pages.length} top results include FAQ — include FAQPage schema`);
    if (hasTableCount > 0) lines.push(`  - ${hasTableCount}/${pages.length} top results include tables — consider a comparison table`);
    lines.push("");
  }

  lines.push(`STRICT INSTRUCTIONS:`);
  lines.push(`  - This brief is a competitive analysis. WRITE ORIGINAL CONTENT.`);
  lines.push(`  - Do NOT copy phrasing, paragraphs, or lists from any source URL.`);
  lines.push(`  - Use the topic checklist to ensure full coverage, but write everything in your own words and structure.`);
  lines.push(`  - Add at least one angle the top results miss (your unique value).`);
  lines.push(`  - Use more specific data, examples, and current ${new Date().getFullYear()} context than competitors.`);

  return lines.join("\n");
}
