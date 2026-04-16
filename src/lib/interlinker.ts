/**
 * AI-powered internal linking between Pillar and Cluster articles.
 *
 * Given a pillar article + its cluster articles, uses Claude to:
 * 1. Pillar → Cluster: find natural phrases in the pillar to link to each cluster (1-2 per cluster)
 * 2. Cluster → Pillar: add 1 contextual backlink in each cluster's intro/body
 * 3. Cluster ↔ Cluster: add 1-2 cross-links between related clusters
 *
 * Only modifies sentences where links are inserted — preserves content integrity.
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

  // Build the article map for the prompt
  const articleMap = buildArticleMap(pillarRef, clusterArticles);

  const prompt = `You are an expert in SEO internal linking. You will interlink a set of related articles (1 pillar + its clusters).

${articleMap}

TASK: Return updated markdown for each article with internal links inserted.

LINKING RULES:
1. PILLAR → CLUSTER: Scan the pillar article. Where a cluster topic or closely related concept is mentioned, convert that existing phrase into a markdown link [phrase](/slug). Max 1-2 links per cluster. Use semantically similar phrases already in the text — do NOT add new sentences.

2. CLUSTER → PILLAR: In each cluster article, add 1 contextual link back to the pillar in the introduction or a relevant section. Use a natural phrase that reflects the pillar topic.

3. CLUSTER ↔ CLUSTER: If two clusters are related, add 1 cross-link between them. Only where strong topical overlap exists.

4. PRESERVE CONTENT: Do NOT rewrite articles. Only modify the specific words/phrases that become link anchors. Keep tone and flow intact.

5. NATURAL ANCHORS ONLY: Use existing phrases. Never use "click here" or "read more". Prefer keyword-rich, natural text.

6. NO OVER-LINKING: Max 1-2 links per paragraph. No duplicate links to the same target.

OUTPUT FORMAT — Return STRICT JSON only (no markdown fences, no prose):
{
  "articles": [
    {
      "id": "article-id",
      "updatedMarkdown": "full updated markdown with links inserted",
      "linksAdded": 3
    }
  ]
}

QUALITY CHECK before returning:
- Links feel natural when read aloud
- No forced or irrelevant links
- Each cluster is meaningfully connected to the pillar
- No duplicate or excessive linking
- Anchors are keyword-rich, not generic`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-haiku",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse interlink response");

  const parsed = JSON.parse(jsonMatch[0]) as {
    articles?: Array<{ id: string; updatedMarkdown: string; linksAdded: number }>;
  };

  if (!parsed.articles || !Array.isArray(parsed.articles)) {
    throw new Error("Invalid interlink response structure");
  }

  let totalLinks = 0;
  const details: InterlinkResult["details"] = [];
  let updatedCount = 0;

  for (const update of parsed.articles) {
    if (!update.id || !update.updatedMarkdown || update.linksAdded === 0) continue;

    const existing = db.select().from(schema.articles).where(eq(schema.articles.id, update.id)).get();
    if (!existing) continue;

    db.update(schema.articles)
      .set({ bodyMarkdown: update.updatedMarkdown })
      .where(eq(schema.articles.id, update.id))
      .run();

    updatedCount++;
    totalLinks += update.linksAdded;
    details.push({
      articleId: update.id,
      title: existing.metaTitle || existing.h1 || "Untitled",
      linksAdded: update.linksAdded,
    });
  }

  return { updatedArticles: updatedCount, linksInserted: totalLinks, details };
}

function buildArticleMap(pillar: ArticleRef | null, clusters: ArticleRef[]): string {
  const sections: string[] = [];

  if (pillar) {
    // Truncate body to fit context — keep first 2000 chars
    const body = pillar.bodyMarkdown.length > 2000
      ? pillar.bodyMarkdown.slice(0, 2000) + "\n[...truncated]"
      : pillar.bodyMarkdown;
    sections.push(`PILLAR ARTICLE:
ID: ${pillar.id}
Title: ${pillar.title}
Slug: /${pillar.slug || "pillar"}
Content:
${body}`);
  }

  for (const c of clusters) {
    const body = c.bodyMarkdown.length > 1200
      ? c.bodyMarkdown.slice(0, 1200) + "\n[...truncated]"
      : c.bodyMarkdown;
    sections.push(`CLUSTER ARTICLE:
ID: ${c.id}
Title: ${c.title}
Slug: /${c.slug || "cluster"}
Content:
${body}`);
  }

  return sections.join("\n\n---\n\n");
}
