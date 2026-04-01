import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// GET /api/domains/:id/strategy — generate keyword clusters & content calendar from crawled data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Load all crawled pages
  const pages = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.domainId, id))
    .all();

  if (pages.length === 0) {
    return NextResponse.json(
      { error: "No pages crawled yet. Run an audit first." },
      { status: 400 }
    );
  }

  // Load domain info
  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, id),
  });
  const hostname = (() => {
    try { return new URL(domain?.domainUrl || "").hostname; } catch { return ""; }
  })();

  // Load existing keyword clusters
  const existingClusters = db
    .select()
    .from(schema.keywordClusters)
    .where(eq(schema.keywordClusters.domainId, id))
    .all();

  // Load existing calendar items
  const existingCalendar = db
    .select()
    .from(schema.contentCalendar)
    .where(eq(schema.contentCalendar.domainId, id))
    .all();

  // Load latest audit for context
  const latestAudit = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.domainId, id),
    orderBy: desc(schema.auditRuns.createdAt),
  });

  // Load articles count
  const articles = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, id))
    .all();

  // ── Extract intelligence from crawled pages ──────────────────────

  // 1. Extract all keywords from page titles and H1s
  const allText = pages
    .map((p) => `${p.title || ""} ${p.h1 || ""} ${p.metaDescription || ""}`)
    .join(" ");

  const keywords = extractKeywords(allText);

  // 2. Detect niche
  const niche = detectNiche(allText.toLowerCase());

  // 3. Build keyword clusters from page content
  const clusters = buildClusters(pages, keywords);

  // 4. Generate content calendar suggestions
  const calendar = generateCalendar(clusters, pages, articles, niche);

  // 5. Compute content gap analysis
  const contentGaps = findContentGaps(pages, clusters);

  // 6. Competitor keyword opportunities (from page analysis)
  const topPages = pages
    .filter((p) => (p.wordCount || 0) > 500)
    .sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0))
    .slice(0, 10)
    .map((p) => ({
      url: p.url,
      title: p.title || p.url,
      wordCount: p.wordCount || 0,
      h1: p.h1 || "",
    }));

  return NextResponse.json({
    hostname,
    niche,
    pagesAnalyzed: pages.length,
    articlesCount: articles.length,
    overallScore: latestAudit?.overallScore || null,
    clusters,
    calendar,
    contentGaps,
    topPages,
    savedClusters: existingClusters.length,
    savedCalendarItems: existingCalendar.length,
  });
}

// POST /api/domains/:id/strategy — save clusters and calendar to DB
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { clusters, calendar } = body as {
    clusters: Array<{
      clusterName: string;
      pillarKeyword: string;
      searchVolume: number;
      difficulty: number;
      intentType: string;
      keywords: Array<{ keyword: string; volume: number; difficulty: number }>;
    }>;
    calendar: Array<{
      topic: string;
      targetKeywords: string[];
      contentFormat: string;
      targetWordCount: number;
      priorityScore: number;
      scheduledDate?: string;
    }>;
  };

  // Save keyword clusters
  const clusterIds: Record<string, string> = {};
  for (const cluster of clusters || []) {
    const inserted = db
      .insert(schema.keywordClusters)
      .values({
        domainId: id,
        clusterName: cluster.clusterName,
        pillarKeyword: cluster.pillarKeyword,
        searchVolume: cluster.searchVolume,
        difficulty: cluster.difficulty,
        intentType: cluster.intentType as "informational" | "commercial" | "transactional" | "navigational",
      })
      .returning()
      .get();
    clusterIds[cluster.pillarKeyword] = inserted.id;

    // Save child keywords
    for (const kw of cluster.keywords || []) {
      db.insert(schema.keywords)
        .values({
          clusterId: inserted.id,
          keyword: kw.keyword,
          searchVolume: kw.volume,
          difficulty: kw.difficulty,
        })
        .run();
    }
  }

  // Save content calendar items
  for (const item of calendar || []) {
    db.insert(schema.contentCalendar)
      .values({
        domainId: id,
        topic: item.topic,
        targetKeywords: JSON.stringify(item.targetKeywords),
        contentFormat: item.contentFormat,
        targetWordCount: item.targetWordCount,
        priorityScore: item.priorityScore,
        scheduledDate: item.scheduledDate,
      })
      .run();
  }

  return NextResponse.json({ saved: true });
}

// ── Helper functions ─────────────────────────────────────────────────

