import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// GET /api/agents/smart-suggest?domainId=xxx
// Analyzes crawled site data and returns smart blog topic suggestions
export async function GET(request: NextRequest) {
  const domainId = request.nextUrl.searchParams.get("domainId");
  if (!domainId) {
    return NextResponse.json({ error: "Missing domainId" }, { status: 400 });
  }

  // Load all pages
  const pages = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.domainId, domainId))
    .all();

  if (pages.length === 0) {
    return NextResponse.json({ error: "No pages crawled yet. Run an audit first." }, { status: 400 });
  }

  // Load existing articles to avoid duplicates
  const existingArticles = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, domainId))
    .all();

  const existingTopics = new Set(
    existingArticles.map((a) => (a.metaTitle || a.h1 || "").toLowerCase())
  );

  // Load latest audit issues to find content gaps
  const latestAudit = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.domainId, domainId),
    orderBy: desc(schema.auditRuns.createdAt),
  });

  let issues: Array<{ issueType: string; severity: string; description: string }> = [];
  if (latestAudit) {
    issues = db
      .select({
        issueType: schema.auditIssues.issueType,
        severity: schema.auditIssues.severity,
        description: schema.auditIssues.description,
      })
      .from(schema.auditIssues)
      .where(eq(schema.auditIssues.auditRunId, latestAudit.id))
      .all();
  }

  // ── Extract site intelligence ──────────────────────────────────────

  // 1. Classify site: niche + product vs service
  const allTitles = pages
    .map((p) => `${p.title || ""} ${p.h1 || ""}`)
    .filter(Boolean);
  const classification = classifySite(allTitles, pages);
  const niche = classification.niche;

  // 2. Extract top keywords from all page titles
  const siteKeywords = extractTopKeywords(allTitles, 20);

  // 3. Find thin content pages (content gap opportunities)
  const thinPages = pages.filter((p) => (p.wordCount || 0) < 300 && (p.wordCount || 0) > 0);

  // 4. Find topics NOT covered by existing pages
  const coveredTopics = pages.map((p) => (p.title || "").toLowerCase());

  // 5. Detect the site's domain/URL for context
  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, domainId),
  });
  const hostname = (() => {
    try { return new URL(domain?.domainUrl || "").hostname; } catch { return ""; }
  })();

  // ── Generate smart suggestions ─────────────────────────────────────

  const suggestions = generateSmartTopics(
    niche,
    siteKeywords,
    coveredTopics,
    thinPages.map((p) => p.title || p.url),
    issues,
    existingTopics,
    hostname,
    classification.siteType
  );

  return NextResponse.json({
    niche,
    siteType: classification.siteType,
    siteTypeLabel: classification.siteTypeLabel,
    hostname,
    siteKeywords: siteKeywords.slice(0, 10),
    pagesAnalyzed: pages.length,
    thinContentPages: thinPages.length,
    issueCount: issues.length,
    suggestions,
  });
}

// ── Intelligence functions ─────────────────────────────────────────────

interface SiteClassification {
  niche: string;
  siteType: "product" | "service" | "content" | "marketplace";
  siteTypeLabel: string;
}

