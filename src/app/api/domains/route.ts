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

    // Create domain
    const domainId = crypto.randomUUID();
    db.insert(schema.domains)
      .values({
        id: domainId,
        userId: user.id,
        domainUrl: parsedUrl.origin,
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
