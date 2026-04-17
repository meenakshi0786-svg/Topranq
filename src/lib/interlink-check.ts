/**
 * Startup check: finds pillar/cluster pairs where articles exist but
 * interlinking is missing, and runs the interlinker on them.
 * Runs once when the app starts — catches any articles generated
 * before the auto-interlink feature was deployed.
 */

import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { interlinkPillarCluster } from "./interlinker";

export async function checkAndFixInterlinks(): Promise<void> {
  const pillars = db.select().from(schema.pillars).all();

  for (const pillar of pillars) {
    if (!pillar.pillarArticleId) continue;

    const clusters = db
      .select()
      .from(schema.pillarClusters)
      .where(eq(schema.pillarClusters.pillarId, pillar.id))
      .all();

    const clustersWithArticles = clusters.filter((c) => c.articleId);
    if (clustersWithArticles.length === 0) continue;

    // Check if pillar article has links to clusters
    const pillarArticle = db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.id, pillar.pillarArticleId))
      .get();

    if (!pillarArticle?.bodyMarkdown) continue;

    const body = pillarArticle.bodyMarkdown;
    let missingLinks = false;

    for (const cluster of clustersWithArticles) {
      const clusterArticle = db
        .select()
        .from(schema.articles)
        .where(eq(schema.articles.id, cluster.articleId!))
        .get();

      if (!clusterArticle?.slug) continue;

      // Check if pillar body contains a link to this cluster's slug
      if (!body.includes(`(/${clusterArticle.slug})`) && !body.includes(`(${clusterArticle.slug})`)) {
        missingLinks = true;
        break;
      }
    }

    if (missingLinks) {
      console.log(`[interlink-check] Pillar "${pillar.topic?.slice(0, 50)}" has missing cluster links — fixing...`);
      try {
        const result = await interlinkPillarCluster(pillar.id);
        console.log(`[interlink-check] Fixed: ${result.linksInserted} links added across ${result.updatedArticles} articles`);
      } catch (err) {
        console.warn(`[interlink-check] Failed for pillar ${pillar.id}:`, (err as Error).message);
      }
    }
  }
}
