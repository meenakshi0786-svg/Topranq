import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { runBlogWriter, BLOG_WRITER_CREDITS, type BlogWriterConfig } from "@/lib/agents/blog-writer-agent";
import { getShopFromRequest, getRawSessionToken, resolveOfflineToken } from "@/lib/shopify-embedded";
import { fetchStoreProducts } from "@/lib/shopify";
import { getShopBillingState } from "@/lib/shopify-billing";
import { getTemplate } from "@/lib/blog-templates";

// POST /api/shopify/embedded/generate
// Body: { topic: string, keywords?: string }
// Generates an AI article for the shop's domain, weaving in store products.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const topic = (body.topic || "").trim();
  if (!topic) return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
  const keywords = (body.keywords || "")
    .split(",")
    .map((k: string) => k.trim())
    .filter(Boolean);

  // Syncs the plan from Shopify (managed pricing) and gates on period-scoped credits,
  // so an upgrade takes effect immediately and credits reset each billing cycle.
  const { userId, domainId, plan, creditsRemaining: remaining } = await getShopBillingState(claims.shop);
  if (remaining < BLOG_WRITER_CREDITS) {
    return NextResponse.json(
      { error: "You're out of article credits. Upgrade your plan to generate more." },
      { status: 402 },
    );
  }

  // Template paywall — enforced here, not just hidden in the UI. Premium
  // templates require a paid plan.
  const template = typeof body.template === "string" ? getTemplate(body.template) : undefined;
  if (body.template && !template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }
  if (template?.premium && plan === "free") {
    return NextResponse.json(
      { error: `"${template.name}" is a premium template. Upgrade to Starter or Pro to use it.`, premiumTemplate: true },
      { status: 402 },
    );
  }

  // Best-effort: pull store products to weave in naturally.
  let productContext: string | undefined;
  const token = await resolveOfflineToken(claims.shop, getRawSessionToken(request));
  if (token) {
    const products = await fetchStoreProducts(claims.shop, token);
    if (products.length) {
      productContext = "Reference these store products naturally where relevant:\n" +
        products.map((p) => `- ${p.title}${p.price ? ` ($${p.price})` : ""} — ${p.url}${p.description ? `: ${p.description}` : ""}`).join("\n");
    }
  }

  const { getShopSettings } = await import("@/app/api/shopify/embedded/settings/route");
  const prefs = getShopSettings(domainId);

  const config: BlogWriterConfig = {
    topic: template ? `${topic}\n\nARTICLE FORMAT: ${template.structure}` : topic,
    keywords: keywords.length ? keywords : [topic],
    tone: prefs.tone,
    wordCount: 1500,
    intent: "informational",
    audience: prefs.audience,
    productContext,
    preferredModel: plan === "growth" ? "opus" : "sonnet",
  };

  try {
    const output = await runBlogWriter(domainId, config);

    db.update(schema.articles).set({ status: "draft" }).where(eq(schema.articles.id, output.articleId)).run();

    db.insert(schema.creditLedger)
      .values({ userId, action: "blog_writer", creditsUsed: BLOG_WRITER_CREDITS, balanceAfter: remaining - BLOG_WRITER_CREDITS, agent: "shopify_embedded" })
      .run();

    return NextResponse.json({
      articleId: output.articleId,
      title: output.title,
      wordCount: output.estimatedWordCount,
      qualityScore: output.qualityChecks?.overallScore ?? null,
      usedProducts: !!productContext,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
