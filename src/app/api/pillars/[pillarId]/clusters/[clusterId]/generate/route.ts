import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { runBlogWriter } from "@/lib/agents/blog-writer-agent";
import { getOrCreateUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";

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

  // Read the domain's language setting
  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, pillar.domainId)).get();
  const domainLanguage = domain?.language || "English";

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

  // Build pillar/cluster context so the article can link during generation
  const allClusters = db
    .select()
    .from(schema.pillarClusters)
    .where(eq(schema.pillarClusters.pillarId, pillarId))
    .all();

  const pillarContext = {
    pillarTitle: pillar.topic,
    pillarSlug: pillar.pillarArticleId
      ? db.select().from(schema.articles).where(eq(schema.articles.id, pillar.pillarArticleId)).get()?.slug || ""
      : "",
    isPillarArticle: isPillar === true,
    clusters: allClusters.map((c: { articleId: string | null; clusterTopic: string }) => {
      const art = c.articleId ? db.select().from(schema.articles).where(eq(schema.articles.id, c.articleId)).get() : null;
      return {
        topic: c.clusterTopic,
        slug: art?.slug || "",
        hasArticle: !!c.articleId,
      };
    }),
  };

  // Detect user's plan to choose AI model
  const user = await getOrCreateUser();
  const planKey = (user.plan || "free") as keyof typeof PLAN_LIMITS;
  const planConfig = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
  const preferredModel = ("model" in planConfig ? planConfig.model : "sonnet") as "sonnet" | "opus";

  try {
    const output = await runBlogWriter(pillar.domainId, {
      topic,
      keywords,
      tone: (tone as "professional" | "casual" | "technical") || "professional",
      wordCount: targetWordCount,
      language: language || domainLanguage,
      pillarClusterContext: pillarContext,
      preferredModel,
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
