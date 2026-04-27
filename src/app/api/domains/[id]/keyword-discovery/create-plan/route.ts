import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser, isRealUser } from "@/lib/auth";

// POST /api/domains/:id/keyword-discovery/create-plan — create pillars + clusters from confirmed plan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!isRealUser(user.email)) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const { pillars } = body as {
    pillars: Array<{
      topic: string;
      description: string;
      clusters: Array<{
        clusterTopic: string;
        clusterKeywords: string[];
      }>;
    }>;
  };

  if (!pillars || pillars.length === 0) {
    return NextResponse.json({ error: "No pillars provided" }, { status: 400 });
  }

  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, id)).get();
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  try {
    const createdPillarIds: string[] = [];

    for (const pillar of pillars) {
      const pillarId = crypto.randomUUID();
      db.insert(schema.pillars)
        .values({
          id: pillarId,
          domainId: id,
          topic: pillar.topic,
          description: pillar.description,
        })
        .run();

      for (let i = 0; i < pillar.clusters.length; i++) {
        const cluster = pillar.clusters[i];
        db.insert(schema.pillarClusters)
          .values({
            id: crypto.randomUUID(),
            pillarId,
            clusterTopic: cluster.clusterTopic,
            clusterKeywords: JSON.stringify(cluster.clusterKeywords),
            reason: `Target keywords: ${cluster.clusterKeywords.join(", ")}`,
            orderIndex: i,
          })
          .run();
      }

      createdPillarIds.push(pillarId);
    }

    return NextResponse.json({
      success: true,
      pillarIds: createdPillarIds,
      message: `Created ${pillars.length} pillars with ${pillars.reduce((s, p) => s + p.clusters.length, 0)} clusters`,
    });
  } catch (error) {
    console.error("[keyword-discovery/create-plan] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create plan" },
      { status: 500 }
    );
  }
}
