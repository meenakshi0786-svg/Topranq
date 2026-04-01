import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// 25. Large page size check
export const checkPageSize: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const sizeKb = Buffer.byteLength(page.html, "utf8") / 1024;

  if (sizeKb > 500) {
    issues.push({
      checkId: "large_html",
      category: "performance",
      severity: "high",
      impactArea: "ux",
      message: `HTML size is ${Math.round(sizeKb)}KB — very large, may slow rendering`,
      details: { sizeKb: Math.round(sizeKb) },
    });
  } else if (sizeKb > 200) {
    issues.push({
      checkId: "moderate_html",
      category: "performance",
      severity: "low",
      impactArea: "ux",
      message: `HTML size is ${Math.round(sizeKb)}KB — consider reducing`,
      details: { sizeKb: Math.round(sizeKb) },
    });
  }

  return issues;
};

// 26. Slow response time check
export const checkResponseTime: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];

  if (page.loadTimeMs > 3000) {
    issues.push({
      checkId: "slow_response",
      category: "performance",
      severity: "high",
      impactArea: "ux",
      message: `Server response time is ${page.loadTimeMs}ms — aim for under 500ms`,
      details: { loadTimeMs: page.loadTimeMs },
    });
  } else if (page.loadTimeMs > 1000) {
    issues.push({
      checkId: "moderate_response",
      category: "performance",
      severity: "medium",
      impactArea: "ux",
      message: `Server response time is ${page.loadTimeMs}ms — slightly slow`,
      details: { loadTimeMs: page.loadTimeMs },
    });
  }

  return issues;
};

// 27. Image optimization check
export const checkImageOptimization: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  let missingDimensions = 0;
  let missingLazy = 0;
  let totalImages = 0;

  $("img").each((i, el) => {
    totalImages++;
    const width = $(el).attr("width");
    const height = $(el).attr("height");
    const loading = $(el).attr("loading");

    if (!width || !height) {
      missingDimensions++;
    }

    // Only check lazy loading for images below the fold (skip first 2)
    if (i > 1 && loading !== "lazy") {
      missingLazy++;
    }
  });

  if (missingDimensions > 0) {
    issues.push({
      checkId: "images_missing_dimensions",
      category: "performance",
      severity: "medium",
      impactArea: "ux",
      message: `${missingDimensions} of ${totalImages} images missing width/height — causes layout shift (CLS)`,
      details: { missingDimensions, totalImages },
    });
  }

  if (missingLazy > 3) {
    issues.push({
      checkId: "images_no_lazy_loading",
      category: "performance",
      severity: "low",
      impactArea: "ux",
      message: `${missingLazy} below-fold images not using lazy loading`,
      details: { missingLazy, totalImages },
    });
  }

  return issues;
};

// 28. Render-blocking resources check
export const checkRenderBlocking: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  // Count render-blocking scripts in <head>
  let blockingScripts = 0;
  $("head script[src]").each((_, el) => {
    const async = $(el).attr("async");
    const defer = $(el).attr("defer");
    if (async === undefined && defer === undefined) {
      blockingScripts++;
    }
  });

  // Count render-blocking CSS
  let blockingCSS = 0;
  $('head link[rel="stylesheet"]').each((_, el) => {
    const media = $(el).attr("media");
    if (!media || media === "all") {
      blockingCSS++;
    }
  });

  if (blockingScripts > 3) {
    issues.push({
      checkId: "render_blocking_scripts",
      category: "performance",
      severity: "medium",
      impactArea: "ux",
      message: `${blockingScripts} render-blocking scripts in <head> — use async or defer`,
      details: { blockingScripts },
    });
  }

  if (blockingCSS > 5) {
    issues.push({
      checkId: "many_css_files",
      category: "performance",
      severity: "low",
      impactArea: "ux",
      message: `${blockingCSS} CSS files loaded in <head> — consider combining or using critical CSS`,
      details: { blockingCSS },
    });
  }

  return issues;
};

// 29. Viewport meta tag check (mobile friendliness)
export const checkViewport: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const viewport = $('meta[name="viewport"]').attr("content");

  if (!viewport) {
    issues.push({
      checkId: "missing_viewport",
      category: "performance",
      severity: "critical",
      impactArea: "rankings",
      message: "Missing viewport meta tag — page is not mobile-friendly",
    });
  } else if (!viewport.includes("width=device-width")) {
    issues.push({
      checkId: "bad_viewport",
      category: "performance",
      severity: "high",
      impactArea: "rankings",
      message: "Viewport meta tag doesn't include width=device-width",
      details: { viewport },
    });
  }

  return issues;
};

export const performanceChecks: CheckFunction[] = [
  checkPageSize,
  checkResponseTime,
  checkImageOptimization,
  checkRenderBlocking,
  checkViewport,
];
