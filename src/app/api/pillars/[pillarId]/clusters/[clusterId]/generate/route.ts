import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { runBlogWriter } from "@/lib/agents/blog-writer-agent";
import { interlinkPillarCluster } from "@/lib/interlinker";

// POST /api/pillars/:pillarId/clusters/:clusterId/generate
// Body: { isPillar?: boolean, language?: string, tone?: string, wordCount?: number }
// If isPillar=true, generates the pillar article (uses pillar.topic).
// Otherwise, generates a cluster article.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pillarId: string; clusterId: string }> }
) {
  const { pillarId, clusterId } = await params;
  const body = await request.json().catch(() => ({}));
  const { isPillar, language, tone, wordCount } = body as {
    isPillar?: boolean;
    language?: string;
    tone?: string;
    wordCount?: number;
  };

  const pillar = db.select().from(schema.pillars).where(eq(schema.pillars.id, pillarId)).get();
  if (!pillar) {
    return NextResponse.json({ error: "Pillar not found" }, { status: 404 });
  }

  let topic: string;
  let keywords: string[] = [];
  let targetWordCount = wordCount || 1500;

  if (isPillar) {
    topic = pillar.topic;
    targetWordCount = wordCount || 3000; // pillar is longer
  } else {
    const cluster = db
      .select()
      .from(schema.pillarClusters)
      .where(eq(schema.pillarClusters.id, clusterId))
      .get();
    if (!cluster || cluster.pillarId !== pillarId) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }
    topic = cluster.clusterTopic;
    keywords = cluster.clusterKeywords ? JSON.parse(cluster.clusterKeywords) : [];
  }

  try {
    const output = await runBlogWriter(pillar.domainId, {
      topic,
      keywords,
      tone: (tone as "professional" | "casual" | "technical") || "professional",
      wordCount: targetWordCount,
      language: language || "English",
    });

    // Link article back to pillar/cluster
    if (isPillar) {
      db.update(schema.pillars)
        .set({ pillarArticleId: output.articleId })
        .where(eq(schema.pillars.id, pillarId))
        .run();
    } else {
      db.update(schema.pillarClusters)
        .set({ articleId: output.articleId })
        .where(eq(schema.pillarClusters.id, clusterId))
        .run();
    }

    // Auto-interlink: after generating any article, re-run internal linking
    // across the entire pillar so pillar↔cluster links stay current.
    try {
      await interlinkPillarCluster(pillarId);
    } catch (linkErr) {
      console.warn("[generate] auto-interlink failed (non-fatal):", linkErr);
    }

    return NextResponse.json({
      articleId: output.articleId,
      title: output.title,
      metaTitle: output.metaTitle,
      featuredImageUrl: output.featuredImageUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
