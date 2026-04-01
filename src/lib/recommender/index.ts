export interface Recommendation {
  checkId: string;
  whyItMatters: string;
  howToFix: string;
  learnMoreUrl?: string;
}

const recommendations: Record<string, Omit<Recommendation, "checkId">> = {
  // Technical
  no_https: {
    whyItMatters:
      "Google uses HTTPS as a ranking signal. HTTP sites show 'Not Secure' warnings in browsers, reducing user trust and conversions.",
    howToFix:
      "1. Get an SSL certificate (free via Let's Encrypt or your host)\n2. Install the certificate on your server\n3. Redirect all HTTP URLs to HTTPS with 301 redirects\n4. Update internal links to use HTTPS\n5. Update your sitemap and canonical tags",
  },
  server_error: {
    whyItMatters:
      "5xx errors mean your server is failing. Search engines will stop crawling pages that consistently error, and users will leave immediately.",
    howToFix:
      "1. Check your server error logs for the root cause\n2. Common causes: PHP/Node crashes, database connection failures, memory limits\n3. If it's intermittent, check server resource usage and scaling\n4. Set up uptime monitoring to catch these quickly",
  },
  not_found: {
    whyItMatters:
      "404 pages waste crawl budget and create poor user experience. If other pages link to a 404, that link equity is lost.",
    howToFix:
      "1. If the content moved, add a 301 redirect to the new URL\n2. If the content was removed, return a proper 410 (Gone) status\n3. Fix any internal links pointing to this URL\n4. Submit updated sitemap to Google Search Console",
  },
  client_error: {
    whyItMatters:
      "4xx errors indicate the page can't be accessed. This wastes crawl budget and any links pointing to it lose their value.",
    howToFix:
      "1. Check if the page requires authentication (might need to be excluded from crawl)\n2. If the page should exist, fix the server configuration\n3. If removed, add appropriate redirects",
  },
  missing_canonical: {
    whyItMatters:
      "Without a canonical tag, search engines guess which version of a page to index. This can lead to duplicate content issues and split ranking signals.",
    howToFix:
      'Add a canonical tag in the <head>:\n```html\n<link rel="canonical" href="https://yoursite.com/page-url" />\n```\nThe canonical should point to the preferred version of the page.',
  },
  canonical_mismatch: {
    whyItMatters:
      "If the canonical points to a different URL, search engines may not index this page at all, attributing its content to the canonical target.",
    howToFix:
      "1. If this is the preferred URL, update the canonical to point to itself\n2. If the canonical target is correct, this page may be intentionally de-duplicated\n3. Ensure the canonical target actually exists and returns 200",
  },
  invalid_canonical: {
    whyItMatters:
      "An invalid canonical URL is ignored by search engines, which is the same as having no canonical at all.",
    howToFix:
      "Fix the canonical tag to use a valid, absolute URL:\n```html\n<link rel=\"canonical\" href=\"https://yoursite.com/correct-url\" />\n```",
  },
  noindex_detected: {
    whyItMatters:
      "A noindex directive tells search engines not to include this page in search results. If this is unintentional, the page gets zero organic traffic.",
    howToFix:
      '1. If you want this page indexed, remove the noindex from meta robots:\n```html\n<!-- Remove this -->\n<meta name="robots" content="noindex">\n```\n2. Also check for X-Robots-Tag in server response headers\n3. If noindex is intentional (login pages, thank you pages), ignore this',
  },
  nofollow_detected: {
    whyItMatters:
      "Nofollow tells search engines not to follow links on this page or pass link equity. This limits how link authority flows through your site.",
    howToFix:
      "If unintentional, remove nofollow from the meta robots tag. Use nofollow selectively on individual links (like user-generated content) rather than page-wide.",
  },
  redirect_chain: {
    whyItMatters:
      "Each redirect in a chain adds latency and loses a small amount of link equity. Chains of 3+ redirects may cause search engines to stop following.",
    howToFix:
      "Update all redirects to point directly to the final destination URL. Replace chains (A → B → C) with direct redirects (A → C).",
  },
  mixed_content: {
    whyItMatters:
      "Loading HTTP resources on HTTPS pages triggers browser security warnings. Some browsers block mixed content entirely, breaking page functionality.",
    howToFix:
      "Update all resource URLs (images, scripts, stylesheets) to use HTTPS:\n```html\n<!-- Change this -->\n<img src=\"http://example.com/image.jpg\">\n<!-- To this -->\n<img src=\"https://example.com/image.jpg\">\n```",
  },
  missing_robots_txt: {
    whyItMatters:
      "robots.txt helps search engines crawl your site efficiently. Without it, crawlers may waste time on irrelevant pages (admin panels, search results, etc.).",
    howToFix:
      "Create a robots.txt file at your domain root:\n```\nUser-agent: *\nAllow: /\n\nSitemap: https://yoursite.com/sitemap.xml\n```\nCustomize Disallow rules for pages you don't want crawled.",
  },
  missing_sitemap: {
    whyItMatters:
      "An XML sitemap helps search engines discover and prioritize your pages. Without one, new or deeply nested pages may take longer to get indexed.",
    howToFix:
      "Create a sitemap.xml at your domain root listing all important pages:\n```xml\n<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url>\n    <loc>https://yoursite.com/</loc>\n    <lastmod>2024-01-01</lastmod>\n  </url>\n</urlset>\n```\nSubmit it in Google Search Console.",
  },
  deep_page: {
    whyItMatters:
      "Pages buried deep in your site structure (4+ clicks from homepage) get crawled less frequently and may rank lower. Users also struggle to find them.",
    howToFix:
      "1. Add direct links from higher-level pages\n2. Include the page in your main navigation or footer\n3. Add it to a relevant hub/category page\n4. Flatten your site architecture where possible",
  },

  // On-Page
  missing_title: {
    whyItMatters:
      "The title tag is the #1 on-page ranking factor and the main text shown in search results. Without it, search engines generate their own (usually poor) title.",
    howToFix:
      "Add a unique, descriptive title tag to the <head>:\n```html\n<title>Primary Keyword - Secondary Keyword | Brand Name</title>\n```\nKeep it 50-60 characters. Include your main keyword near the beginning.",
  },
  title_too_short: {
    whyItMatters:
      "Short titles waste valuable SERP real estate. You have ~60 characters to convince users to click.",
    howToFix:
      "Expand the title to 50-60 characters. Include relevant keywords and a compelling description of the page content.",
  },
  title_too_long: {
    whyItMatters:
      "Titles over 60 characters get truncated in search results with '...', potentially cutting off important keywords or your brand name.",
    howToFix:
      "Shorten the title to 50-60 characters. Put the most important keywords first, brand name last.",
  },
  missing_meta_description: {
    whyItMatters:
      "Meta descriptions are shown as the snippet in search results. Without one, Google generates its own, which may not be compelling or relevant.",
    howToFix:
      'Add a meta description to the <head>:\n```html\n<meta name="description" content="A compelling 120-160 character description that includes your target keyword and encourages clicks.">\n```',
  },
  meta_description_too_short: {
    whyItMatters:
      "Short meta descriptions don't fully utilize the snippet space in search results, reducing your ability to attract clicks.",
    howToFix:
      "Expand to 120-160 characters. Include the target keyword, a clear value proposition, and a subtle call to action.",
  },
  meta_description_too_long: {
    whyItMatters:
      "Long meta descriptions get truncated in search results. The key message may be cut off.",
    howToFix:
      "Trim to 150-160 characters. Front-load the most important information.",
  },
  missing_h1: {
    whyItMatters:
      "The H1 is the main heading of the page and a strong ranking signal. It tells search engines and users what the page is about.",
    howToFix:
      "Add one H1 tag to the page that clearly describes the main topic:\n```html\n<h1>Your Main Page Topic Including Target Keyword</h1>\n```",
  },
  multiple_h1: {
    whyItMatters:
      "Multiple H1 tags dilute the main topic signal. While not a penalty, one clear H1 is best practice for SEO clarity.",
    howToFix:
      "Keep one H1 for the main heading. Change other H1s to H2 or H3 as appropriate for the content hierarchy.",
  },
  h1_too_short: {
    whyItMatters:
      "A very short H1 (like just a brand name) misses the opportunity to signal what the page is about to search engines.",
    howToFix:
      "Make the H1 descriptive and include target keywords. Example: Instead of just 'Blog', use 'Marketing Tips & Strategies Blog'.",
  },
  missing_h2: {
    whyItMatters:
      "H2 subheadings help break up content for readability and give search engines additional topic signals. They also enable featured snippet eligibility.",
    howToFix:
      "Add H2 subheadings to organize your content into logical sections. Each H2 should describe the section that follows it.",
  },
  heading_skip: {
    whyItMatters:
      "Skipping heading levels (e.g., H1 → H3) breaks the document outline and can confuse screen readers. It's a minor accessibility and SEO issue.",
    howToFix:
      "Use headings in sequential order: H1 → H2 → H3. Don't skip levels for styling purposes — use CSS instead.",
  },
  images_missing_alt: {
    whyItMatters:
      "Alt text helps search engines understand images (Google Image Search is a significant traffic source) and is required for accessibility.",
    howToFix:
      'Add descriptive alt text to every meaningful image:\n```html\n<img src="photo.jpg" alt="Description of what the image shows">\n```\nBe specific and include relevant keywords naturally.',
  },
  images_empty_alt: {
    whyItMatters:
      'Empty alt="" is correct for decorative images. But if the image conveys information, it needs descriptive alt text.',
    howToFix:
      "Review images with empty alt text. If they're decorative (borders, spacers), empty alt is fine. If they show content, add descriptive alt text.",
  },
  missing_structured_data: {
    whyItMatters:
      "Structured data enables rich results (star ratings, prices, FAQ dropdowns, etc.) that dramatically increase click-through rates from search results.",
    howToFix:
      'Add JSON-LD structured data in the <head>:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title",\n  "description": "Page description"\n}\n</script>\n```\nUse the appropriate schema type for your content (Article, Product, FAQ, etc.).',
  },
  invalid_json_ld: {
    whyItMatters:
      "Invalid JSON-LD syntax means search engines can't parse your structured data. You get none of the rich result benefits.",
    howToFix:
      "Validate your JSON-LD at https://validator.schema.org/. Fix syntax errors (missing commas, unclosed brackets, etc.).",
  },
  url_too_long: {
    whyItMatters:
      "Very long URLs are harder to share, may be truncated in search results, and can indicate poor site structure.",
    howToFix:
      "Shorten the URL to include only essential keywords. Remove unnecessary words, numbers, and parameters.",
  },
  url_uppercase: {
    whyItMatters:
      "URLs are case-sensitive on most servers. /Page and /page can serve different content, causing duplicate content issues.",
    howToFix:
      "Use lowercase URLs consistently. Set up server-side redirects from uppercase variants to lowercase.",
  },
  url_underscores: {
    whyItMatters:
      "Google treats hyphens as word separators but underscores as word joiners. 'my_page' is read as 'mypage' rather than 'my page'.",
    howToFix:
      "Use hyphens instead of underscores in URLs: /my-page-title instead of /my_page_title. Set up 301 redirects from old URLs.",
  },
  url_excessive_params: {
    whyItMatters:
      "URLs with many query parameters can create infinite crawl traps and duplicate content issues.",
    howToFix:
      "1. Use clean, static URLs where possible\n2. Set up canonical tags to point to the parameter-free version\n3. Use Google Search Console's URL Parameters tool to tell Google which parameters to ignore",
  },

  // Content
  very_thin_content: {
    whyItMatters:
      "Pages with very little content rarely rank well. Search engines can't determine the topic, and users find no value.",
    howToFix:
      "Add substantial, unique content (minimum 300 words for informational pages). Address the user's likely search intent. If this is a navigation-only page, consider whether it should be indexed.",
  },
  thin_content: {
    whyItMatters:
      "Thin content pages are less likely to rank. Google's Helpful Content system specifically targets low-value pages.",
    howToFix:
      "Expand the content to thoroughly cover the topic. Add context, examples, data, or media. Aim for at least 300 words of unique, valuable content.",
  },
  low_readability: {
    whyItMatters:
      "Long, complex sentences reduce engagement. Users skim content — if it's hard to read, they bounce. High bounce rates hurt rankings.",
    howToFix:
      "1. Break long sentences into shorter ones (15-20 words each)\n2. Use bullet points and numbered lists\n3. Add subheadings every 2-3 paragraphs\n4. Write at an 8th-grade reading level for general audiences",
  },
  duplicate_title: {
    whyItMatters:
      "Duplicate titles confuse search engines about which page to rank. They may pick the wrong one, or neither may rank well.",
    howToFix:
      "Give every page a unique title that accurately describes its specific content. Avoid templates like 'Page Name | Site Name' if every page ends up identical.",
  },
  duplicate_meta_description: {
    whyItMatters:
      "Duplicate meta descriptions reduce your ability to craft targeted snippets for each page. Google may ignore them entirely.",
    howToFix:
      "Write a unique meta description for every page. Each should describe what makes that specific page valuable.",
  },
  title_h1_mismatch: {
    whyItMatters:
      "When the title and H1 target completely different keywords, it sends mixed signals to search engines about what the page is about.",
    howToFix:
      "Align your title and H1 around the same primary keyword. They don't need to be identical, but should reinforce the same topic.",
  },
  meta_desc_no_keyword: {
    whyItMatters:
      "When users search for a term and see it bolded in your meta description, they're more likely to click. Missing keywords reduces CTR.",
    howToFix:
      "Include your primary keyword naturally in the meta description. Don't keyword stuff — write for humans first.",
  },
  missing_author: {
    whyItMatters:
      "Author attribution is an E-E-A-T signal. For YMYL (Your Money Your Life) topics especially, Google wants to know who created the content.",
    howToFix:
      'Add author information: byline, author bio, link to author page. Use Person schema:\n```html\n<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"Article","author":{"@type":"Person","name":"Author Name"}}\n</script>\n```',
  },
  missing_publish_date: {
    whyItMatters:
      "Publish and update dates signal content freshness. For news and time-sensitive topics, Google heavily favors recent content.",
    howToFix:
      'Add a visible publish date and "last updated" date. Use datePublished/dateModified in your schema markup.',
  },

  // Structure
  no_internal_links: {
    whyItMatters:
      "Pages with no internal links are dead ends. Crawlers can't discover more of your site, and users have nowhere to go. Link equity stops flowing.",
    howToFix:
      "Add relevant internal links to other pages on your site. Include contextual links within the content and navigation links in the header/footer.",
  },
  few_internal_links: {
    whyItMatters:
      "Your homepage is typically your strongest page. Few internal links from it means you're not distributing that authority to other important pages.",
    howToFix:
      "Add links to your most important pages from the homepage. Use descriptive anchor text that includes target keywords.",
  },
  too_many_links: {
    whyItMatters:
      "Excessive links on a single page dilute the link equity passed to each linked page and can look spammy to search engines.",
    howToFix:
      "Reduce the number of links to a reasonable amount. Prioritize the most important pages. Consider using nofollow on less important links.",
  },
  orphan_page: {
    whyItMatters:
      "Orphan pages (no internal links pointing to them) are hard for search engines to discover and typically receive very little link equity.",
    howToFix:
      "Add links to this page from relevant parent pages, category pages, or the sitemap. Every indexable page should be reachable through internal links.",
  },
  broken_internal_links: {
    whyItMatters:
      "Broken links waste crawl budget, leak link equity, and frustrate users. They signal poor site maintenance to search engines.",
    howToFix:
      "1. Update the link to point to the correct URL\n2. If the target page was removed, either remove the link or redirect the target URL\n3. Run regular broken link checks",
  },
  missing_lang: {
    whyItMatters:
      "The lang attribute helps search engines serve the right language version to users and improves accessibility for screen readers.",
    howToFix:
      'Add the lang attribute to your <html> tag:\n```html\n<html lang="en">\n```\nUse the correct ISO language code for your content.',
  },

  // Performance
  large_html: {
    whyItMatters:
      "Very large HTML files take longer to download and parse, especially on mobile networks. This directly impacts Core Web Vitals and user experience.",
    howToFix:
      "1. Remove unused code, comments, and whitespace\n2. Defer non-critical content loading\n3. Use pagination for long lists\n4. Enable gzip/brotli compression on your server",
  },
  moderate_html: {
    whyItMatters:
      "While not critical, large HTML can be reduced to improve load times, especially for mobile users.",
    howToFix:
      "Review the page for unnecessary inline styles, scripts, or redundant markup. Enable server-side compression.",
  },
  slow_response: {
    whyItMatters:
      "Server response time (TTFB) is a Core Web Vitals component. Slow responses delay everything else. Google uses page speed as a ranking factor.",
    howToFix:
      "1. Enable server-side caching\n2. Use a CDN for static assets\n3. Optimize database queries\n4. Upgrade server resources if needed\n5. Use a faster hosting provider",
  },
  moderate_response: {
    whyItMatters:
      "Response times over 1 second indicate room for improvement. Faster pages rank better and convert more.",
    howToFix:
      "1. Enable page caching\n2. Optimize server configuration\n3. Consider a CDN if you serve a global audience",
  },
  images_missing_dimensions: {
    whyItMatters:
      "Images without width and height cause layout shift (CLS) as they load. CLS is a Core Web Vital that affects rankings.",
    howToFix:
      'Add width and height attributes to all images:\n```html\n<img src="photo.jpg" width="800" height="600" alt="Description">\n```\nOr use CSS aspect-ratio to reserve space.',
  },
  images_no_lazy_loading: {
    whyItMatters:
      "Loading all images upfront wastes bandwidth and slows initial page load. Below-fold images should load only when needed.",
    howToFix:
      'Add loading="lazy" to images below the fold:\n```html\n<img src="photo.jpg" loading="lazy" alt="Description">\n```\nDon\'t lazy load above-fold images (hero, logo).',
  },
  render_blocking_scripts: {
    whyItMatters:
      "Scripts in <head> without async/defer block HTML parsing. The browser stops rendering until each script downloads and executes.",
    howToFix:
      'Add async or defer to script tags:\n```html\n<script src="script.js" defer></script>\n```\nUse defer for scripts that depend on DOM. Use async for independent scripts (analytics, ads).',
  },
  many_css_files: {
    whyItMatters:
      "Each CSS file is a separate HTTP request that blocks rendering. Many small files are slower than one combined file.",
    howToFix:
      "1. Combine CSS files where possible\n2. Inline critical CSS for above-fold content\n3. Load non-critical CSS asynchronously\n4. Use a build tool to bundle CSS",
  },
  missing_viewport: {
    whyItMatters:
      "Without a viewport meta tag, mobile devices render the page at desktop width and scale it down. Google considers this page not mobile-friendly, hurting mobile rankings.",
    howToFix:
      'Add the viewport meta tag to <head>:\n```html\n<meta name="viewport" content="width=device-width, initial-scale=1">\n```',
  },
  bad_viewport: {
    whyItMatters:
      "An incorrect viewport configuration can cause mobile rendering issues, affecting usability and mobile search rankings.",
    howToFix:
      'Use the standard viewport tag:\n```html\n<meta name="viewport" content="width=device-width, initial-scale=1">\n```',
  },

  // Social
  missing_og_tags: {
    whyItMatters:
      "Without Open Graph tags, social media platforms generate poor previews when your page is shared — often with wrong images or missing descriptions.",
    howToFix:
      'Add Open Graph meta tags to <head>:\n```html\n<meta property="og:title" content="Page Title">\n<meta property="og:description" content="Page description">\n<meta property="og:image" content="https://yoursite.com/image.jpg">\n<meta property="og:url" content="https://yoursite.com/page">\n<meta property="og:type" content="website">\n```',
  },
  incomplete_og_tags: {
    whyItMatters:
      "Incomplete OG tags mean some social platforms may not display your content optimally. og:image is especially important for click-through.",
    howToFix:
      "Add the missing OG tags listed in the issue details. At minimum, include og:title, og:description, og:image, and og:url.",
  },
  missing_twitter_cards: {
    whyItMatters:
      "Without Twitter Card tags, links shared on Twitter/X show as plain text with no image preview, significantly reducing engagement.",
    howToFix:
      'Add Twitter Card meta tags:\n```html\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="Page Title">\n<meta name="twitter:description" content="Page description">\n<meta name="twitter:image" content="https://yoursite.com/image.jpg">\n```',
  },
  missing_favicon: {
    whyItMatters:
      "Favicons appear in browser tabs, bookmarks, and Google search results. Missing favicons look unprofessional and reduce brand recognition.",
    howToFix:
      'Add a favicon link in <head>:\n```html\n<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n```',
  },
  missing_local_schema: {
    whyItMatters:
      "LocalBusiness schema helps your business appear in Google's local pack (map results), which gets ~42% of clicks for local searches.",
    howToFix:
      'Add LocalBusiness schema:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Business Name",\n  "address": {"@type": "PostalAddress", "streetAddress": "123 Main St"},\n  "telephone": "+1-555-123-4567"\n}\n</script>\n```',
  },

  // E-E-A-T
  no_author_bio: {
    whyItMatters:
      "Author bios are a key E-E-A-T signal. Google's quality raters look for clear authorship to assess content credibility, especially for informational pages.",
    howToFix:
      "Add an author bio section with the writer's name, credentials, and expertise. Use Person schema markup to reinforce authorship for search engines.",
  },
  ymyl_no_credentials: {
    whyItMatters:
      "YMYL (Your Money Your Life) content about health, finance, or legal topics is held to the highest E-E-A-T standards. Without visible credentials, Google may significantly demote this content.",
    howToFix:
      "1. Add author credentials (MD, CPA, JD, etc.) visibly on the page\n2. Include an author bio with qualifications and experience\n3. Add a 'Reviewed by' badge for medical/financial content\n4. Link to the author's professional profile or credentials page",
  },
  missing_trust_signals: {
    whyItMatters:
      "Trust signals like contact info, privacy policies, and about pages help Google verify your site is legitimate. Missing these signals weakens your site's trustworthiness score.",
    howToFix:
      "Add the missing trust signals to your homepage:\n1. Contact information (email, phone, address)\n2. Link to privacy policy and terms of service\n3. Link to an about page with team/company info\n4. Display any relevant certifications or trust badges",
  },
  no_update_date: {
    whyItMatters:
      "Content freshness is a ranking factor for time-sensitive queries. Showing a 'last updated' date signals to Google that content is maintained and current.",
    howToFix:
      "Add a visible 'Last updated: [date]' near the publish date. Use dateModified in your Article schema:\n```json\n\"dateModified\": \"2024-01-15\"\n```",
  },
  no_citations: {
    whyItMatters:
      "External citations and references strengthen E-E-A-T by showing content is well-researched. Google's quality raters look for sourced claims, especially in YMYL content.",
    howToFix:
      "Add references to authoritative sources within your content. Link to studies, official documentation, or expert sources. Use footnotes or inline citations for data claims.",
  },

  // AI Readiness
  some_ai_crawlers_blocked: {
    whyItMatters:
      "Blocking some AI crawlers reduces your visibility in AI-powered search results (ChatGPT, Perplexity, Google AI Overviews). As AI search grows, this means less traffic.",
    howToFix:
      "Review your robots.txt AI crawler blocks. If you want AI search visibility, allow crawlers like GPTBot, ClaudeBot, and PerplexityBot. You can block training-only crawlers (CCBot) while allowing search crawlers.",
  },
  all_ai_crawlers_blocked: {
    whyItMatters:
      "With all AI crawlers blocked, your content won't appear in any AI search results — ChatGPT, Perplexity, Google AI Overviews, or similar. This is an increasingly significant traffic source.",
    howToFix:
      "Update robots.txt to allow AI search crawlers:\n```\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n```\nKeep blocking training-only crawlers if desired.",
  },
  no_llms_txt: {
    whyItMatters:
      "llms.txt is an emerging standard that helps AI models understand your site's purpose, key content, and preferred citation format — improving how AI systems represent your brand.",
    howToFix:
      "Create a /llms.txt file at your domain root with your site's purpose, key pages, and citation preferences. See llmstxt.org for the specification.",
  },
  poor_ai_citability: {
    whyItMatters:
      "AI models extract and cite content based on structure. Pages with clear headings, lists, tables, and summaries are far more likely to be cited in AI-generated answers.",
    howToFix:
      "Improve content structure for AI extraction:\n1. Use clear H2/H3 headings for each topic\n2. Add bulleted or numbered lists for key points\n3. Include a TL;DR or summary section\n4. Use tables for comparative data\n5. Structure paragraphs around single concepts (40-200 words each)",
  },
  faq_without_schema: {
    whyItMatters:
      "FAQ-style content is highly citable by AI models. Adding FAQPage schema increases the likelihood of your answers being surfaced in AI search results and Google's People Also Ask.",
    howToFix:
      'Add FAQPage schema for question-answer content:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "Your question?",\n    "acceptedAnswer": {"@type": "Answer", "text": "Your answer."}\n  }]\n}\n</script>\n```',
  },

  // Schema
  no_schema_markup: {
    whyItMatters:
      "Structured data enables rich results (star ratings, prices, FAQ dropdowns, breadcrumbs) that dramatically increase click-through rates — often by 20-30%.",
    howToFix:
      'Add JSON-LD structured data appropriate for your page type:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title",\n  "description": "Page description"\n}\n</script>\n```\nUse Article for blog posts, Product for product pages, LocalBusiness for local businesses.',
  },
  schema_validation_errors: {
    whyItMatters:
      "Schema markup with missing required fields won't generate rich results. Search engines need complete, valid structured data to display enhanced listings.",
    howToFix:
      "Fix the missing fields listed in the issue details. Test your schema at https://validator.schema.org/ and Google's Rich Results Test. Each schema type has specific required and recommended properties.",
  },
  article_no_schema: {
    whyItMatters:
      "Article schema enables rich results with publish date, author, and headline in search results. This increases visibility and click-through rate for blog and news content.",
    howToFix:
      'Add Article or BlogPosting schema:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "BlogPosting",\n  "headline": "Article Title",\n  "author": {"@type": "Person", "name": "Author Name"},\n  "datePublished": "2024-01-01",\n  "image": "https://yoursite.com/image.jpg"\n}\n</script>\n```',
  },
  product_no_schema: {
    whyItMatters:
      "Product schema enables price, availability, and rating display directly in search results. Pages with Product rich results get significantly higher click-through rates.",
    howToFix:
      'Add Product schema with offers:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "Product Name",\n  "offers": {"@type": "Offer", "price": "29.99", "priceCurrency": "USD"}\n}\n</script>\n```',
  },
  breadcrumb_no_schema: {
    whyItMatters:
      "BreadcrumbList schema shows breadcrumb navigation directly in search results, helping users understand page hierarchy and improving click-through rates.",
    howToFix:
      'Add BreadcrumbList schema matching your visible breadcrumbs:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "BreadcrumbList",\n  "itemListElement": [\n    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://yoursite.com/"},\n    {"@type": "ListItem", "position": 2, "name": "Category", "item": "https://yoursite.com/category"}\n  ]\n}\n</script>\n```',
  },
  homepage_no_org_schema: {
    whyItMatters:
      "Organization or WebSite schema on your homepage helps Google understand your brand, display your logo in search results, and enable the sitelinks search box.",
    howToFix:
      'Add Organization and WebSite schema to your homepage:\n```html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Brand",\n  "url": "https://yoursite.com",\n  "logo": "https://yoursite.com/logo.png"\n}\n</script>\n```',
  },

  // Images
  no_modern_image_formats: {
    whyItMatters:
      "WebP and AVIF images are 25-50% smaller than JPG/PNG with equal quality. Smaller images mean faster page loads, better Core Web Vitals, and improved mobile experience.",
    howToFix:
      "Convert images to WebP or AVIF format. Use the <picture> element for browser fallback:\n```html\n<picture>\n  <source srcset=\"image.avif\" type=\"image/avif\">\n  <source srcset=\"image.webp\" type=\"image/webp\">\n  <img src=\"image.jpg\" alt=\"Description\">\n</picture>\n```\nMost CDNs and build tools can auto-convert images.",
  },
  no_responsive_images: {
    whyItMatters:
      "Without srcset, mobile users download full-size desktop images — wasting bandwidth and slowing page loads. This hurts Core Web Vitals and mobile rankings.",
    howToFix:
      'Add srcset and sizes attributes to content images:\n```html\n<img\n  src="image-800.jpg"\n  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"\n  sizes="(max-width: 600px) 400px, (max-width: 900px) 800px, 1200px"\n  alt="Description"\n>\n```',
  },
  hero_image_lazy: {
    whyItMatters:
      "Lazy-loading the first/hero image delays LCP (Largest Contentful Paint) — a Core Web Vital. Above-fold images should load immediately for the best user experience.",
    howToFix:
      'Remove loading="lazy" from your hero/first image. Add fetchpriority="high" instead:\n```html\n<img src="hero.jpg" fetchpriority="high" alt="Hero image">\n```',
  },
  no_fetch_priority: {
    whyItMatters:
      "fetchpriority=\"high\" tells the browser to prioritize your LCP image, improving Largest Contentful Paint scores. Without it, the browser may deprioritize your most important image.",
    howToFix:
      'Add fetchpriority="high" to your hero/LCP image:\n```html\n<img src="hero.jpg" fetchpriority="high" alt="Hero image">\n```\nOnly use this on one image — your most important above-fold image.',
  },
  generic_alt_text: {
    whyItMatters:
      "Generic alt text like \"image\" or \"photo\" provides no value to search engines or screen readers. Descriptive alt text helps images rank in Google Image Search and improves accessibility.",
    howToFix:
      "Replace generic alt text with specific descriptions:\n- Instead of: alt=\"image\"\n- Use: alt=\"Golden retriever puppy playing in autumn leaves\"\n\nDescribe what the image shows, include relevant keywords naturally, and keep it under 125 characters.",
  },
  alt_text_too_long: {
    whyItMatters:
      "Alt text over 125 characters may be truncated by screen readers and can look like keyword stuffing to search engines, potentially triggering spam filters.",
    howToFix:
      "Trim alt text to 125 characters or less. Focus on concisely describing the image content. Move detailed descriptions to a figcaption or surrounding text instead.",
  },

  // Hreflang
  hreflang_errors: {
    whyItMatters:
      "Incorrect hreflang implementation can cause search engines to show the wrong language version to users, leading to poor UX and lost international traffic.",
    howToFix:
      "Fix the hreflang issues listed in the details:\n1. Use valid ISO 639-1 language codes (e.g., \"en\", \"fr\", \"de\")\n2. Use absolute URLs for all href values\n3. Include a self-referencing hreflang tag on every page\n4. Add x-default for users with no language match\n5. Ensure every target page links back (return tags)",
  },
  missing_html_lang: {
    whyItMatters:
      "The lang attribute on <html> tells browsers and search engines the page's language. Missing it hurts accessibility (screen readers) and can affect language-specific search rankings.",
    howToFix:
      'Add the lang attribute to your <html> tag:\n```html\n<html lang="en">\n```\nUse the correct ISO 639-1 code for your content language.',
  },
  invalid_html_lang: {
    whyItMatters:
      "An invalid lang attribute value is ignored by browsers and search engines, which is the same as having none at all.",
    howToFix:
      'Use a valid ISO 639-1 language code:\n```html\n<html lang="en">    <!-- English -->\n<html lang="en-US"> <!-- American English -->\n<html lang="fr">    <!-- French -->\n```',
  },

  // Security
  missing_hsts: {
    whyItMatters:
      "Without HSTS, browsers may still attempt HTTP connections before redirecting to HTTPS. This creates a window for man-in-the-middle attacks and wastes a redirect hop.",
    howToFix:
      'Add the Strict-Transport-Security header on your server:\n```\nStrict-Transport-Security: max-age=31536000; includeSubDomains; preload\n```\nStart with a short max-age (300) and increase after verifying everything works.',
  },
  missing_content_type_options: {
    whyItMatters:
      "Without X-Content-Type-Options: nosniff, browsers may MIME-sniff responses and interpret files as a different content type, potentially enabling XSS attacks.",
    howToFix:
      'Add this header to all responses:\n```\nX-Content-Type-Options: nosniff\n```\nMost web servers and frameworks have a simple config option for this.',
  },
  missing_frame_protection: {
    whyItMatters:
      "Without clickjacking protection, attackers can embed your site in an invisible iframe and trick users into clicking on your page elements without their knowledge.",
    howToFix:
      'Add either X-Frame-Options or Content-Security-Policy frame-ancestors:\n```\nX-Frame-Options: DENY\n```\nOr the more modern approach:\n```\nContent-Security-Policy: frame-ancestors \'none\'\n```',
  },
  missing_csp: {
    whyItMatters:
      "Content Security Policy prevents cross-site scripting (XSS), data injection, and other code injection attacks by controlling which resources the browser is allowed to load.",
    howToFix:
      "Start with a report-only CSP to identify issues before enforcing:\n```\nContent-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'\n```\nGradually tighten the policy as you resolve violations.",
  },
  missing_referrer_policy: {
    whyItMatters:
      "Without a Referrer-Policy, browsers send the full URL (including query parameters) to third-party sites. This can leak sensitive data like session tokens or user IDs.",
    howToFix:
      'Add a Referrer-Policy header:\n```\nReferrer-Policy: strict-origin-when-cross-origin\n```\nThis sends the origin (domain) to other sites but the full URL only for same-origin requests.',
  },
  missing_permissions_policy: {
    whyItMatters:
      "Without Permissions-Policy, any embedded iframe or script can access powerful browser features like camera, microphone, geolocation, and payment APIs.",
    howToFix:
      'Add a Permissions-Policy header to restrict features:\n```\nPermissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n```\nOnly enable features your site actually uses.',
  },
  server_version_exposed: {
    whyItMatters:
      "Exposing server software versions helps attackers identify known vulnerabilities for your specific server version, making targeted attacks easier.",
    howToFix:
      "Remove or mask the Server header in your web server config:\n- Nginx: `server_tokens off;`\n- Apache: `ServerTokens Prod`\n- Express: `app.disable('x-powered-by')`",
  },
  powered_by_exposed: {
    whyItMatters:
      "The X-Powered-By header reveals your technology stack (e.g., Express, PHP, ASP.NET), helping attackers target framework-specific vulnerabilities.",
    howToFix:
      "Remove the X-Powered-By header:\n- Express: `app.disable('x-powered-by')`\n- PHP: Set `expose_php = Off` in php.ini\n- Most hosting panels have a toggle for this",
  },

  // Accessibility
  missing_skip_nav: {
    whyItMatters:
      "Skip navigation links let keyboard and screen reader users jump directly to main content without tabbing through every navigation link. Required for WCAG 2.1 Level A compliance.",
    howToFix:
      'Add a skip nav link as the first focusable element:\n```html\n<a href="#main" class="skip-nav">Skip to main content</a>\n...\n<main id="main">\n```\nStyle it to appear only on focus with CSS.',
  },
  unlabeled_form_fields: {
    whyItMatters:
      "Form fields without labels are inaccessible to screen readers. Users who can't see the page won't know what information to enter, leading to form abandonment.",
    howToFix:
      'Associate a label with every form input:\n```html\n<label for="email">Email</label>\n<input type="email" id="email">\n```\nOr use aria-label for visually hidden labels:\n```html\n<input type="search" aria-label="Search">\n```',
  },
  missing_main_landmark: {
    whyItMatters:
      "The <main> landmark lets screen readers jump directly to the primary content. Without it, assistive technology users must navigate through the entire page to find the content.",
    howToFix:
      'Wrap your primary page content in a <main> element:\n```html\n<main>\n  <!-- Primary page content here -->\n</main>\n```\nThere should be only one <main> element per page.',
  },
  missing_nav_landmark: {
    whyItMatters:
      "The <nav> element helps screen reader users find and skip navigation menus. Without it, navigation links are indistinguishable from regular links.",
    howToFix:
      'Wrap your navigation menus in <nav> elements:\n```html\n<nav aria-label="Main navigation">\n  <a href="/">Home</a>\n  <a href="/about">About</a>\n</nav>\n```',
  },
  empty_buttons: {
    whyItMatters:
      "Buttons without accessible text are announced as just \"button\" by screen readers. Users have no idea what the button does, making the interface unusable.",
    howToFix:
      'Add text or an aria-label to every button:\n```html\n<button aria-label="Close menu">\n  <svg><!-- icon --></svg>\n</button>\n```\nOr include visible text alongside the icon.',
  },
  empty_links: {
    whyItMatters:
      "Links without text are announced as the raw URL by screen readers, providing no context about the destination. This is confusing and violates WCAG accessibility guidelines.",
    howToFix:
      'Add text or aria-label to every link:\n```html\n<a href="/profile" aria-label="View profile">\n  <img src="avatar.png" alt="User avatar">\n</a>\n```',
  },
  tiny_text: {
    whyItMatters:
      "Text smaller than 12px is difficult to read on mobile devices and may trigger Google's mobile usability warnings. It also fails WCAG readability guidelines.",
    howToFix:
      "Set a minimum font size of 16px for body text and 12px for secondary text. Use relative units (rem/em) instead of px for better scalability across devices.",
  },
};

export function getRecommendation(checkId: string): Recommendation | null {
  const rec = recommendations[checkId];
  if (!rec) return null;
  return { checkId, ...rec };
}

export function getRecommendations(
  checkIds: string[]
): Map<string, Recommendation> {
  const result = new Map<string, Recommendation>();
  for (const id of checkIds) {
    const rec = getRecommendation(id);
    if (rec) result.set(id, rec);
  }
  return result;
}
