import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";
import { runPipeline } from "@/lib/agents/orchestrator";

// POST /api/domains — add domain, triggers crawl
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    const body = await request.json();
    let { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Check domain limit
    const plan = user.plan as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan];
    const existingDomains = db
      .select()
      .from(schema.domains)
      .where(eq(schema.domains.userId, user.id))
      .all();

    if (existingDomains.length >= limits.domains) {
      // Check if this domain already exists
      const existing = existingDomains.find(
        (d) => new URL(d.domainUrl).hostname === parsedUrl.hostname
      );
      if (!existing) {
        return NextResponse.json(
          { error: `Domain limit reached (${limits.domains} on ${plan} plan). Upgrade to add more.` },
          { status: 403 }
        );
      }
      // Return existing domain
      return NextResponse.json(existing);
    }

    // Auto-detect language from the homepage's <html lang="..."> attribute
    let detectedLanguage = "English";
    try {
      const langMap: Record<string, string> = {
        fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese",
        nl: "Dutch", ru: "Russian", ja: "Japanese", zh: "Chinese", ko: "Korean",
        ar: "Arabic", hi: "Hindi", tr: "Turkish", pl: "Polish", sv: "Swedish",
        da: "Danish", no: "Norwegian", fi: "Finnish", cs: "Czech", ro: "Romanian",
        hu: "Hungarian", el: "Greek", th: "Thai", vi: "Vietnamese", id: "Indonesian",
        ms: "Malay", he: "Hebrew", uk: "Ukrainian", en: "English",
      };
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 5000);
      const res = await fetch(parsedUrl.origin, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RanqapexBot/1.0)" },
        signal: ac.signal,
      });
      clearTimeout(timer);
      const html = await res.text();
      const langMatch = html.match(/<html[^>]*\slang=["']([a-z]{2})/i);
      if (langMatch) {
        const code = langMatch[1].toLowerCase();
        detectedLanguage = langMap[code] || "English";
      }
    } catch { /* proceed with English */ }

    // Create domain
    const domainId = crypto.randomUUID();
    db.insert(schema.domains)
      .values({
        id: domainId,
        userId: user.id,
        domainUrl: parsedUrl.origin,
        language: detectedLanguage,
        status: "active",
      })
      .run();

    // Create audit run and trigger pipeline
    const auditRunId = crypto.randomUUID();
    db.insert(schema.auditRuns)
      .values({
        id: auditRunId,
        domainId,
        status: "queued",
        maxPages: Math.min(body.maxPages || 25, limits.pages),
        agentVersion: "1.0.0",
      })
      .run();

    // Fire pipeline in background
    runPipeline(domainId, auditRunId).catch((err) => {
      console.error(`Pipeline failed for domain ${domainId}:`, err);
    });

    return NextResponse.json({ domainId, auditRunId, status: "queued" });
  } catch (error) {
    console.error("Failed to add domain:", error);
    return NextResponse.json({ error: "Failed to add domain" }, { status: 500 });
  }
}

// GET /api/domains — list domains
export async function GET() {
  const user = await getOrCreateUser();

  const userDomains = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.userId, user.id))
    .orderBy(desc(schema.domains.createdAt))
    .all();

  // Get latest audit score for each domain
  const domainsWithScores = await Promise.all(
    userDomains.map(async (domain) => {
      const latestAudit = await db.query.auditRuns.findFirst({
        where: eq(schema.auditRuns.domainId, domain.id),
        orderBy: desc(schema.auditRuns.createdAt),
      });
      return {
        ...domain,
        latestAudit: latestAudit
          ? {
              id: latestAudit.id,
              status: latestAudit.status,
              overallScore: latestAudit.overallScore,
              pagesCrawled: latestAudit.pagesCrawled,
              completedAt: latestAudit.completedAt,
            }
          : null,
      };
    })
  );

  return NextResponse.json(domainsWithScores);
}
