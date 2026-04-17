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

  const prompt = `You are an expert in SEO internal linking. You will create link insertion instructions for a set of related articles.

${articleSummary}

TASK: Return a list of FIND/REPLACE instructions. For each link to insert, provide:
- The article ID where the link goes
- The exact existing phrase to find in that article (verbatim, case-sensitive)
- The replacement with a markdown link

LINKING RULES:

1. PILLAR → CLUSTER (MANDATORY — EVERY cluster must be linked):
   - The pillar article MUST have at least 1 link to EVERY cluster. No exceptions.
   - Find an existing phrase in the pillar that relates to each cluster topic.
   - If no suitable phrase exists, provide an "append" instruction: a new sentence to add at the end of a relevant paragraph.
   - The "find" for appends should be the last sentence of the most relevant paragraph (we'll append after it).

2. CLUSTER → PILLAR (MANDATORY):
   - Every cluster MUST have 1 link back to the pillar in its first few paragraphs.
   - Find an existing phrase that relates to the pillar topic.

3. CLUSTER ↔ CLUSTER (optional):
   - Only where strong topical overlap exists, add 1 cross-link.

OUTPUT FORMAT — Return STRICT JSON only (no markdown fences, no prose):
{
  "instructions": [
    {
      "articleId": "the-article-id",
      "find": "exact phrase to find in the article",
      "replace": "[exact phrase with link](/target-slug)",
      "type": "replace"
    },
    {
      "articleId": "the-article-id",
      "find": "last sentence of a paragraph to append after",
      "replace": "last sentence of a paragraph to append after For a deeper dive, see our guide on [topic](/slug).",
      "type": "append"
    }
  ]
}

RULES:
- "find" must be an EXACT phrase that exists in the article (case-sensitive, verbatim)
- "replace" is the same phrase but with a markdown [link](/slug) inserted
- For appends, "replace" includes the original "find" sentence plus the new linking sentence
- Use natural, keyword-rich anchor text — never "click here"
- Max 2 link instructions per target article
- Each cluster slug must appear in at least 1 instruction targeting the pillar article

VERIFICATION: Count your instructions. If any cluster slug is missing from pillar-targeted instructions, add one.`;

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
