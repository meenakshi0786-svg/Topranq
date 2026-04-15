import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Users & Billing ──────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: text("plan", { enum: ["free", "starter", "growth", "agency"] }).notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  domainUrl: text("domain_url").notNull(),
  status: text("status", { enum: ["active", "paused", "deleted"] }).notNull().default("active"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const creditLedger = sqliteTable("credit_ledger", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // audit, strategy, article, topup, monthly_grant
  creditsUsed: real("credits_used").notNull(),
  balanceAfter: real("balance_after").notNull(),
  agent: text("agent"),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
});

// ── Crawl Data (Crawler Agent writes here) ───────────────────────────
export const pages = sqliteTable("pages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  metaDescription: text("meta_description"),
  h1: text("h1"),
  wordCount: integer("word_count"),
  statusCode: integer("status_code"),
  canonicalUrl: text("canonical_url"),
  schemaMarkup: text("schema_markup"), // JSON
  pageSpeedJson: text("page_speed_json"), // JSON
  crawledAt: text("crawled_at").default(sql`(datetime('now'))`),
});

export const internalLinks = sqliteTable("internal_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  fromPageId: text("from_page_id").references(() => pages.id, { onDelete: "cascade" }),
  toPageId: text("to_page_id").references(() => pages.id, { onDelete: "cascade" }),
  anchorText: text("anchor_text"),
});

export const searchConsoleData = sqliteTable("search_console_data", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  pageUrl: text("page_url"),
  query: text("query"),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  ctr: real("ctr"),
  avgPosition: real("avg_position"),
  date: text("date"),
});

export const backlinks = sqliteTable("backlinks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url"),
  targetUrl: text("target_url"),
  anchorText: text("anchor_text"),
  domainAuthority: real("domain_authority"),
  isToxic: integer("is_toxic", { mode: "boolean" }).default(false),
  discoveredAt: text("discovered_at").default(sql`(datetime('now'))`),
});

// ── Audit (Auditor Agent writes here) ────────────────────────────────
export const auditRuns = sqliteTable("audit_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  agentVersion: text("agent_version"),
  status: text("status", { enum: ["queued", "crawling", "analyzing", "complete", "failed"] })
    .notNull().default("queued"),
  creditsUsed: real("credits_used").default(0),
  overallScore: real("overall_score"),
  scoresJson: text("scores_json"), // JSON
  pagesFound: integer("pages_found").default(0),
  pagesCrawled: integer("pages_crawled").default(0),
  maxPages: integer("max_pages").default(25),
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
});

