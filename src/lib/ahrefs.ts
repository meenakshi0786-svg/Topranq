const BASE_URL = "https://api.ahrefs.com/v3";

function getApiKey(): string {
  const key = process.env.AHREFS_API_KEY;
  if (!key) throw new Error("AHREFS_API_KEY is not set in .env");
  return key;
}

async function ahrefsFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ahrefs API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// --- Domain Rating ---
export interface DomainRating {
  domain_rating: number;
  ahrefs_rank: number;
}

export async function fetchDomainRating(target: string): Promise<DomainRating> {
  return ahrefsFetch<DomainRating>("/site-explorer/domain-rating", { target });
}

// --- Backlinks Stats ---
export interface BacklinksStats {
  live: number;
  all_time: number;
  live_refdomains: number;
  all_time_refdomains: number;
}

export async function fetchBacklinksStats(target: string): Promise<BacklinksStats> {
  return ahrefsFetch<BacklinksStats>("/site-explorer/backlinks-stats", { target });
}

// --- Domain Metrics ---
export interface DomainMetrics {
  organic_keywords: number;
  organic_traffic: number;
  organic_cost: number;
}

export async function fetchDomainMetrics(target: string, country?: string): Promise<DomainMetrics> {
  const params: Record<string, string | number> = { target };
  if (country) params.country = country;
  return ahrefsFetch<DomainMetrics>("/site-explorer/metrics", params);
}

// --- Organic Keywords ---
export interface OrganicKeyword {
  keyword: string;
  volume: number;
  position: number;
  traffic: number;
  cpc: number;
  url: string;
  keyword_difficulty: number;
}

interface OrganicKeywordsResponse {
  keywords: OrganicKeyword[];
}

export async function fetchOrganicKeywords(
  target: string,
  options: { country?: string; limit?: number; offset?: number } = {}
): Promise<OrganicKeyword[]> {
  const params: Record<string, string | number> = {
    target,
    select: "keyword,volume,position,traffic,cpc,url,keyword_difficulty",
    limit: options.limit || 100,
    offset: options.offset || 0,
    order_by: "traffic:desc",
  };
  if (options.country) params.country = options.country;

  const data = await ahrefsFetch<OrganicKeywordsResponse>("/site-explorer/organic-keywords", params);
  return data.keywords || [];
}

// --- Top Pages ---
export interface TopPage {
  url: string;
  organic_traffic: number;
  organic_keywords: number;
  top_keyword: string;
  top_keyword_volume: number;
  top_keyword_position: number;
}

interface TopPagesResponse {
  pages: TopPage[];
}

export async function fetchTopPages(
  target: string,
  options: { country?: string; limit?: number } = {}
): Promise<TopPage[]> {
  const params: Record<string, string | number> = {
    target,
    select: "url,organic_traffic,organic_keywords,top_keyword,top_keyword_volume,top_keyword_position",
    limit: options.limit || 50,
    order_by: "organic_traffic:desc",
  };
  if (options.country) params.country = options.country;

  const data = await ahrefsFetch<TopPagesResponse>("/site-explorer/top-pages", params);
  return data.pages || [];
}
