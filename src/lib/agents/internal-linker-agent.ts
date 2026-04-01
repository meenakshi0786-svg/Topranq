import { db, schema } from "../db";
import { eq } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────

export interface InternalLinkerConfig {
  maxSuggestions: number;
  articleId?: string; // If provided, insert links into this article's markdown
}

export interface LinkInserted {
  fromAnchor: string;
  toUrl: string;
  reason: string;
  section: string;
  confidence: number; // 0–1
}

export interface SkippedOpportunity {
  suggestedAnchor: string;
  suggestedTargetTopic: string;
  reason: string;
}

export interface InternalLinkerOutput {
  // Original suggestion-only fields (for domain-wide analysis)
  suggestions: LinkSuggestion[];
  orphanPages: Array<{ url: string; title: string }>;
  stats: {
    totalPages: number;
    totalExistingLinks: number;
    orphanCount: number;
    suggestionsGenerated: number;
    avgLinksPerPage: number;
  };
  // Article-level linking (when articleId is provided)
  articleLinking?: {
    updatedMarkdown: string;
    linksAdded: LinkInserted[];
    skippedOpportunities: SkippedOpportunity[];
    counts: { totalLinks: number; uniqueTargets: number };
  };
}

export interface LinkSuggestion {
  sourceUrl: string;
  sourceTitle: string;
  targetUrl: string;
  targetTitle: string;
  anchorText: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export const INTERNAL_LINKER_CREDITS = 2;

// ── Main entry ────────────────────────────────────────────────────────

export async function runInternalLinker(
  domainId: string,
  config: InternalLinkerConfig,
): Promise<InternalLinkerOutput> {
  const maxSuggestions = config.maxSuggestions || 20;

  const allPages = db.select().from(schema.pages).where(eq(schema.pages.domainId, domainId)).all();
  const existingLinks = db.select().from(schema.internalLinks).where(eq(schema.internalLinks.domainId, domainId)).all();

  // Domain-wide analysis
  const domainResult = analyzeDomain(allPages, existingLinks, maxSuggestions);

  // Article-level linking
  let articleLinking: InternalLinkerOutput["articleLinking"];
  if (config.articleId) {
    const article = db.select().from(schema.articles).where(eq(schema.articles.id, config.articleId)).get();
    if (article?.bodyMarkdown) {
      articleLinking = insertLinksIntoArticle(
        article.bodyMarkdown,
        article.targetKeyword || "",
        allPages,
        existingLinks,
        domainId,
      );

      // Save updated markdown back to article
      db.update(schema.articles)
        .set({
          bodyMarkdown: articleLinking.updatedMarkdown,
          internalLinksJson: JSON.stringify(articleLinking.linksAdded),
        })
        .where(eq(schema.articles.id, config.articleId))
        .run();

      // Log each inserted link into internal_links table
      for (const link of articleLinking.linksAdded) {
        const targetPage = allPages.find((p) => p.url === link.toUrl);
        db.insert(schema.internalLinks)
          .values({
            domainId,
            fromPageId: null, // article, not a crawled page
            toPageId: targetPage?.id || null,
            anchorText: link.fromAnchor,
          })
          .run();
      }
    }
  }

  return { ...domainResult, articleLinking };
}

// ── Article-level link insertion ──────────────────────────────────────

function insertLinksIntoArticle(
  markdown: string,
  targetKeyword: string,
  allPages: Array<{ id: string; url: string; title: string | null; h1: string | null; metaDescription: string | null; wordCount: number | null }>,
  existingLinks: Array<{ fromPageId: string | null; toPageId: string | null }>,
  _domainId: string,
): NonNullable<InternalLinkerOutput["articleLinking"]> {
  const linksAdded: LinkInserted[] = [];
  const skippedOpportunities: SkippedOpportunity[] = [];
  const usedUrls = new Set<string>();
  const lines = markdown.split("\n");
  const totalWords = markdown.split(/\s+/).length;

  // Max links: 1 per 150–200 words, capped at 10
  const maxLinks = Math.min(10, Math.floor(totalWords / 150));

  // Build candidate targets ranked by relevance
  const candidates = rankCandidatePages(allPages, targetKeyword, markdown);

  // Identify insertion zones: first 30%, middle, last 30%
  const totalLines = lines.length;
  const zones = [
    { name: "early", start: 0, end: Math.floor(totalLines * 0.3) },
    { name: "middle", start: Math.floor(totalLines * 0.3), end: Math.floor(totalLines * 0.7) },
    { name: "late", start: Math.floor(totalLines * 0.7), end: totalLines },
  ];

  // Find pillar page (homepage or page with most inbound links)
  const pillarPage = findPillarPage(allPages, existingLinks);
  let pillarLinked = false;

  for (const zone of zones) {
    if (linksAdded.length >= maxLinks) break;

    // Try to place ~1/3 of links in each zone
    const zoneTarget = Math.max(1, Math.ceil(maxLinks / 3));
    let zonePlaced = 0;

    for (let li = zone.start; li < zone.end && zonePlaced < zoneTarget && linksAdded.length < maxLinks; li++) {
      const line = lines[li];

      // Skip headings, code blocks, tables, lines with existing links, empty lines, comments
      if (isSkippableLine(line)) continue;

      for (const candidate of candidates) {
        if (usedUrls.has(candidate.url)) continue;
        if (linksAdded.length >= maxLinks) break;

        // Find a natural anchor in this line
        const anchor = findNaturalAnchor(line, candidate, targetKeyword);
        if (!anchor) continue;

        // Validate anchor length (2–6 words)
        const anchorWords = anchor.split(/\s+/).length;
        if (anchorWords < 2 || anchorWords > 6) continue;

        // Insert the link
        const linkedLine = line.replace(anchor, `[${anchor}](${candidate.url})`);
        lines[li] = linkedLine;

        const currentSection = findCurrentSection(lines, li);
        linksAdded.push({
          fromAnchor: anchor,
          toUrl: candidate.url,
          reason: candidate.reason,
          section: currentSection,
          confidence: candidate.score,
        });

        usedUrls.add(candidate.url);
        zonePlaced++;

        if (candidate.url === pillarPage?.url) pillarLinked = true;
        break;
      }
    }
  }

  // Ensure pillar page link if not yet linked and we have room
  if (pillarPage && !pillarLinked && linksAdded.length < maxLinks && !usedUrls.has(pillarPage.url)) {
    // Find any suitable line in the middle third
    for (let li = zones[1].start; li < zones[1].end; li++) {
      const line = lines[li];
      if (isSkippableLine(line)) continue;

      const anchor = pillarPage.title || "our main guide";
      if (line.length > 40) {
        // Append a natural reference
        lines[li] = line.replace(/\.$/, ` — for more, see [${anchor}](${pillarPage.url}).`);
        linksAdded.push({
          fromAnchor: anchor,
          toUrl: pillarPage.url,
          reason: "Pillar page link for topical authority",
          section: findCurrentSection(lines, li),
          confidence: 0.9,
        });
        usedUrls.add(pillarPage.url);
        break;
      }
    }
  }

  // Record skipped opportunities
  for (const candidate of candidates) {
    if (usedUrls.has(candidate.url)) continue;
    if (skippedOpportunities.length >= 5) break;
    skippedOpportunities.push({
      suggestedAnchor: candidate.title || candidate.url,
      suggestedTargetTopic: candidate.reason,
      reason: "No natural anchor found in article text",
    });
  }

  // Check for "create new page" suggestions if few links placed
  if (linksAdded.length < 3) {
    const kwWords = extractSignificantWords(targetKeyword + " " + markdown.slice(0, 500));
    const coveredTopics = new Set(allPages.map((p) => (p.title || "").toLowerCase()));
    for (const w of kwWords.slice(0, 3)) {
      if (!coveredTopics.has(w) && skippedOpportunities.length < 10) {
        skippedOpportunities.push({
          suggestedAnchor: capitalize(w),
          suggestedTargetTopic: `Create a dedicated page about "${w}" to strengthen topical authority`,
          reason: "No existing page covers this topic",
        });
      }
    }
  }

  return {
    updatedMarkdown: lines.join("\n"),
    linksAdded,
    skippedOpportunities,
    counts: {
      totalLinks: linksAdded.length,
      uniqueTargets: usedUrls.size,
    },
  };
}

// ── Candidate ranking ─────────────────────────────────────────────────

interface RankedCandidate {
  url: string;
  title: string;
  score: number; // 0–1
  reason: string;
  keywords: string[];
}

function rankCandidatePages(
  pages: Array<{ url: string; title: string | null; h1: string | null; metaDescription: string | null }>,
  targetKeyword: string,
  articleText: string,
): RankedCandidate[] {
  const articleWords = extractSignificantWords(articleText.slice(0, 2000));
  const kwWords = extractSignificantWords(targetKeyword);

  const candidates: RankedCandidate[] = [];

  for (const page of pages) {
    const pageText = `${page.title || ""} ${page.h1 || ""} ${page.metaDescription || ""}`;
    const pageWords = extractSignificantWords(pageText);

    // TF-IDF-style scoring: keyword overlap + topical relevance
    const kwOverlap = kwWords.filter((w) => pageWords.includes(w)).length;
    const contentOverlap = articleWords.filter((w) => pageWords.includes(w)).length;

    // Normalize scores
    const kwScore = kwWords.length > 0 ? kwOverlap / kwWords.length : 0;
    const contentScore = articleWords.length > 0 ? Math.min(1, contentOverlap / 5) : 0;
    const combinedScore = kwScore * 0.6 + contentScore * 0.4;

    if (combinedScore > 0.1) {
      const overlapWords = [...new Set([
        ...kwWords.filter((w) => pageWords.includes(w)),
        ...articleWords.filter((w) => pageWords.includes(w)),
      ])].slice(0, 5);

      candidates.push({
        url: page.url,
        title: page.title || page.url,
        score: Math.round(combinedScore * 100) / 100,
        reason: `Topical relevance: ${overlapWords.join(", ")}`,
        keywords: pageWords,
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 20);
}

// ── Anchor finding ────────────────────────────────────────────────────

function findNaturalAnchor(line: string, candidate: RankedCandidate, targetKeyword: string): string | null {
  // Don't use the exact target keyword as anchor (avoids keyword stuffing)
  const kwLower = targetKeyword.toLowerCase();

  // Strategy 1: Find the candidate's title (or partial) in the line
  const titleWords = (candidate.title || "").split(/\s+/);
  if (titleWords.length >= 2 && titleWords.length <= 6) {
    const titlePhrase = candidate.title!;
    if (line.toLowerCase().includes(titlePhrase.toLowerCase()) && titlePhrase.toLowerCase() !== kwLower) {
      // Find exact case match in line
      const idx = line.toLowerCase().indexOf(titlePhrase.toLowerCase());
      return line.slice(idx, idx + titlePhrase.length);
    }
  }

  // Strategy 2: Find 2–4 word phrases from candidate keywords in the line
  for (const kw of candidate.keywords) {
    if (kw === kwLower || kw.length < 4) continue;
    const regex = new RegExp(`\\b(\\w+\\s+)?${escapeRegex(kw)}(\\s+\\w+)?\\b`, "i");
    const match = line.match(regex);
    if (match && match[0]) {
      const phrase = match[0].trim();
      const wordCount = phrase.split(/\s+/).length;
      if (wordCount >= 2 && wordCount <= 6 && phrase.toLowerCase() !== kwLower) {
        return phrase;
      }
    }
  }

  // Strategy 3: Find topic-related multi-word phrases
  const lineLower = line.toLowerCase();
  for (const kw of candidate.keywords.slice(0, 3)) {
    const idx = lineLower.indexOf(kw);
    if (idx === -1) continue;

    // Expand to nearby words for a 2–4 word anchor
    const before = line.slice(0, idx).split(/\s+/);
    const after = line.slice(idx + kw.length).split(/\s+/);
    const anchorParts = [];
    if (before.length > 0 && before[before.length - 1].length > 2) {
      anchorParts.push(before[before.length - 1]);
    }
    anchorParts.push(line.slice(idx, idx + kw.length));
    if (after.length > 0 && after[0].length > 2) {
      anchorParts.push(after[0].replace(/[.,;:!?]$/, ""));
    }

    const anchor = anchorParts.join(" ").trim();
    const wordCount = anchor.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 6 && anchor.toLowerCase() !== kwLower) {
      return anchor;
    }
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────

function isSkippableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^#{1,6}\s/.test(trimmed)) return true; // heading
  if (/^```/.test(trimmed)) return true; // code block
  if (/^\|/.test(trimmed)) return true; // table
  if (/\[.*\]\(.*\)/.test(trimmed)) return true; // already has a link
  if (/^<!--/.test(trimmed)) return true; // comment
  if (/^>/.test(trimmed)) return true; // blockquote
  if (trimmed.length < 30) return true; // too short for natural link
  return false;
}

function findCurrentSection(lines: string[], currentIndex: number): string {
  for (let i = currentIndex; i >= 0; i--) {
    const match = lines[i].match(/^#{1,3}\s+(.+)/);
    if (match) return match[1];
  }
  return "Introduction";
}

function findPillarPage(
  pages: Array<{ id: string; url: string; title: string | null }>,
  links: Array<{ toPageId: string | null }>,
): { url: string; title: string } | null {
  if (pages.length === 0) return null;

  // Find page with most inbound links
  const inboundMap = new Map<string, number>();
  for (const link of links) {
    if (link.toPageId) {
      inboundMap.set(link.toPageId, (inboundMap.get(link.toPageId) || 0) + 1);
    }
  }

  let best = pages[0];
  let bestCount = 0;
  for (const page of pages) {
    const count = inboundMap.get(page.id) || 0;
    // Homepage heuristic
    const isHome = page.url.replace(/\/$/, "").split("/").length <= 3;
    const adjusted = isHome ? count + 100 : count;
    if (adjusted > bestCount) {
      bestCount = adjusted;
      best = page;
    }
  }

  return { url: best.url, title: best.title || best.url };
}

// ── Domain-wide analysis (original functionality) ─────────────────────

function analyzeDomain(
  allPages: Array<{ id: string; url: string; title: string | null; h1: string | null }>,
  existingLinks: Array<{ fromPageId: string | null; toPageId: string | null; anchorText: string | null }>,
  maxSuggestions: number,
): Omit<InternalLinkerOutput, "articleLinking"> {
  if (allPages.length === 0) {
    return {
      suggestions: [],
      orphanPages: [],
      stats: { totalPages: 0, totalExistingLinks: 0, orphanCount: 0, suggestionsGenerated: 0, avgLinksPerPage: 0 },
    };
  }

  const inboundCount = new Map<string, number>();
  const existingPairs = new Set<string>();

  for (const page of allPages) {
    inboundCount.set(page.id, 0);
  }

  for (const link of existingLinks) {
    if (link.toPageId) inboundCount.set(link.toPageId, (inboundCount.get(link.toPageId) || 0) + 1);
    if (link.fromPageId && link.toPageId) existingPairs.add(`${link.fromPageId}→${link.toPageId}`);
  }

  const orphanPages = allPages
    .filter((p) => {
      const inbound = inboundCount.get(p.id) || 0;
      const isHomepage = p.url.replace(/\/$/, "").split("/").length <= 3;
      return inbound === 0 && !isHomepage;
    })
    .map((p) => ({ url: p.url, title: p.title || p.url }));

  const suggestions: LinkSuggestion[] = [];
  const pageKeywords = allPages.map((page) => ({
    page,
    words: extractSignificantWords(`${page.title || ""} ${page.h1 || ""}`),
  }));

  for (let i = 0; i < pageKeywords.length && suggestions.length < maxSuggestions; i++) {
    for (let j = 0; j < pageKeywords.length && suggestions.length < maxSuggestions; j++) {
      if (i === j) continue;

      const source = pageKeywords[i];
      const target = pageKeywords[j];
      const pairKey = `${source.page.id}→${target.page.id}`;
      if (existingPairs.has(pairKey)) continue;

      const overlap = source.words.filter((w) => target.words.includes(w));
      if (overlap.length >= 2) {
        const targetInbound = inboundCount.get(target.page.id) || 0;

        const priority: "high" | "medium" | "low" =
          targetInbound === 0 ? "high" : targetInbound <= 2 ? "medium" : "low";

        let reason: string;
        if (targetInbound === 0) {
          reason = `Orphan page — "${target.page.title}" has no inbound links. Overlap: ${overlap.slice(0, 3).join(", ")}`;
        } else if (targetInbound <= 2) {
          reason = `Low link equity — ${targetInbound} inbound. Keywords: ${overlap.slice(0, 3).join(", ")}`;
        } else {
          reason = `Content relevance — ${overlap.length} shared keywords: ${overlap.slice(0, 3).join(", ")}`;
        }

        // Vary anchor text naturally
        const anchorOptions = [
          target.page.title,
          overlap.slice(0, 3).map(capitalize).join(" "),
          target.page.h1,
        ].filter(Boolean) as string[];
        const anchorText = anchorOptions[suggestions.length % anchorOptions.length] || target.page.title || target.page.url;

        suggestions.push({
          sourceUrl: source.page.url,
          sourceTitle: source.page.title || source.page.url,
          targetUrl: target.page.url,
          targetTitle: target.page.title || target.page.url,
          anchorText,
          reason,
          priority,
        });

        existingPairs.add(pairKey);
      }
    }
  }

  suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const totalLinks = existingLinks.length;
  const avgLinksPerPage = allPages.length > 0 ? Math.round((totalLinks / allPages.length) * 10) / 10 : 0;

  return {
    suggestions: suggestions.slice(0, maxSuggestions),
    orphanPages,
    stats: {
      totalPages: allPages.length,
      totalExistingLinks: totalLinks,
      orphanCount: orphanPages.length,
      suggestionsGenerated: suggestions.length,
      avgLinksPerPage,
    },
  };
}

// ── Shared utilities ──────────────────────────────────────────────────

function extractSignificantWords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "and", "but", "or",
    "not", "no", "nor", "so", "yet", "both", "either", "neither",
    "each", "every", "all", "any", "few", "more", "most", "other",
    "some", "such", "than", "too", "very", "just", "about", "up", "out",
    "if", "then", "that", "this", "these", "those", "it", "its",
    "how", "what", "when", "where", "who", "which", "why",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