export const auditIssues = sqliteTable("audit_issues", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  auditRunId: text("audit_run_id").notNull().references(() => auditRuns.id, { onDelete: "cascade" }),
  issueType: text("issue_type").notNull(),
  severity: text("severity", { enum: ["critical", "high", "medium", "low"] }).notNull(),
  affectedUrls: text("affected_urls"), // JSON array
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  dataSource: text("data_source"), // which table/field this comes from
  estimatedTrafficImpact: text("estimated_traffic_impact"),
  status: text("status", { enum: ["open", "fixed", "ignored"] }).notNull().default("open"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Strategy (Strategist Agent writes here) ──────────────────────────
export const keywordClusters = sqliteTable("keyword_clusters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  clusterName: text("cluster_name").notNull(),
  pillarKeyword: text("pillar_keyword").notNull(),
  searchVolume: integer("search_volume"),
  difficulty: real("difficulty"),
  intentType: text("intent_type", {
    enum: ["informational", "commercial", "transactional", "navigational"],
  }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const keywords = sqliteTable("keywords", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clusterId: text("cluster_id").notNull().references(() => keywordClusters.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  searchVolume: integer("search_volume"),
  difficulty: real("difficulty"),
  currentRank: integer("current_rank"),
  serpFeatures: text("serp_features"), // JSON
  intentType: text("intent_type"),
});

export const contentCalendar = sqliteTable("content_calendar", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  keywordClusterId: text("keyword_cluster_id").references(() => keywordClusters.id),
  topic: text("topic").notNull(),
  targetKeywords: text("target_keywords"), // JSON array
  contentFormat: text("content_format"), // blog, landing, comparison, etc.
  targetWordCount: integer("target_word_count"),
  priorityScore: real("priority_score"),
  internalLinkTargets: text("internal_link_targets"), // JSON array
  status: text("status", { enum: ["planned", "generating", "draft", "approved", "published"] })
    .notNull().default("planned"),
  scheduledDate: text("scheduled_date"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Content (Writer Agent writes here) ───────────────────────────────
export const articles = sqliteTable("articles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  calendarItemId: text("calendar_item_id").references(() => contentCalendar.id),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  slug: text("slug"),
  h1: text("h1"),
  bodyMarkdown: text("body_markdown"),
  bodyHtml: text("body_html"),
  faqSchemaJson: text("faq_schema_json"), // JSON
  schemaJsonLd: text("schema_json_ld"), // JSON-LD structured data
  internalLinksJson: text("internal_links_json"), // JSON
  targetKeyword: text("target_keyword"),
  intent: text("intent"), // informational, commercial, transactional
  audience: text("audience"),
  tone: text("tone"),
  imageSuggestionsJson: text("image_suggestions_json"), // JSON
  featuredImageUrl: text("featured_image_url"),
  featuredImagePrompt: text("featured_image_prompt"),
  qualityScore: real("quality_score"),
  readabilityScore: real("readability_score"),
  plagiarismScore: real("plagiarism_score"),
  status: text("status", { enum: ["draft", "review", "approved", "rejected", "published", "scheduled"] })
    .notNull().default("draft"),
  revisionCount: integer("revision_count").default(0),
  publishedUrl: text("published_url"),
  publishedAt: text("published_at"),
  scheduledFor: text("scheduled_for"),
  publishConnectorId: text("publish_connector_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Pillars & Clusters (topic strategy) ──────────────────────────────
export const pillars = sqliteTable("pillars", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  description: text("description"),
  pillarArticleId: text("pillar_article_id"), // generated pillar article
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const pillarClusters = sqliteTable("pillar_clusters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pillarId: text("pillar_id").notNull().references(() => pillars.id, { onDelete: "cascade" }),
  clusterTopic: text("cluster_topic").notNull(),
  clusterKeywords: text("cluster_keywords"), // JSON array
  reason: text("reason"),
  orderIndex: integer("order_index").default(0),
  articleId: text("article_id"), // filled once generated
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Article Reviews (review workflow) ────────────────────────────────
export const articleReviews = sqliteTable("article_reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull().default(0),
  status: text("status", { enum: ["pending", "accepted", "rework"] }).notNull().default("pending"),
  reviewerEmail: text("reviewer_email"),
  reworkNotes: text("rework_notes"),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Persistent Memory (ALL agents read/write) ────────────────────────
export const agentActions = sqliteTable("agent_actions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  agentName: text("agent_name").notNull(),
  actionType: text("action_type").notNull(),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  qualityGatePassed: integer("quality_gate_passed", { mode: "boolean" }),
  creditsUsed: real("credits_used"),
  parentActionId: text("parent_action_id"),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
});

export const domainLearnings = sqliteTable("domain_learnings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  learningType: text("learning_type").notNull(),
  insight: text("insight").notNull(),
  dataSource: text("data_source"),
  confidence: real("confidence"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Connectors (Publisher Agent uses) ────────────────────────────────
export const connectors = sqliteTable("connectors", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["wordpress", "shopify", "webflow", "webhook"] }).notNull(),
  authCredentialsEncrypted: text("auth_credentials_encrypted"),
  siteUrl: text("site_url"),
  status: text("status", { enum: ["connected", "disconnected", "error"] }).notNull().default("disconnected"),
  connectedAt: text("connected_at"),
});

export const publishLog = sqliteTable("publish_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  connectorId: text("connector_id").references(() => connectors.id),
  platformPostId: text("platform_post_id"),
  status: text("status", { enum: ["pending", "success", "failed"] }).notNull().default("pending"),
  dryRun: integer("dry_run", { mode: "boolean" }).default(false),
  publishedAt: text("published_at"),
});

// ── Store Products (Product Infuser) ─────────────────────────────────
export const storeProducts = sqliteTable("store_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"),
  price: text("price"),
  description: text("description"),
  category: text("category"),
  imageUrl: text("image_url"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Agent Jobs (deployable agents) ───────────────────────────────────
export const agentJobs = sqliteTable("agent_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentType: text("agent_type").notNull(), // blog_writer | internal_linker | product_infuser
  status: text("status").notNull().default("queued"), // queued | running | complete | failed
  configJson: text("config_json"), // JSON input config
  outputJson: text("output_json"), // JSON result
  creditsUsed: real("credits_used").default(0),
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
});

// ── Type exports ─────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type AuditRun = typeof auditRuns.$inferSelect;
export type AuditIssue = typeof auditIssues.$inferSelect;
export type KeywordCluster = typeof keywordClusters.$inferSelect;
export type ContentCalendarItem = typeof contentCalendar.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ArticleReview = typeof articleReviews.$inferSelect;
export type AgentAction = typeof agentActions.$inferSelect;
export type DomainLearning = typeof domainLearnings.$inferSelect;
export type Connector = typeof connectors.$inferSelect;
export type AgentJob = typeof agentJobs.$inferSelect;
