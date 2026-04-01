import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";

// GET /api/domains/:id/technical — generate TechSEO fixes from audit issues
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get latest audit run
  const latestRun = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.domainId, id),
    orderBy: desc(schema.auditRuns.createdAt),
  });

  if (!latestRun) {
    return NextResponse.json([]);
  }

  // Get open issues
  const issues = db
    .select()
    .from(schema.auditIssues)
    .where(and(
      eq(schema.auditIssues.auditRunId, latestRun.id),
      eq(schema.auditIssues.status, "open")
    ))
    .all();

  // Get pages for this domain (for schema/canonical info)
  const pages = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.domainId, id))
    .all();

  const hostname = pages[0]?.url
    ? (() => { try { return new URL(pages[0].url).hostname; } catch { return "example.com"; } })()
    : "example.com";

  // Generate fixes from issues
  const fixes = issues.map((issue) => {
    const affectedUrls: string[] = issue.affectedUrls
      ? JSON.parse(issue.affectedUrls)
      : [];

    return generateFix(issue.issueType, issue.severity as string, issue.description || "", affectedUrls, hostname);
  }).filter(Boolean);

  return NextResponse.json(fixes);
}

function generateFix(
  issueType: string,
  severity: string,
  description: string,
  affectedUrls: string[],
  hostname: string
): object | null {
  const fixes: Record<string, { title: string; type: string; language: string; code: string; description: string }> = {
    missing_meta_description: {
      title: "Add meta descriptions",
      type: "meta_tags",
      language: "html",
      code: `<meta name="description" content="Your compelling description here - keep under 155 characters for optimal display in search results.">`,
      description: "Add unique meta descriptions to pages that are missing them. Each description should be unique, under 155 characters, and include the primary keyword.",
    },
    duplicate_meta_description: {
      title: "Fix duplicate meta descriptions",
      type: "meta_tags",
      language: "html",
      code: `<!-- Make each page's meta description unique -->\n<meta name="description" content="[Unique description for this specific page]">`,
      description: "Each page should have a unique meta description. Duplicate descriptions confuse search engines about which page to rank.",
    },
    missing_h1: {
      title: "Add H1 headings",
      type: "headings",
      language: "html",
      code: `<h1>Your Primary Page Heading</h1>\n\n<!-- Rules:\n  - Exactly ONE h1 per page\n  - Include the primary keyword\n  - Keep under 60 characters\n  - Make it different from the title tag -->`,
      description: "Every page needs exactly one H1 tag. It should contain the primary keyword and clearly describe the page content.",
    },
    missing_canonical: {
      title: "Add canonical URLs",
      type: "canonicals",
      language: "html",
      code: `<link rel="canonical" href="https://${hostname}/your-page-slug">`,
      description: "Add canonical tags to prevent duplicate content issues. Point to the preferred version of each page.",
    },
    broken_canonical: {
      title: "Fix broken canonical URLs",
      type: "canonicals",
      language: "html",
      code: `<!-- Current canonical points to a non-existent page. Fix: -->\n<link rel="canonical" href="https://${hostname}/correct-page-url">`,
      description: "Canonical URLs are pointing to pages that return errors. Update them to point to valid, existing pages.",
    },
    missing_schema: {
      title: "Add JSON-LD structured data",
      type: "schema",
      language: "json",
      code: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Page Title",
        description: "Page description",
        url: `https://${hostname}/page-url`,
        publisher: {
          "@type": "Organization",
          name: "Your Organization",
        },
      }, null, 2),
      description: "Add JSON-LD structured data to help search engines understand your content. Use appropriate schema types for each page.",
    },
    missing_alt_text: {
      title: "Add image alt text",
      type: "images",
      language: "html",
      code: `<!-- Before -->\n<img src="image.jpg">\n\n<!-- After -->\n<img src="image.jpg" alt="Descriptive text about the image content">`,
      description: "Add descriptive alt text to all images. Alt text improves accessibility and helps search engines understand image content.",
    },
    missing_hsts: {
      title: "Enable HSTS header",
      type: "security",
      language: "nginx",
      code: `# Nginx\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;\n\n# Apache (.htaccess)\nHeader always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"\n\n# Next.js (next.config.js)\nheaders: async () => [{\n  source: "/(.*)",\n  headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]\n}]`,
      description: "HSTS tells browsers to always use HTTPS. This protects against downgrade attacks and improves SEO.",
    },
    missing_csp: {
      title: "Add Content Security Policy",
      type: "security",
      language: "nginx",
      code: `# Nginx\nadd_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;\n\n# Next.js (next.config.js)\nheaders: async () => [{\n  source: "/(.*)",\n  headers: [{ key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline';" }]\n}]`,
      description: "CSP prevents XSS attacks by controlling which resources the browser can load. Start with a permissive policy and tighten over time.",
    },
    thin_content: {
      title: "Expand thin content pages",
      type: "content",
      language: "markdown",
      code: `# Thin Content Fix Checklist\n\n1. Identify pages with < 300 words\n2. Add relevant, valuable content:\n   - Expand on the topic with expert insights\n   - Add examples, case studies, or data\n   - Include FAQ section (4-6 questions)\n   - Add related subtopics for completeness\n3. Target: minimum 800-1200 words per page\n4. Ensure content matches search intent`,
      description: "Pages with very little content rank poorly. Expand them with valuable, relevant content that satisfies user search intent.",
    },
    orphan_pages: {
      title: "Fix orphan pages (no internal links)",
      type: "internal_links",
      language: "html",
      code: `<!-- Add internal links TO orphan pages from related content -->\n<a href="/orphan-page-url">Descriptive anchor text with keyword</a>\n\n<!-- Recommended: link from at least 2-3 related pages -->\n<!-- Use descriptive anchor text, not "click here" -->`,
      description: "Orphan pages have zero internal links pointing to them, making them hard for search engines to discover and rank.",
    },
    redirect_chain: {
      title: "Fix redirect chains",
      type: "redirects",
      language: "nginx",
      code: `# Instead of: A -> B -> C -> D\n# Fix to: A -> D (single redirect)\n\n# Nginx\nrewrite ^/old-url$ /final-url permanent;\n\n# Apache (.htaccess)\nRedirect 301 /old-url /final-url\n\n# Next.js (next.config.js)\nredirects: async () => [\n  { source: '/old-url', destination: '/final-url', permanent: true },\n]`,
      description: "Redirect chains slow down page loading and waste crawl budget. Replace multi-hop redirects with a single redirect to the final URL.",
    },
    missing_robots_txt: {
      title: "Create robots.txt",
      type: "crawling",
      language: "text",
      code: `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /private/\n\nSitemap: https://${hostname}/sitemap.xml`,
      description: "A robots.txt file tells search engine crawlers which pages to crawl and which to skip.",
    },
    missing_sitemap: {
      title: "Generate XML sitemap",
      type: "crawling",
      language: "xml",
      code: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://${hostname}/</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n  <url>\n    <loc>https://${hostname}/page-1</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>`,
      description: "An XML sitemap helps search engines discover and index all your important pages.",
    },
    server_version_exposed: {
      title: "Hide server version headers",
      type: "security",
      language: "nginx",
      code: `# Nginx\nserver_tokens off;\n\n# Apache\nServerTokens Prod\nServerSignature Off\n\n# Express.js\napp.disable('x-powered-by');`,
      description: "Exposing server version information can help attackers find known vulnerabilities. Remove server identification headers.",
    },
  };

  const fix = fixes[issueType];
  if (!fix) {
    // Generate a generic fix for unknown issue types
    return {
      id: `fix-${issueType}-${Date.now()}`,
      type: "other",
      title: `Fix: ${issueType.replace(/_/g, " ")}`,
      description: description || `Address the ${issueType.replace(/_/g, " ")} issue found during the audit.`,
      code: `# Issue: ${issueType.replace(/_/g, " ")}\n# ${description || "See audit details for more information"}\n\n# TODO: Implement the fix for this issue`,
      language: "text",
      affectedUrls,
      severity,
    };
  }

  return {
    id: `fix-${issueType}-${Date.now()}`,
    type: fix.type,
    title: fix.title,
    description: fix.description,
    code: fix.code,
    language: fix.language,
    affectedUrls,
    severity,
  };
}
