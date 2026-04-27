CREATE TABLE IF NOT EXISTS `agent_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`agent_name` text NOT NULL,
	`action_type` text NOT NULL,
	`input_summary` text,
	`output_summary` text,
	`quality_gate_passed` integer,
	`credits_used` real,
	`parent_action_id` text,
	`timestamp` text DEFAULT (datetime('now')),
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`calendar_item_id` text,
	`meta_title` text,
	`meta_description` text,
	`slug` text,
	`h1` text,
	`body_markdown` text,
	`faq_schema_json` text,
	`internal_links_json` text,
	`quality_score` real,
	`plagiarism_score` real,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision_count` integer DEFAULT 0,
	`published_url` text,
	`published_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`calendar_item_id`) REFERENCES `content_calendar`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_run_id` text NOT NULL,
	`issue_type` text NOT NULL,
	`severity` text NOT NULL,
	`affected_urls` text,
	`description` text NOT NULL,
	`recommendation` text,
	`data_source` text,
	`estimated_traffic_impact` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`audit_run_id`) REFERENCES `audit_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`agent_version` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`credits_used` real DEFAULT 0,
	`overall_score` real,
	`scores_json` text,
	`pages_found` integer DEFAULT 0,
	`pages_crawled` integer DEFAULT 0,
	`max_pages` integer DEFAULT 25,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')),
	`completed_at` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `backlinks` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`source_url` text,
	`target_url` text,
	`anchor_text` text,
	`domain_authority` real,
	`is_toxic` integer DEFAULT false,
	`discovered_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`platform` text NOT NULL,
	`auth_credentials_encrypted` text,
	`site_url` text,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`connected_at` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_calendar` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`keyword_cluster_id` text,
	`topic` text NOT NULL,
	`target_keywords` text,
	`content_format` text,
	`target_word_count` integer,
	`priority_score` real,
	`internal_link_targets` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`scheduled_date` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`keyword_cluster_id`) REFERENCES `keyword_clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`credits_used` real NOT NULL,
	`balance_after` real NOT NULL,
	`agent` text,
	`timestamp` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `domain_learnings` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`learning_type` text NOT NULL,
	`insight` text NOT NULL,
	`data_source` text,
	`confidence` real,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`domain_url` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `internal_links` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`from_page_id` text,
	`to_page_id` text,
	`anchor_text` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `keyword_clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`cluster_name` text NOT NULL,
	`pillar_keyword` text NOT NULL,
	`search_volume` integer,
	`difficulty` real,
	`intent_type` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`cluster_id` text NOT NULL,
	`keyword` text NOT NULL,
	`search_volume` integer,
	`difficulty` real,
	`current_rank` integer,
	`serp_features` text,
	`intent_type` text,
	FOREIGN KEY (`cluster_id`) REFERENCES `keyword_clusters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`meta_description` text,
	`h1` text,
	`word_count` integer,
	`status_code` integer,
	`canonical_url` text,
	`schema_markup` text,
	`page_speed_json` text,
	`crawled_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `publish_log` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`connector_id` text,
	`platform_post_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`dry_run` integer DEFAULT false,
	`published_at` text,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connector_id`) REFERENCES `connectors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `search_console_data` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`page_url` text,
	`query` text,
	`impressions` integer,
	`clicks` integer,
	`ctr` real,
	`avg_position` real,
	`date` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`stripe_customer_id` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);