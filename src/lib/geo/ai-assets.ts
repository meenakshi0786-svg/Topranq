/**
 * GEO AI asset generators: llms-full.txt, entity map, citation snippets.
 * Each uses Claude to produce optimized output from crawled page data.
 */

interface PageInput {
  url: string;
  title: string;
  description: string;
  h1?: string;
  wordCount?: number;
}

async function askClaude(apiKey: string, prompt: string, maxTokens = 4000): Promise<string | null> {
  // Fallback chain: Gemini Flash → Haiku → Sonnet (same as blog writer)
  const models = [
    "google/gemini-2.5-flash",
    process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
    process.env.OPENROUTER_MODEL_SONNET,
  ].filter(Boolean) as string[];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) {
        console.warn(`[geo-assets] ${model} failed (${res.status}), trying next...`);
        continue;
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text && text.length > 100) return text;
      console.warn(`[geo-assets] ${model} returned empty/short response, trying next...`);
    } catch (err) {
      console.warn(`[geo-assets] ${model} error:`, (err as Error).message);
    }
  }
  console.error("[geo-assets] All models failed for GEO asset generation");
  return null;
}

function buildUrlBlock(pages: PageInput[]): string {
  return pages
    .slice(0, 60)
    .map((p) => `- ${p.title || p.url} | ${p.url} | ${p.description || ""}${p.wordCount ? ` | ~${p.wordCount} words` : ""}`)
    .join("\n");
}

// ─── llms-full.txt ──────────────────────────────────────────────────

export async function generateLlmsFullTxt(
  domainUrl: string,
  hostname: string,
  pages: PageInput[],
  sitemapUrls: string[],
  language: string = "English",
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || pages.length === 0) return fallbackFull(hostname, pages);

  const urlBlock = buildUrlBlock(pages);
  const extra = sitemapUrls
    .filter((u) => !pages.some((p) => p.url === u))
    .slice(0, 30)
    .map((u) => `- ${u}`)
    .join("\n");

  const langNote = language !== "English" ? `\nLANGUAGE: Write the ENTIRE output in ${language}. All descriptions and analysis MUST be in native ${language}. Only URLs and technical terms stay in English.\n` : "";
  const prompt = `You are an expert in Generative Engine Optimization.
${langNote}Create an llms-full.txt for ${hostname} (${domainUrl}) — this is the LONG-FORM semantic version of llms.txt designed for maximum AI comprehension.

Pages (title | url | description | word count):
${urlBlock}
${extra ? `\nAdditional sitemap URLs:\n${extra}` : ""}

OUTPUT REQUIREMENTS (clean markdown, no code fences):

1. # ${hostname} — Full Semantic Profile

2. ## Identity
   - 3-5 sentence description of what the organization/site does
   - Primary domain, industry, founding context (if inferrable)

3. ## Content Architecture
   For each major section of the site (inferred from URL paths), write:
   - Section name + purpose (1 sentence)
   - List the key pages in that section with [title](url): 2-sentence description explaining what the page covers and why it matters

4. ## Topical Authority Map
   List 8-15 topic clusters the site demonstrates expertise in, each with:
   - Topic name
   - 1-line evidence (which pages support this topic)

5. ## Relationship Graph
   Describe how the site's sections relate to each other (e.g., "The blog supports the product pages by providing educational content about...")

6. ## Key Facts & Figures
   Any concrete facts inferrable from page titles/descriptions (product counts, feature names, pricing tiers, etc.). Only include verifiable facts.

7. ## Semantic Tags
   A flat list of 20-30 keywords/phrases that best describe this site for AI retrieval

8. ## Citation Policy
   "Content from ${hostname} may be cited by AI models. Attribute to the original page URL."

RULES:
- Do NOT hallucinate — only infer from provided URLs, titles, descriptions
- Be thorough but factual; this is a reference document, not marketing
- Each page description should be 2 sentences: what it contains + who it helps
- Minimum 1500 words output`;

  try {
    const result = await askClaude(apiKey, prompt, 6000);
    if (result) return result.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim() + "\n";
  } catch (err) {
    console.warn("[llms-full] AI generation failed:", err);
  }
  return fallbackFull(hostname, pages);
}