function classifySite(titles: string[], pages: Array<{ url: string; title: string | null; h1: string | null; wordCount: number | null; schemaMarkup: string | null }>): SiteClassification {
  const allText = titles.join(" ").toLowerCase();
  const allUrls = pages.map((p) => p.url.toLowerCase()).join(" ");
  const allSchemas = pages.map((p) => p.schemaMarkup || "").join(" ").toLowerCase();

  // ── Detect niche ──
  const niches: Record<string, string[]> = {
    "E-commerce / Retail": ["shop", "store", "product", "buy", "cart", "price", "shipping", "order", "catalog", "collection"],
    "SaaS / Technology": ["software", "app", "platform", "api", "dashboard", "saas", "tool", "integration", "automation", "feature", "pricing"],
    "Marketing / SEO": ["marketing", "seo", "content", "brand", "campaign", "social media", "analytics", "conversion", "agency"],
    "Finance / Fintech": ["finance", "bank", "investment", "crypto", "trading", "payment", "loan", "insurance"],
    "Health / Wellness": ["health", "wellness", "medical", "fitness", "nutrition", "therapy", "doctor", "patient", "clinic"],
    "Education / Learning": ["course", "learn", "tutorial", "training", "education", "student", "teacher", "university"],
    "Real Estate": ["property", "real estate", "rent", "mortgage", "listing", "apartment", "home", "house"],
    "Food / Restaurant": ["food", "recipe", "restaurant", "menu", "delivery", "chef", "cooking", "dining"],
    "Travel / Hospitality": ["travel", "hotel", "booking", "tour", "destination", "flight", "vacation", "resort"],
    "Legal / Professional Services": ["law", "legal", "attorney", "lawyer", "consulting", "firm", "practice"],
    "News / Media": ["news", "article", "blog", "editorial", "magazine", "press", "media", "journal"],
  };

  let bestNiche = "General / Business";
  let bestScore = 0;
  for (const [niche, keywords] of Object.entries(niches)) {
    const score = keywords.filter((kw) => allText.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestNiche = niche; }
  }

  // ── Detect site type: product vs service vs content vs marketplace ──
  const productSignals = [
    "product", "shop", "store", "buy", "cart", "add to cart", "price", "$",
    "shipping", "order", "catalog", "collection", "sku", "in stock", "out of stock",
    "checkout", "wishlist",
  ];
  const serviceSignals = [
    "service", "consulting", "agency", "hire", "contact us", "get a quote",
    "schedule", "appointment", "book a call", "our team", "case study",
    "portfolio", "clients", "testimonial", "solutions", "expertise",
    "free consultation", "request a demo",
  ];
  const contentSignals = [
    "blog", "article", "news", "guide", "tutorial", "how to", "tips",
    "editorial", "opinion", "review", "podcast", "video", "newsletter",
  ];
  const marketplaceSignals = [
    "marketplace", "listing", "seller", "vendor", "compare", "deals",
    "directory", "classifieds", "auction",
  ];

  const combined = `${allText} ${allUrls} ${allSchemas}`;
  const scoreType = (signals: string[]) => signals.filter((s) => combined.includes(s)).length;

  const scores = {
    product: scoreType(productSignals),
    service: scoreType(serviceSignals),
    content: scoreType(contentSignals),
    marketplace: scoreType(marketplaceSignals),
  };

  // Also check for e-commerce schema
  if (allSchemas.includes("product") || allSchemas.includes("offer")) scores.product += 3;
  if (allSchemas.includes("service") || allSchemas.includes("professionalservice")) scores.service += 3;
  // Check URL patterns
  if (allUrls.includes("/product") || allUrls.includes("/shop") || allUrls.includes("/collection")) scores.product += 2;
  if (allUrls.includes("/services") || allUrls.includes("/portfolio") || allUrls.includes("/case-stud")) scores.service += 2;

  const siteType = (Object.entries(scores) as [SiteClassification["siteType"], number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const labels: Record<string, string> = {
    product: "Product-Based",
    service: "Service-Based",
    content: "Content / Media",
    marketplace: "Marketplace",
  };

  return { niche: bestNiche, siteType, siteTypeLabel: labels[siteType] };
}

function extractTopKeywords(titles: string[], count: number): string[] {
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
  const allText = titles.join(" ").toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = allText.split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));

  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Also extract 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      freq.set(phrase, (freq.get(phrase) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

interface TopicSuggestion {
  topic: string;
  keywords: string[];
  tone: "professional" | "casual" | "technical";
  wordCount: number;
  reason: string;
  priority: "high" | "medium" | "low";
}

function generateSmartTopics(
  niche: string,
  siteKeywords: string[],
  coveredTopics: string[],
  thinPages: string[],
  issues: Array<{ issueType: string; severity: string; description: string }>,
  existingArticles: Set<string>,
  hostname: string,
  siteType: "product" | "service" | "content" | "marketplace"
): TopicSuggestion[] {
  const suggestions: TopicSuggestion[] = [];
  const topKw = siteKeywords.slice(0, 5);
  const coveredLower = coveredTopics.join(" ").toLowerCase();
  const year = new Date().getFullYear();

  // 1. Content gap from thin pages — high priority
  if (thinPages.length > 0) {
    const thinTopic = thinPages[0];
    const cleaned = thinTopic.replace(/[|\-–—]/g, " ").replace(/\s+/g, " ").trim();
    if (cleaned.length > 5 && !existingArticles.has(cleaned.toLowerCase())) {
      suggestions.push({
        topic: `Comprehensive guide: ${cleaned}`,
        keywords: topKw.slice(0, 3),
        tone: "professional",
        wordCount: 2000,
        reason: `Your page "${cleaned}" has thin content (<300 words). A detailed blog post expands on this topic and can replace or link to that page.`,
        priority: "high",
      });
    }
  }

  // ── PRODUCT-BASED topics ──
  if (siteType === "product") {
    // Buying guide
    if (topKw[0]) {
      suggestions.push({
        topic: `How to Choose the Right ${capitalize(topKw[0])}: A Buyer's Guide for ${year}`,
        keywords: [topKw[0], "buying guide", "best", "review", ...(topKw.slice(1, 3))],
        tone: "professional",
        wordCount: 2200,
        reason: `As a product-based site, buyer's guides capture high-intent "best [product]" and "how to choose" searches that convert well.`,
        priority: "high",
      });
    }

    // Product comparison
    if (topKw.length >= 2) {
      suggestions.push({
        topic: `${capitalize(topKw[0])} vs ${capitalize(topKw[1])}: Detailed Comparison & Review`,
        keywords: [topKw[0], topKw[1], "comparison", "vs", "review"],
        tone: "professional",
        wordCount: 1800,
        reason: `Product comparison pages rank for "[product A] vs [product B]" queries — high commercial intent traffic that drives sales.`,
        priority: "high",
      });
    }

    // Top N list
    if (topKw[0]) {
      suggestions.push({
        topic: `Top 10 ${capitalize(topKw[0])} Products You Should Try in ${year}`,
        keywords: [topKw[0], `best ${topKw[0]}`, "top", "review"],
        tone: "casual",
        wordCount: 2000,
        reason: `"Best of" listicles capture high-volume informational queries and funnel readers toward your products.`,
        priority: "medium",
      });
    }

    // Use case / tutorial
    if (topKw[0]) {
      suggestions.push({
        topic: `${capitalize(topKw[0])} Use Cases: ${topKw.length > 1 ? capitalize(topKw[1]) + " and Beyond" : "Practical Applications"}`,
        keywords: [topKw[0], "use cases", "examples", "how to use"],
        tone: "professional",
        wordCount: 1500,
        reason: `Use-case content helps potential buyers visualize how your products solve their problems — strong mid-funnel content.`,
        priority: "medium",
      });
    }
  }

  // ── SERVICE-BASED topics ──
  if (siteType === "service") {
    // "Why hire / why you need" content
    if (topKw[0]) {
      suggestions.push({
        topic: `Why You Need a ${capitalize(topKw[0])} Expert (And How to Find One)`,
        keywords: [topKw[0], "hire", "expert", "professional", ...(topKw.slice(1, 3))],
        tone: "professional",
        wordCount: 2000,
        reason: `As a service-based site, "why hire" content captures people researching before contacting a provider — strong lead generation content.`,
        priority: "high",
      });
    }

    // Cost/pricing guide
    if (topKw[0]) {
      suggestions.push({
        topic: `How Much Does ${capitalize(topKw[0])} Cost? Pricing Guide for ${year}`,
        keywords: [topKw[0], "cost", "pricing", "rates", "how much"],
        tone: "professional",
        wordCount: 1800,
        reason: `Cost/pricing pages rank for high-intent "[service] cost" queries. These searchers are close to purchasing decisions.`,
        priority: "high",
      });
    }

    // Case study / results
    if (topKw[0]) {
      suggestions.push({
        topic: `${capitalize(topKw[0])} Results: What to Expect and How to Measure Success`,
        keywords: [topKw[0], "results", "case study", "roi", "success"],
        tone: "professional",
        wordCount: 1500,
        reason: `Results-focused content builds trust and demonstrates expertise — critical for service businesses converting visitors to leads.`,
        priority: "medium",
      });
    }

    // Process / "How it works"
    if (topKw[0]) {
      suggestions.push({
        topic: `How ${capitalize(topKw[0])} Works: A Step-by-Step Process Guide`,
        keywords: [topKw[0], "process", "how it works", "steps"],
        tone: "casual",
        wordCount: 1500,
        reason: `Process transparency reduces friction for potential clients. Demystifying how your service works builds confidence.`,
        priority: "medium",
      });
    }

    // Mistakes to avoid
    if (topKw[0]) {
      suggestions.push({
        topic: `${Math.floor(Math.random() * 3) + 7} Common ${capitalize(topKw[0])} Mistakes (And How to Avoid Them)`,
        keywords: [topKw[0], "mistakes", "avoid", "tips"],
        tone: "professional",
        wordCount: 1800,
        reason: `"Mistakes to avoid" content positions you as a knowledgeable authority and captures problem-aware search traffic.`,
        priority: "medium",
      });
    }
  }

  // ── COMMON topics for all site types ──

  // Pillar content
  if (topKw.length >= 2 && siteType !== "product") {
    const pillarTopic = `Complete Guide to ${capitalize(topKw[0])} and ${capitalize(topKw[1])}`;
    if (!existingArticles.has(pillarTopic.toLowerCase()) && !coveredLower.includes("complete guide")) {
      suggestions.push({
        topic: pillarTopic,
        keywords: topKw.slice(0, 4),
        tone: "professional",
        wordCount: 2500,
        reason: `"${topKw[0]}" and "${topKw[1]}" are your most prominent keywords. A pillar page creates a strong SEO foundation.`,
        priority: "high",
      });
    }
  }

  // How-to from audit issues
  const hasSEOIssues = issues.some((i) =>
    i.issueType.includes("meta") || i.issueType.includes("title") || i.issueType.includes("heading")
  );
  if (hasSEOIssues && topKw[0]) {
    suggestions.push({
      topic: `How to Optimize ${capitalize(topKw[0])} for Search Engines`,
      keywords: [topKw[0], "seo", "optimization", ...(topKw.slice(1, 3))],
      tone: "technical",
      wordCount: 1800,
      reason: `Your audit found SEO issues. This guide positions your site as an authority on ${topKw[0]} optimization.`,
      priority: "medium",
    });
  }

  // FAQ content
  if (topKw[0] && !coveredLower.includes("everything you need to know")) {
    suggestions.push({
      topic: `${capitalize(topKw[0])}: Everything You Need to Know in ${year}`,
      keywords: topKw.slice(0, 4),
      tone: "casual",
      wordCount: 1500,
      reason: `FAQ-style content drives long-tail traffic and is highly citable by AI search engines.`,
      priority: "medium",
    });
  }

  // Industry trends
  suggestions.push({
    topic: `${niche} Trends to Watch in ${year}`,
    keywords: [...topKw.slice(0, 3), "trends", year.toString()],
    tone: "professional",
    wordCount: 1800,
    reason: `Trend articles establish topical authority in ${niche.toLowerCase()} and attract backlinks.`,
    priority: "low",
  });

  // Beginner's guide
  if (topKw[0] && !coveredLower.includes("beginner")) {
    suggestions.push({
      topic: `The Beginner's Guide to ${capitalize(topKw[0])}`,
      keywords: [topKw[0], "beginner", "guide", "introduction"],
      tone: "casual",
      wordCount: 2000,
      reason: `Beginner guides capture top-of-funnel traffic and build brand awareness.`,
      priority: "low",
    });
  }

  return suggestions.filter((s) => !existingArticles.has(s.topic.toLowerCase()));
}

function capitalize(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
