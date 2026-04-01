import { NextRequest, NextResponse } from "next/server";
import {
  fetchDomainRating,
  fetchBacklinksStats,
  fetchDomainMetrics,
  fetchOrganicKeywords,
  fetchTopPages,
} from "@/lib/ahrefs";

// GET /api/domains/:id/ahrefs?domain=example.com&country=us
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // validate route param

  const domain = request.nextUrl.searchParams.get("domain");
  const country = request.nextUrl.searchParams.get("country") || "us";

  if (!domain) {
    return NextResponse.json({ error: "Missing domain parameter" }, { status: 400 });
  }

  if (!process.env.AHREFS_API_KEY) {
    return NextResponse.json({ connected: false, error: "AHREFS_API_KEY not configured" });
  }

  try {
    // Fetch all data in parallel
    const [domainRating, backlinksStats, metrics, organicKeywords, topPages] =
      await Promise.all([
        fetchDomainRating(domain),
        fetchBacklinksStats(domain),
        fetchDomainMetrics(domain, country),
        fetchOrganicKeywords(domain, { country, limit: 100 }),
        fetchTopPages(domain, { country, limit: 30 }),
      ]);

    // Quick wins: keywords ranking 4–20 with decent traffic
    const quickWins = organicKeywords
      .filter((k) => k.position >= 4 && k.position <= 20 && k.volume >= 50)
      .sort((a, b) => a.position - b.position)
      .slice(0, 20);

    return NextResponse.json({
      connected: true,
      domain,
      country,
      domainRating: {
        rating: domainRating.domain_rating,
        rank: domainRating.ahrefs_rank,
      },
      backlinks: {
        live: backlinksStats.live,
        allTime: backlinksStats.all_time,
        referringDomains: backlinksStats.live_refdomains,
        referringDomainsAllTime: backlinksStats.all_time_refdomains,
      },
      overview: {
        organicKeywords: metrics.organic_keywords,
        organicTraffic: metrics.organic_traffic,
        trafficValue: metrics.organic_cost,
      },
      topKeywords: organicKeywords,
      topPages,
      quickWins,
    });
  } catch (err) {
    console.error("Ahrefs API error:", err);
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : "Failed to fetch Ahrefs data" },
      { status: 500 }
    );
  }
}