function extractKeywords(text: string): Map<string, number> {
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
    "how", "what", "when", "where", "who", "which", "why", "your",
    "our", "we", "you", "they", "he", "she", "my", "me", "us",
    "home", "page", "contact", "about", "privacy", "terms", "copyright",
    "new", "best", "top", "free", "get", "make", "use", "like",
  ]);

  const freq = new Map<string, number>();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    freq.set(phrase, (freq.get(phrase) || 0) + 1);
  }

  return freq;
}

function detectNiche(text: string): string {
  const niches: Record<string, string[]> = {
    "E-commerce": ["shop", "store", "product", "buy", "cart", "price", "shipping", "order"],
    "SaaS / Technology": ["software", "app", "platform", "api", "dashboard", "saas", "tool", "integration"],
    "Marketing / SEO": ["marketing", "seo", "content", "brand", "campaign", "social media", "analytics"],
    "Finance": ["finance", "bank", "investment", "crypto", "trading", "payment", "loan"],
    "Health / Wellness": ["health", "wellness", "medical", "fitness", "nutrition", "therapy"],
    "Education": ["course", "learn", "tutorial", "training", "education", "student"],
    "Real Estate": ["property", "real estate", "rent", "mortgage", "listing", "apartment"],
    "Food / Restaurant": ["food", "recipe", "restaurant", "menu", "delivery", "chef"],
    "Travel": ["travel", "hotel", "booking", "tour", "destination", "flight"],
    "Legal": ["law", "legal", "attorney", "lawyer", "consulting"],
    "News / Media": ["news", "article", "blog", "editorial", "magazine"],
  };

  let bestNiche = "General / Business";
  let bestScore = 0;
  for (const [niche, kws] of Object.entries(niches)) {
    const score = kws.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestNiche = niche; }
  }
  return bestNiche;
}

interface GeneratedCluster {
  clusterName: string;
  pillarKeyword: string;
  searchVolume: number;
  difficulty: number;
  intentType: string;
  keywords: Array<{ keyword: string; volume: number; difficulty: number }>;
  pagesCovering: number;
}

function buildClusters(
  pages: Array<{ title: string | null; h1: string | null; url: string; wordCount: number | null }>,
  keywordFreq: Map<string, number>
): GeneratedCluster[] {
  // Get top keywords as cluster seeds
  const topKeywords = Array.from(keywordFreq.entries())
    .filter(([kw, count]) => count >= 2 && !kw.includes(" ")) // single words with 2+ occurrences
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const clusters: GeneratedCluster[] = [];

  for (const [pillar, freq] of topKeywords) {
    // Find related phrases
    const relatedPhrases = Array.from(keywordFreq.entries())
      .filter(([kw]) => kw.includes(pillar) && kw !== pillar)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Count pages covering this topic
    const pagesCovering = pages.filter((p) => {
      const text = `${p.title || ""} ${p.h1 || ""}`.toLowerCase();
      return text.includes(pillar);
    }).length;

    // Estimate intent
    const intentType = detectIntent(pillar, relatedPhrases.map(([k]) => k));

    // Simulate volume/difficulty (in production, would use a keyword API)
    const estimatedVolume = freq * 100 + Math.floor(Math.random() * 500);
    const estimatedDifficulty = Math.min(95, Math.max(15, 30 + Math.floor(Math.random() * 40)));

    clusters.push({
      clusterName: capitalize(pillar),
      pillarKeyword: pillar,
      searchVolume: estimatedVolume,
      difficulty: estimatedDifficulty,
      intentType,
      keywords: relatedPhrases.map(([kw, count]) => ({
        keyword: kw,
        volume: count * 80 + Math.floor(Math.random() * 300),
        difficulty: Math.min(90, estimatedDifficulty + Math.floor(Math.random() * 20) - 10),
      })),
      pagesCovering,
    });
  }

  return clusters.sort((a, b) => b.searchVolume - a.searchVolume);
}

function detectIntent(pillar: string, phrases: string[]): string {
  const allText = `${pillar} ${phrases.join(" ")}`;
  if (/buy|price|cost|deal|discount|cheap|order|purchase/.test(allText)) return "transactional";
  if (/best|review|compare|top|vs|alternative/.test(allText)) return "commercial";
  if (/login|signin|account|dashboard/.test(allText)) return "navigational";
  return "informational";
}

interface CalendarItem {
  topic: string;
  targetKeywords: string[];
  contentFormat: string;
  targetWordCount: number;
  priorityScore: number;
  reason: string;
}

