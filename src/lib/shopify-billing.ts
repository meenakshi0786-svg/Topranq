// Shopify App Pricing (managed pricing) integration.
//
// Shopify hosts the plan picker and checkout. This module does only two things:
//   1. Reads which plan a shop is subscribed to (Admin GraphQL) and maps it onto
//      our internal `users.plan`, so the existing credit gate just works.
//   2. Builds the URL to Shopify's hosted plan-selection page (the "Upgrade" link).
//
// No charge mutations and no confirmation-URL handling are needed — that's the
// whole point of managed pricing. We sync the plan on every embedded app load
// (managed pricing no longer emits APP_SUBSCRIPTIONS_UPDATE webhooks for new apps).

import { db, schema } from "./db";
import { and, eq, gte, sql } from "drizzle-orm";
import { PLAN_LIMITS } from "./agents/orchestrator";
import { getShopAccessToken, SHOPIFY_API_VERSION } from "./shopify";
import { getOrCreateShopAccount } from "./shopify-embedded";

// App handle from the Partner Dashboard / shopify.app.toml (the slug in the app's
// admin URL). Required to build the hosted pricing-page link.
const SHOPIFY_APP_HANDLE = process.env.SHOPIFY_APP_HANDLE || "";

// Map the Shopify plan *name* (as configured in the Partner Dashboard pricing page)
// onto our internal plan enum. Keys are lowercased for a forgiving match.
// IMPORTANT: the plans you create in the dashboard must be named to match these.
// Pricing ladder (2026-07): Starter $29/mo (25cr), Growth $99/mo (75cr, Opus).
const PLAN_BY_SHOPIFY_NAME: Record<string, "starter" | "growth"> = {
  starter: "starter", // $29/mo
  growth: "growth", // $99/mo
};

// Shopify free tier: ~1 article + one taste of keyword tools, then upgrade.
// (Web `free` stays 100 via PLAN_LIMITS — this override is Shopify-only.)
const SHOPIFY_FREE_CREDITS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BILLING_PERIOD_MS = 30 * MS_PER_DAY; // Shopify recurring charges run on 30-day cycles.

export interface ShopBillingState {
  userId: string;
  domainId: string;
  plan: "free" | "starter" | "growth";
  creditsAllowance: number;
  creditsUsed: number;
  creditsRemaining: number;
  trialDaysRemaining: number;
  subscriptionName: string | null;
  upgradeUrl: string;
  periodEnd: string; // ISO — when the current credit period resets
}

interface ActiveSubscription {
  name: string;
  status: string;
  trialDays: number;
  createdAt: string; // ISO
  currentPeriodEnd: string | null; // ISO
}

/** Format a Date as SQLite's `datetime('now')` UTC text ("YYYY-MM-DD HH:MM:SS"). */
function toSqliteTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Parse a SQLite UTC datetime string ("YYYY-MM-DD HH:MM:SS") into a Date. */
function fromSqliteTime(s: string | null): Date | null {
  if (!s) return null;
  const t = Date.parse(s.replace(" ", "T") + "Z");
  return Number.isNaN(t) ? null : new Date(t);
}

function shopAllowance(plan: ShopBillingState["plan"]): number {
  if (plan === "free") return SHOPIFY_FREE_CREDITS;
  return PLAN_LIMITS[plan].credits;
}

