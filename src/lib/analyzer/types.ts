export type Severity = "critical" | "high" | "medium" | "low";
export type Category =
  | "technical"
  | "on_page"
  | "content"
  | "structure"
  | "performance"
  | "social";
export type ImpactArea =
  | "traffic"
  | "rankings"
  | "ux"
  | "crawl_efficiency"
  | "ctr";

export interface SEOIssue {
  checkId: string;
  category: Category;
  severity: Severity;
  impactArea: ImpactArea;
  message: string;
  details?: Record<string, unknown>;
}

export interface PageData {
  url: string;
  html: string;
  statusCode: number;
  contentType: string;
  headers: Record<string, string>;
  loadTimeMs: number;
  depth: number;
  redirectChain: string[];
}

export interface SiteContext {
  domain: string;
  startUrl: string;
  allPages: PageData[];
  robotsTxtContent?: string;
  sitemapUrls?: string[];
}

export type CheckFunction = (
  page: PageData,
  context: SiteContext
) => SEOIssue[];