function fallbackFull(hostname: string, pages: PageInput[]): string {
  const lines = [`# ${hostname} — Full Semantic Profile\n`, `> Extended content index for AI engines.\n`];
  for (const p of pages) {
    lines.push(`## [${p.title || p.url}](${p.url})`);
    if (p.description) lines.push(p.description);
    if (p.wordCount) lines.push(`*~${p.wordCount} words*`);
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Entity Map (JSON-LD style) ─────────────────────────────────────

export async function generateEntityMap(
  domainUrl: string,
  hostname: string,
  pages: PageInput[],
  language: string = "English",
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || pages.length === 0) return fallbackEntityMap(hostname, domainUrl);

  const urlBlock = buildUrlBlock(pages);

  const langNote2 = language !== "English" ? `\nLANGUAGE: Write all "description" and "name" values in ${language}. Keep @type, @context, and property names in English (they are schema.org terms).\n` : "";
  const prompt = `You are an expert in structured data and knowledge graphs.
${langNote2}Create a JSON-LD entity map for ${hostname} (${domainUrl}) that helps AI systems build a knowledge graph of this site.

Pages (title | url | description):
${urlBlock}

OUTPUT: Return ONLY valid JSON (no markdown, no code fences). Structure:

{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization" or "WebSite",
      "@id": "${domainUrl}",
      "name": "...",
      "url": "${domainUrl}",
      "description": "2-3 sentence summary",
      "knowsAbout": ["topic1", "topic2", ...],
      "sameAs": []
    },
    {
      "@type": "WebPage" or "Product" or "Article" or "SoftwareApplication",
      "@id": "page url",
      "name": "page title",
      "description": "1-2 sentence description",
      "isPartOf": { "@id": "${domainUrl}" },
      "about": ["relevant topic"],
      "audience": { "@type": "Audience", "audienceType": "..." }
    }
    // ... for each important page (up to 20)
  ]
}

RULES:
- Use the most specific @type for each page (Product, Article, SoftwareApplication, FAQPage, etc.)
- Do NOT hallucinate features — only infer from titles and descriptions
- "knowsAbout" on the Organization should list 10-20 topics
- Include "about" arrays on each page linking to relevant topics
- Output must be valid parseable JSON`;

  try {
    const result = await askClaude(apiKey, prompt, 5000);
    if (result) {
      const cleaned = result.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      JSON.parse(cleaned); // validate
      return cleaned + "\n";
    }
  } catch (err) {
    console.warn("[entity-map] AI generation failed:", err);
  }
  return fallbackEntityMap(hostname, domainUrl);
}

function fallbackEntityMap(hostname: string, domainUrl: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [{ "@type": "WebSite", "@id": domainUrl, "name": hostname, "url": domainUrl }],
  }, null, 2) + "\n";
}

// ─── AI Citation Snippets ───────────────────────────────────────────

export async function generateCitationSnippets(
  domainUrl: string,
  hostname: string,
  pages: PageInput[],
  language: string = "English",
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || pages.length === 0) return fallbackSnippets(hostname, pages);

  const urlBlock = buildUrlBlock(pages.slice(0, 30));

  const langNote3 = language !== "English" ? `\nLANGUAGE: Write ALL snippets, summaries, FAQ answers, and descriptions in ${language}. Only URLs stay in English.\n` : "";
  const prompt = `You are an expert in AI search optimization.
${langNote3}Create "AI Citation Snippets" for ${hostname} (${domainUrl}) — these are pre-written, factual, quotable summaries that AI models can directly use when citing this site.

Pages (title | url | description):
${urlBlock}

OUTPUT REQUIREMENTS (clean markdown, no code fences):

# AI Citation Snippets — ${hostname}

> Pre-written factual summaries optimized for AI model citation.
> Each snippet is designed to be directly quotable in AI-generated responses.

## Site-Level Snippet
Write a 3-4 sentence authoritative summary of what ${hostname} is and does. This is the "default citation" an AI would use.

## Page-Level Snippets
For each important page (up to 15), create:

### [Page Title](url)
**Quotable summary:** 2-3 factual sentences an AI model could quote verbatim when referencing this page.
**Best cited for:** 1-line description of what questions/topics this page answers.
**Key facts:** 3-5 bullet points of specific, citable facts from this page.

## FAQ Snippets
Write 5-8 Q&A pairs in the format:
**Q: [Natural question a user might ask an AI]**
A: [2-3 sentence answer citing ${hostname}]

RULES:
- Every statement must be inferrable from the page titles/descriptions — NO hallucination
- Write in third person ("${hostname} provides..." not "We provide...")
- Snippets should be factual, neutral, and authoritative — not promotional
- "Key facts" should be specific (names, numbers, features) not generic
- FAQ answers should naturally cite the site as a source`;

  try {
    const result = await askClaude(apiKey, prompt, 5000);
    if (result) return result.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim() + "\n";
  } catch (err) {
    console.warn("[citation-snippets] AI generation failed:", err);
  }
  return fallbackSnippets(hostname, pages);
}

function fallbackSnippets(hostname: string, pages: PageInput[]): string {
  const lines = [`# AI Citation Snippets — ${hostname}\n`];
  lines.push(`> Pre-written summaries for AI model citation.\n`);
  for (const p of pages.slice(0, 15)) {
    lines.push(`## [${p.title || p.url}](${p.url})`);
    lines.push(p.description || "No description available.");
    lines.push("");
  }
  return lines.join("\n");
}