/** Build the link to Shopify's hosted plan-selection page for this shop. */
export function pricingPlansUrl(shop: string): string {
  const storeHandle = shop.trim().toLowerCase().replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${SHOPIFY_APP_HANDLE}/pricing_plans`;
}

/**
 * Read the shop's active app subscription via the Admin GraphQL API.
 * Returns null if the shop isn't connected, has no active subscription, or on any error.
 */
export async function getActiveSubscription(shop: string): Promise<ActiveSubscription | null> {
  const conn = await getShopAccessToken(shop);
  if (!conn) return null;

  const query = `query {
    currentAppInstallation {
      activeSubscriptions { name status trialDays createdAt currentPeriodEnd }
    }
  }`;

  try {
    const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": conn.token, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const subs: ActiveSubscription[] =
      json?.data?.currentAppInstallation?.activeSubscriptions || [];
    if (!subs.length) return null;
    return subs.find((s) => s.status === "ACTIVE") || subs[0];
  } catch {
    return null;
  }
}

/** Days left in the trial for a subscription (0 if none / expired). */
function trialDaysRemaining(sub: ActiveSubscription | null, now: Date): number {
  if (!sub || !sub.trialDays || !sub.createdAt) return 0;
  const created = Date.parse(sub.createdAt);
  if (Number.isNaN(created)) return 0;
  const trialEnd = created + sub.trialDays * MS_PER_DAY;
  const remainingMs = trialEnd - now.getTime();
  return remainingMs <= 0 ? 0 : Math.ceil(remainingMs / MS_PER_DAY);
}

/**
 * Start of the shop's current credit period.
 * - Paid: 30 days before Shopify's `currentPeriodEnd` (their real billing cycle).
 * - Free: rolling 30-day windows anchored on account creation.
 * Credits reset each period because usage is only counted from here forward.
 */
function currentPeriodStart(sub: ActiveSubscription | null, accountCreatedAt: Date, now: Date): Date {
  if (sub?.currentPeriodEnd) {
    const end = Date.parse(sub.currentPeriodEnd);
    if (!Number.isNaN(end)) return new Date(end - BILLING_PERIOD_MS);
  }
  const elapsed = now.getTime() - accountCreatedAt.getTime();
  const periods = Math.max(0, Math.floor(elapsed / BILLING_PERIOD_MS));
  return new Date(accountCreatedAt.getTime() + periods * BILLING_PERIOD_MS);
}

/**
 * Full billing state for an embedded shop: syncs the plan from Shopify, computes
 * the period-scoped credit balance, and returns everything the UI/gate need.
 * Idempotent and safe to call on every request.
 */
export async function getShopBillingState(shop: string): Promise<ShopBillingState> {
  const normalized = shop.trim().toLowerCase();
  const { userId, domainId } = getOrCreateShopAccount(normalized);

  const sub = await getActiveSubscription(normalized);
  const plan: ShopBillingState["plan"] = sub
    ? PLAN_BY_SHOPIFY_NAME[sub.name.trim().toLowerCase()] ?? "free"
    : "free";

  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  const now = new Date();

  // Persist plan changes (upgrade/downgrade/cancel) so they take effect immediately.
  if (user && user.plan !== plan) {
    db.update(schema.users)
      .set({ plan, planPurchasedAt: plan === "free" ? null : toSqliteTime(now) })
      .where(eq(schema.users.id, userId))
      .run();
  }

  const accountCreatedAt = fromSqliteTime(user?.createdAt ?? null) ?? now;
  const periodStart = currentPeriodStart(sub, accountCreatedAt, now);

  // Usage = positive deductions in the current period (topups are negative and ignored).
  const usedRow = db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN ${schema.creditLedger.creditsUsed} > 0 THEN ${schema.creditLedger.creditsUsed} ELSE 0 END), 0)`,
    })
    .from(schema.creditLedger)
    .where(
      and(
        eq(schema.creditLedger.userId, userId),
        gte(schema.creditLedger.timestamp, toSqliteTime(periodStart)),
      ),
    )
    .get();

  const allowance = shopAllowance(plan);
  const used = Math.min(usedRow?.total || 0, allowance);
  const remaining = Math.max(0, allowance - used);

  return {
    userId,
    domainId,
    plan,
    creditsAllowance: allowance,
    creditsUsed: used,
    creditsRemaining: remaining,
    trialDaysRemaining: trialDaysRemaining(sub, now),
    subscriptionName: sub?.name ?? null,
    upgradeUrl: pricingPlansUrl(normalized),
    periodEnd: new Date(periodStart.getTime() + BILLING_PERIOD_MS).toISOString(),
  };
}
