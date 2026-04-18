/**
 * AI-powered internal linking between Pillar and Cluster articles.
 *
 * Uses a SAFE find/replace approach: Claude returns link insertion instructions
 * (original phrase → linked phrase), which are applied to the ORIGINAL full article.
 * This prevents the truncation bug where Claude would return shortened articles.
 */

import { db, schema } from "./db";
import { eq } from "drizzle-orm";

interface ArticleRef {
  id: string;
  slug: string | null;
  title: string;
  bodyMarkdown: string;
}

export interface InterlinkResult {
  updatedArticles: number;
  linksInserted: number;
  details: Array<{ articleId: string; title: string; linksAdded: number }>;
}

interface LinkInstruction {
  articleId: string;
  find: string;
  replace: string;
}

export async function interlinkPillarCluster(pillarId: string): Promise<InterlinkResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const pillar = db.select().from(schema.pillars).where(eq(schema.pillars.id, pillarId)).get();
  if (!pillar) throw new Error("Pillar not found");

  const pillarArticle = pillar.pillarArticleId
    ? db.select().from(schema.articles).where(eq(schema.articles.id, pillar.pillarArticleId)).get()
    : null;

  const clusters = db
    .select()
    .from(schema.pillarClusters)
    .where(eq(schema.pillarClusters.pillarId, pillarId))
    .all();

  const clusterArticles: ArticleRef[] = [];
  for (const c of clusters) {
    if (!c.articleId) continue;
    const art = db.select().from(schema.articles).where(eq(schema.articles.id, c.articleId)).get();
    if (art && art.bodyMarkdown) {
      clusterArticles.push({
        id: art.id,
        slug: art.slug,
        title: art.metaTitle || art.h1 || c.clusterTopic,
        bodyMarkdown: art.bodyMarkdown,
      });
    }
  }

  if (clusterArticles.length === 0) {
    return { updatedArticles: 0, linksInserted: 0, details: [] };
  }

  const pillarRef: ArticleRef | null = pillarArticle?.bodyMarkdown
    ? {
        id: pillarArticle.id,
        slug: pillarArticle.slug,
        title: pillarArticle.metaTitle || pillarArticle.h1 || pillar.topic,
        bodyMarkdown: pillarArticle.bodyMarkdown,
      }
    : null;

  // Build a summary of articles (titles + slugs + first 500 chars) — NOT full content
  const articleSummary = buildArticleSummary(pillarRef, clusterArticles);

  const prompt = `You are an expert in SEO content architecture and internal linking. Create precise, natural, SEO-optimized internal links between a Pillar article and its Cluster articles.

${articleSummary}

TASK: Return FIND/REPLACE instructions to insert internal links. For each link:
- The article ID where the link goes
- The exact existing phrase to find (verbatim, case-sensitive)
- The replacement with a markdown [link](/slug) inserted

═══ PILLAR → CLUSTER LINKING (MANDATORY) ═══

Every cluster MUST be linked from the pillar. No exceptions.

Strategy for each cluster:
1. FIRST: Scan the pillar content for the cluster title or a close variation
   → If found, convert that phrase into [phrase](/cluster-slug)
2. IF NOT FOUND: Look for a semantically related phrase (the cluster's topic mentioned differently)
   → Convert that phrase into a link
3. LAST RESORT: Append a natural sentence at the end of the most relevant paragraph
   → "For a detailed breakdown, see our guide on [cluster topic](/cluster-slug)."

Rules:
- Each cluster linked at least 1 time, maximum 2 times
- Prefer exact match anchors, then close semantic variations
- Spread links across different sections — not all in one paragraph

═══ CLUSTER → PILLAR LINKING (MANDATORY) ═══

Every cluster MUST link back to the pillar exactly once.

Strategy:
1. Find the first natural mention of the pillar topic in the cluster's introduction or first section
   → Convert it into [pillar topic phrase](/pillar-slug)
2. If no natural mention exists, add a sentence in the introduction:
   → "As covered in our [pillar topic](/pillar-slug), understanding the fundamentals is essential."

Rules:
- Only 1 link per cluster back to the pillar
- Place in the introduction or first relevant section — not buried at the end

═══ CLUSTER ↔ CLUSTER LINKING (OPTIONAL) ═══

Only if two clusters are strongly related:
- Add 1 contextual link between them
- Do NOT force this — skip if the connection isn't natural

═══ ANCHOR TEXT RULES ═══

GOOD anchors (keyword-rich, descriptive, natural):
- Exact match: "vertical spreads" → [vertical spreads](/vertical-spreads)
- Semantic match: "layering strategies for cold weather" → [layering strategies for cold weather](/winter-layering-guide)
- Contextual: "building multi-leg options positions" → [building multi-leg options positions](/multi-leg-options)
- Descriptive: "complete guide to capsule wardrobes" → [complete guide to capsule wardrobes](/capsule-wardrobe)

WEAK anchors (REPLACE with descriptive versions):
- TOO SHORT: [spreads](/vertical-spreads) → use [vertical spread strategies](/vertical-spreads)
- TOO VAGUE: [options](/options-chain) → use [real-time options chain analysis](/options-chain)
- SINGLE WORD: [trading](/strategies) → use [options trading strategies](/strategies)
- REPEATED: if "vertical spreads" is already used as anchor, use a VARIATION next time like "spread trading techniques" or "building vertical positions"

BAD anchors (NEVER use):
- "click here", "read more", "learn more", "this article", "here", "this guide"

ANCHOR VARIATION (CRITICAL):
- NEVER repeat the exact same anchor text for the same target URL
- If linking to the same cluster twice, use DIFFERENT descriptive phrases each time
  Example: first link → [iron condor strategy breakdown](/iron-condor)
           second link → [advanced iron condor techniques](/iron-condor)
- Minimum 3 words per anchor, prefer 4-6 word descriptive phrases

READABILITY AROUND LINKS:
- The sentence containing the link must read naturally with or without the link
- BAD: "You should check out [vertical spreads](/vertical-spreads) for more info."
- GOOD: "Traders looking to limit risk often start with [vertical spread strategies](/vertical-spreads) before progressing to more complex structures."
- The link should be PART of the sentence's meaning, not an interruption

═══ LINK DENSITY CONTROL ═══

- Maximum 1 link per 150-200 words of content
- Spread links evenly across the article — not clustered in one section
- Never put 2 links in the same sentence
- Maximum 2 links per paragraph

═══ OUTPUT FORMAT ═══

Return STRICT JSON only (no markdown fences, no prose):
{
  "instructions": [
    {
      "articleId": "the-article-id",
      "find": "exact phrase from the article (verbatim, case-sensitive)",
      "replace": "[exact phrase with link](/target-slug)",
      "type": "replace"
    },
    {
      "articleId": "the-article-id",
      "find": "last sentence of paragraph to append after",
      "replace": "last sentence of paragraph to append after. For a detailed breakdown, see our guide on [topic](/slug).",
      "type": "append"
    }
  ]
}

═══ FINAL QUALITY CHECK ═══

Before returning, verify ALL:
□ Every cluster slug appears in at least 1 instruction targeting the pillar
□ Every cluster has exactly 1 instruction linking back to the pillar
□ All "find" strings are EXACT phrases from the article previews (case-sensitive)
□ No "click here" or generic anchors
□ No two links in the same sentence
□ Links feel natural when read aloud — if forced, revise or remove

If ANY cluster is missing from the pillar's links, go back and add it before returning.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse interlink response");

  // Sanitize control chars in JSON strings
  const sanitized = jsonMatch[0].replace(
    /"(?:[^"\\]|\\.)*"/g,
    (match: string) => match
      .replace(/(?<!\\)\n/g, "\\n")
      .replace(/(?<!\\)\r/g, "\\r")
      .replace(/(?<!\\)\t/g, "\\t")
      .replace(/[\x00-\x1f]/g, (c: string) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`),
  );

  let parsed: { instructions?: LinkInstruction[] };
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw new Error("Could not parse interlink response as JSON");
  }

  if (!parsed.instructions || !Array.isArray(parsed.instructions)) {
    return { updatedArticles: 0, linksInserted: 0, details: [] };
  }

  // Apply instructions to ORIGINAL full articles
  const articleUpdates = new Map<string, { markdown: string; count: number }>();

  // Load original full articles into the map
  const allArticles = [pillarRef, ...clusterArticles].filter(Boolean) as ArticleRef[];
  for (const art of allArticles) {
    articleUpdates.set(art.id, { markdown: art.bodyMarkdown, count: 0 });
  }

  for (const inst of parsed.instructions) {
    const entry = articleUpdates.get(inst.articleId);
    if (!entry) continue;
    if (!inst.find || !inst.replace) continue;

    // Apply the find/replace on the FULL original markdown
    if (entry.markdown.includes(inst.find)) {
      entry.markdown = entry.markdown.replace(inst.find, inst.replace);
      entry.count++;
    }
  }

  // Save updated articles back to DB
  let totalLinks = 0;
  const details: InterlinkResult["details"] = [];
  let updatedCount = 0;

  for (const [articleId, update] of articleUpdates) {
    if (update.count === 0) continue;

    db.update(schema.articles)
      .set({ bodyMarkdown: update.markdown })
      .where(eq(schema.articles.id, articleId))
      .run();

    updatedCount++;
    totalLinks += update.count;

    const art = allArticles.find((a) => a.id === articleId);
    details.push({
      articleId,
      title: art?.title || "Untitled",
      linksAdded: update.count,
    });
  }

  return { updatedArticles: updatedCount, linksInserted: totalLinks, details };
}

/**
 * Build a summary of articles for the prompt — titles, slugs, and FIRST 500 chars only.
 * NEVER send full content to Claude (it would return truncated versions).
 */
function buildArticleSummary(pillar: ArticleRef | null, clusters: ArticleRef[]): string {
  const sections: string[] = [];

  if (pillar) {
    const headings = extractHeadings(pillar.bodyMarkdown);
    const preview = pillar.bodyMarkdown.slice(0, 800);
    sections.push(`PILLAR ARTICLE:
ID: ${pillar.id}
Title: ${pillar.title}
Slug: /${pillar.slug || "pillar"}
Headings: ${headings.join(" | ")}
Preview (first 800 chars):
${preview}`);
  }

  for (const c of clusters) {
    const headings = extractHeadings(c.bodyMarkdown);
    const preview = c.bodyMarkdown.slice(0, 500);
    sections.push(`CLUSTER ARTICLE:
ID: ${c.id}
Title: ${c.title}
Slug: /${c.slug || "cluster"}
Headings: ${headings.join(" | ")}
Preview (first 500 chars):
${preview}`);
  }

  return sections.join("\n\n---\n\n");
}

function extractHeadings(markdown: string): string[] {
  const headings: string[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}