function generateCalendar(
  clusters: GeneratedCluster[],
  pages: Array<{ title: string | null; wordCount: number | null; url: string }>,
  articles: Array<{ metaTitle: string | null; h1: string | null }>,
  niche: string
): CalendarItem[] {
  const calendar: CalendarItem[] = [];
  const existingTopics = new Set(
    articles.map((a) => (a.metaTitle || a.h1 || "").toLowerCase())
  );

  for (const cluster of clusters.slice(0, 5)) {
    // Pillar content
    const pillarTopic = `The Complete Guide to ${capitalize(cluster.pillarKeyword)}`;
    if (!existingTopics.has(pillarTopic.toLowerCase())) {
      calendar.push({
        topic: pillarTopic,
        targetKeywords: [cluster.pillarKeyword, ...cluster.keywords.slice(0, 3).map((k) => k.keyword)],
        contentFormat: "pillar",
        targetWordCount: 2500,
        priorityScore: 90,
        reason: `High-value pillar page for your "${cluster.clusterName}" cluster`,
      });
    }

    // Supporting content for each cluster keyword
    for (const kw of cluster.keywords.slice(0, 2)) {
      const topic = `How to ${capitalize(kw.keyword)} — A Practical Guide`;
      if (!existingTopics.has(topic.toLowerCase())) {
        calendar.push({
          topic,
          targetKeywords: [kw.keyword, cluster.pillarKeyword],
          contentFormat: "how-to",
          targetWordCount: 1500,
          priorityScore: 70,
          reason: `Supporting content linking back to your "${cluster.clusterName}" pillar`,
        });
      }
    }
  }

  // Thin content expansion
  const thinPages = pages.filter((p) => (p.wordCount || 0) > 0 && (p.wordCount || 0) < 300);
  for (const page of thinPages.slice(0, 3)) {
    const title = page.title || page.url;
    calendar.push({
      topic: `Expanded guide: ${title}`,
      targetKeywords: extractWordsFromTitle(title),
      contentFormat: "expansion",
      targetWordCount: 1500,
      priorityScore: 80,
      reason: `Your page "${title}" has thin content — expanding it boosts rankings`,
    });
  }

  return calendar.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 12);
}

function findContentGaps(
  pages: Array<{ title: string | null; h1: string | null; wordCount: number | null }>,
  clusters: GeneratedCluster[]
): Array<{ gap: string; opportunity: string; priority: string }> {
  const gaps: Array<{ gap: string; opportunity: string; priority: string }> = [];
  const coveredText = pages.map((p) => `${p.title || ""} ${p.h1 || ""}`).join(" ").toLowerCase();

  // Check for missing content types
  if (!coveredText.includes("faq") && !coveredText.includes("frequently asked")) {
    gaps.push({
      gap: "No FAQ content",
      opportunity: "Create an FAQ page targeting long-tail question queries",
      priority: "high",
    });
  }

  if (!coveredText.includes("guide") && !coveredText.includes("how to")) {
    gaps.push({
      gap: "No how-to or guide content",
      opportunity: "How-to content captures informational search intent and builds authority",
      priority: "high",
    });
  }

  if (!coveredText.includes("comparison") && !coveredText.includes(" vs ")) {
    gaps.push({
      gap: "No comparison content",
      opportunity: "Comparison pages capture high-intent commercial queries",
      priority: "medium",
    });
  }

  if (!coveredText.includes("case study") && !coveredText.includes("success story")) {
    gaps.push({
      gap: "No case studies",
      opportunity: "Case studies build E-E-A-T and drive conversions from organic traffic",
      priority: "medium",
    });
  }

  // Thin content gap
  const thinCount = pages.filter((p) => (p.wordCount || 0) > 0 && (p.wordCount || 0) < 300).length;
  if (thinCount > 0) {
    gaps.push({
      gap: `${thinCount} thin content page${thinCount > 1 ? "s" : ""}`,
      opportunity: "Pages with <300 words rarely rank — expand or consolidate them",
      priority: "high",
    });
  }

  // Cluster coverage gap
  for (const cluster of clusters.slice(0, 3)) {
    if (cluster.pagesCovering < 2) {
      gaps.push({
        gap: `Weak coverage for "${cluster.clusterName}"`,
        opportunity: `Only ${cluster.pagesCovering} page(s) cover this topic — add supporting content`,
        priority: "medium",
      });
    }
  }

  return gaps;
}

function capitalize(s: string): string {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractWordsFromTitle(title: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "and", "or", "of", "in", "to", "for", "on", "with", "at", "by"]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 4);
}
