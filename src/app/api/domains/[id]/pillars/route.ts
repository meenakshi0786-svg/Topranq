import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { generatePillarPlan } from "@/lib/pillars";

// GET /api/domains/:id/pillars — list all pillars for the domain (with clusters)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pillarsList = db
    .select()
    .from(schema.pillars)
    .where(eq(schema.pillars.domainId, id))
    .orderBy(desc(schema.pillars.createdAt))
    .all();

  const result = pillarsList.map((p) => {
    const clusters = db
      .select()
      .from(schema.pillarClusters)
      .where(eq(schema.pillarClusters.pillarId, p.id))
      .all()
      .map((c) => ({
        ...c,
        clusterKeywords: c.clusterKeywords ? JSON.parse(c.clusterKeywords) as string[] : [],
      }));

    return { ...p, clusters };
  });

  return NextResponse.json(result);
}

// POST /api/domains/:id/pillars — create pillar plan from seed topic
// Body: { seedTopic: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { seedTopic } = body as { seedTopic?: string };

  if (!seedTopic || seedTopic.trim().length < 3) {
    return NextResponse.json({ error: "Provide a seed topic (at least 3 characters)" }, { status: 400 });
  }

  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, id),
  });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Pull site keywords from existing pages for context
  const pages = db.select().from(schema.pages).where(eq(schema.pages.domainId, id)).all();
  const siteKeywords = pages
    .map((p) => (p.title || "").split(" ").filter((w) => w.length > 4))
    .flat()
    .slice(0, 20);

  let plan;
  try {
    plan = await generatePillarPlan(seedTopic.trim(), domain.domainUrl, siteKeywords);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI generation failed" },
      { status: 500 }
    );
  }

  const pillarId = crypto.randomUUID();
  db.insert(schema.pillars)
    .values({
      id: pillarId,
      domainId: id,
      topic: plan.pillarTopic,
      description: plan.description,
    })
    .run();

  const clusters = plan.clusters.map((c, i) => {
    const clusterId = crypto.randomUUID();
    db.insert(schema.pillarClusters)
      .values({
        id: clusterId,
        pillarId,
        clusterTopic: c.clusterTopic,
        clusterKeywords: JSON.stringify(c.clusterKeywords || []),
        reason: c.reason,
        orderIndex: i,
      })
      .run();
    return { id: clusterId, ...c, orderIndex: i };
  });

  return NextResponse.json({
    id: pillarId,
    domainId: id,
    topic: plan.pillarTopic,
    description: plan.description,
    clusters,
  });
}

// DELETE /api/domains/:id/pillars?pillarId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pillarId = request.nextUrl.searchParams.get("pillarId");
  if (!pillarId) {
    return NextResponse.json({ error: "Missing pillarId" }, { status: 400 });
  }

  db.delete(schema.pillars)
    .where(eq(schema.pillars.id, pillarId))
    .run();

  return NextResponse.json({ deleted: true, domainId: id });
}
