# Ranqapex — Shopify App Store Submission Kit (Phase 3)

Everything you need to list and submit the app. Copy is written to Shopify's exact
character limits. Work top to bottom.

---

## 0. Pre-submission technical checklist (mostly done)

| Requirement | Status |
|---|---|
| Embedded app, session-token auth (no third-party cookies) | ✅ done |
| Billing through Shopify (managed pricing) | ✅ done (Phase 2) |
| Minimal scopes (`write_content, read_content, read_products`) | ✅ done |
| GDPR webhook handlers verify HMAC, return 401 on bad signature | ✅ verified live |
| Uninstall handler clears the stored token | ✅ done |
| Privacy policy + Terms pages | ✅ `/privacy`, `/terms` |
| **Compliance webhooks registered with Shopify** | ⚠️ **action — see §5** |
| App icon 1200×1200 | ✅ `docs/shopify-listing/app-icon.png` |
| 3–6 screenshots @ 1600×900 | ⚠️ **you capture — see §4** |

---

## 1. App icon

Use **`docs/shopify-listing/app-icon.png`** (1200×1200, brand gradient + "R").
Source is `app-icon.svg` if you want to tweak it. Shopify rounds the corners for you.

---

## 2. Listing text — paste-ready (within Shopify's limits)

**App name** (max 30) — 23 chars:
```
Ranqapex Blog Publisher
```
> Alternatives if you want "SEO" in the name: `Ranqapex AI SEO Blog` (20) or `Ranqapex: SEO Blog Writer` (25). Keep it brand-first; don't keyword-stuff or it gets rejected.

**App subtitle / tagline** (short line, keep ≤62) — 58 chars:
```
AI SEO blogs on autopilot - researched, written, published
```

**App introduction** (max 100) — 99 chars:
```
Your AI SEO content team on autopilot: keyword research, articles with your products, auto-publish.
```

**App details** (max 500) — 490 chars:
```
Ranqapex is your AI SEO content team inside Shopify. The Autopilot Agent researches your catalog and competitors, finds keywords with real search volume, then writes and publishes optimized articles on your schedule - set it once and get SEO blogs forever. Content is built for Google AND AI engines like ChatGPT and Perplexity, weaves in your real products, and uses 10 proven templates. Includes SEO audits, AI visibility tracking and live keyword metrics. Free plan; paid from $29/month.
```

**Key benefits** (exactly 3 — title max 40, description max 100):

1. Title: `Rank on Google and AI engines`
   Desc: `SEO + GEO optimized posts so you appear in search and in ChatGPT, Perplexity and AI Overviews.`

2. Title: `Your products, woven in`
   Desc: `Every article naturally features your real products with links, turning readers into buyers.`

3. Title: `Set it and forget it`
   Desc: `The Autopilot Agent writes and publishes on your schedule - wake up to new SEO articles.`

**Search terms** (up to 5):
```
ai blog, seo, blog post generator, content marketing, ai content
```

**Categories:**
- Primary: **Marketing and conversion**
- Subcategory/relevant: **SEO** (and **Content / Blogs** if a second slot is offered)

**Languages:** English

---

## 3. Pricing (enter to match Phase 2 — managed pricing)

Create these on the app's **Pricing** page (if not already done from Phase 2):

| Plan | Price | Trial | What to list |
|---|---|---|---|
| Free | $0 | — | 1 trial article, SEO audit, keyword research taste, 2 free templates |
| **Starter** | $29/month | 7-day free | 25 credits/mo (~8 articles), all 10 templates, keyword research + live metrics, 100-page audits |
| **Growth** | $99/month | 7-day free | 75 credits/mo (~25 articles), highest-quality AI model (Opus), AI Visibility scans, 500-page audits |

> Plan **names must be exactly `Starter` and `Growth`** — the app maps those names to credits.

---

## 4. Screenshots — what to capture (3–6, 1600×900)

**2026 rules (enforced):** each screenshot must primarily show the app's **actual UI**,
must **not** include a desktop background, browser window chrome, or just the logo, and
**each must be distinct** (different feature/state). Capture inside your dev store admin,
then crop to the app panel and export at **1600×900 (16:9)**.

Four ready-made screenshots are in this folder (faithful renders of the real app
UI with a demo coffee-store dataset, 1600×900, no browser chrome):

1. `screenshot-1-home.png` — hero + credit meter + AI Blog Post Generator + articles
2. `screenshot-2-autopilot.png` — Autopilot Agent setup + knowledge base
3. `screenshot-3-templates.png` — the 10-template gallery with FREE/PRO badges
4. `screenshot-4-plan.png` — the page-1 ranking plan with live keyword metrics

Tip: macOS `⇧⌘4` then space to capture a window, or capture and crop. Keep text legible.
Add a short caption to each in the Partner Dashboard.

---

## 5. Register the compliance webhooks (the one required code step)

The handlers exist and pass HMAC checks, but Shopify must be told the URLs or it
auto-rejects. I added them to `shopify.app.toml`. Push that config to Shopify **once**:

```bash
cd "/Users/rubals/Documents/RANQAPEX SEO/seo-analyzer"
npx shopify app deploy
```

This registers (from the toml): the 3 GDPR compliance URLs, the `app/uninstalled`
webhook, scopes, and app URLs. It does **not** touch your server or secrets — it only
updates the app's config on Shopify's side. Follow the prompts (log in if asked, confirm
the release).

**Alternative (no CLI):** Partner Dashboard → your app → **API access** → *Compliance
webhooks* → paste the three URLs:
- Customer data request: `https://ranqapex.com/api/shopify/webhooks/customers-data-request`
- Customer redact: `https://ranqapex.com/api/shopify/webhooks/customers-redact`
- Shop redact: `https://ranqapex.com/api/shopify/webhooks/shop-redact`

(The dashboard route doesn't cover `app/uninstalled` — `shopify app deploy` is preferred.)

---

## 6. Reviewer test instructions (paste into the submission form)

> **No external account or login is required.** The app authenticates through Shopify
> (session tokens) and auto-creates the workspace on install.
>
> 1. Install the app on a development store.
> 2. The app opens inside Shopify admin and loads automatically.
> 3. In **Topic**, enter e.g. "How to choose a gift for coffee lovers" and click
>    **Generate article** (~30s). The free plan includes enough credits for a test
>    article, and development-store subscriptions are test charges — so nothing is
>    ever actually billed while reviewing.
> 4. When it finishes, click **Publish to store blog** — the article appears on the
>    store's blog. A "View published post" link is shown.
> 5. Billing: click **Upgrade plan** to see the Shopify-hosted plan page (Starter $29 /
>    Growth $99, 7-day trial). Dev-store charges are test charges.

---

## 7. Submit

Partner Dashboard → your app → **Distribution** (App Store listing) →
fill everything above → **Run automated checks** (install/uninstall/billing) → fix any
flags → **Submit for review**. Initial review is typically **4–7 business days**.

---

## Quick status

- [ ] §5 webhooks registered (`shopify app deploy` or dashboard)
- [ ] Plans created/named exactly `Starter` / `Growth`
- [ ] App handle verified (Phase 2)
- [ ] Icon uploaded
- [ ] 3–6 screenshots captured + uploaded
- [ ] Listing text pasted
- [ ] Reviewer instructions pasted
- [ ] Automated checks pass
- [ ] Submitted

---

## 8. App support & resources (listing asks for these)

**Support email** (required):
```
ranqapexcontact@gmail.com
```
> ⚠️ Make sure this inbox is monitored — reviewers and merchants will email it.

**Privacy policy URL** (required): `https://ranqapex.com/privacy`
**Terms of service URL:** `https://ranqapex.com/terms`
**Developer website:** `https://ranqapex.com`
**Support / help URL** (optional): `https://ranqapex.com` (or a dedicated help page if you build one)
**Demo store URL** (optional): leave blank, or provide a store where the app is visibly used.

---

## 9. FAQ — paste into the listing's FAQ section (or your site)

**What does Ranqapex do?**
Ranqapex is an AI content tool inside your Shopify admin. You give it a topic and it writes a
complete, SEO- and AI-optimized blog article — then publishes it to your store blog in one click.

**Do I need SEO or writing experience?**
No. Type a topic (and optional keywords) and click Generate. Ranqapex handles the structure,
meta title and description, FAQ schema, and internal product links automatically.

**What is "GEO" and why does it matter?**
GEO (Generative Engine Optimization) means your content is written to be cited by AI answer
engines like ChatGPT, Perplexity, and Google AI Overviews — not just ranked in classic search.
Ranqapex optimizes for both.

**How are my products used in the articles?**
With your permission (read-only product access), Ranqapex naturally references your real products
and links to them inside relevant articles, turning readers into buyers.

**Will this slow down my storefront?**
No. Ranqapex runs inside the Shopify admin and publishes finished posts to your blog. It adds no
scripts or tracking to your live storefront, so it has no effect on store speed.

**Can I review an article before it goes live?**
Yes. Generated articles are saved as drafts. You publish to your store blog only when you click
Publish.

**How much does it cost?**
Start free with a trial article and the SEO audit. Paid plans are Starter ($29/month, ~8 articles)
and Growth ($99/month, ~25 articles with our highest-quality AI model), each with a 7-day free
trial. Billing is handled securely by Shopify.

**How do credits work?**
Each article uses 3 credits. Your monthly credit allowance refreshes at the start of every billing
cycle.

**What languages are supported?**
English at launch.
