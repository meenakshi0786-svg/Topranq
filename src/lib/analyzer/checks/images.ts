import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// Deep image optimization checks

// 42. Image format optimization
export const checkImageFormats: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  let legacyFormatCount = 0;
  let totalImages = 0;
  const legacyImages: string[] = [];

  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    totalImages++;

    // Check for legacy formats that should be WebP/AVIF
    if (/\.(png|jpg|jpeg|gif|bmp|tiff)(\?|$)/i.test(src)) {
      legacyFormatCount++;
      if (legacyImages.length < 5) legacyImages.push(src.split("?")[0].split("/").pop() || src);
    }
  });

  // Also check picture/source elements for modern format support
  const hasModernFormats =
    $("source[type='image/webp']").length > 0 ||
    $("source[type='image/avif']").length > 0 ||
    $("img[src*='.webp']").length > 0 ||
    $("img[src*='.avif']").length > 0;

  if (legacyFormatCount > 3 && !hasModernFormats) {
    issues.push({
      checkId: "no_modern_image_formats",
      category: "performance",
      severity: "medium",
      impactArea: "ux",
      message: `${legacyFormatCount} of ${totalImages} images use legacy formats (JPG/PNG) — convert to WebP or AVIF for 25-50% smaller files`,
      details: { legacyFormatCount, totalImages, examples: legacyImages },
    });
  }

  return issues;
};

// 43. Responsive images check
export const checkResponsiveImages: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  let missingSrcset = 0;
  let totalContentImages = 0;

  $("img[src]").each((i, el) => {
    // Skip icons, logos, tracking pixels (small images)
    const width = parseInt($(el).attr("width") || "0");
    const height = parseInt($(el).attr("height") || "0");
    const src = $(el).attr("src") || "";

    // Skip tiny images and SVGs
    if ((width > 0 && width < 50) || (height > 0 && height < 50)) return;
    if (src.endsWith(".svg") || src.startsWith("data:")) return;

    totalContentImages++;

    const srcset = $(el).attr("srcset");
    const sizes = $(el).attr("sizes");

    if (!srcset) {
      missingSrcset++;
    }
  });

  if (totalContentImages > 3 && missingSrcset > totalContentImages * 0.7) {
    issues.push({
      checkId: "no_responsive_images",
      category: "performance",
      severity: "medium",
      impactArea: "ux",
      message: `${missingSrcset} of ${totalContentImages} content images lack srcset — mobile users download unnecessarily large images`,
      details: { missingSrcset, totalContentImages },
    });
  }

  return issues;
};

// 44. Above-fold image priority check
export const checkImagePriority: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  // Check first image for fetchpriority
  const firstImg = $("img").first();
  if (firstImg.length === 0) return issues;

  const fetchPriority = firstImg.attr("fetchpriority");
  const loading = firstImg.attr("loading");

  // First image should NOT be lazy loaded (it's above the fold)
  if (loading === "lazy") {
    issues.push({
      checkId: "hero_image_lazy",
      category: "performance",
      severity: "medium",
      impactArea: "ux",
      message: "First image on page has loading=\"lazy\" — above-fold images should load eagerly for better LCP",
    });
  }

  // Check if any image has fetchpriority="high"
  const hasFetchPriority = $('img[fetchpriority="high"]').length > 0;
  const totalImages = $("img").length;

  if (totalImages > 2 && !hasFetchPriority) {
    issues.push({
      checkId: "no_fetch_priority",
      category: "performance",
      severity: "low",
      impactArea: "ux",
      message: "No images use fetchpriority=\"high\" — add this to your hero/LCP image for faster loading",
    });
  }

  return issues;
};

// 45. Image alt text quality
export const checkAltTextQuality: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  let genericAltCount = 0;
  let tooLongAltCount = 0;
  let totalWithAlt = 0;

  const genericPatterns = [
    /^image$/i, /^photo$/i, /^picture$/i, /^img$/i,
    /^untitled$/i, /^screenshot$/i, /^banner$/i,
    /^dsc\d/i, /^img_?\d/i, /^photo_?\d/i,
    /^\d+$/,
  ];

  $("img[alt]").each((_, el) => {
    const alt = ($(el).attr("alt") || "").trim();
    if (!alt) return;

    totalWithAlt++;

    // Check for generic/unhelpful alt text
    if (genericPatterns.some((p) => p.test(alt))) {
      genericAltCount++;
    }

    // Check for overly long alt text (keyword stuffing)
    if (alt.length > 125) {
      tooLongAltCount++;
    }
  });

  if (genericAltCount > 2) {
    issues.push({
      checkId: "generic_alt_text",
      category: "on_page",
      severity: "medium",
      impactArea: "rankings",
      message: `${genericAltCount} images have generic alt text (e.g., "image", "photo") — use descriptive text that conveys the image content`,
      details: { genericAltCount, totalWithAlt },
    });
  }

  if (tooLongAltCount > 2) {
    issues.push({
      checkId: "alt_text_too_long",
      category: "on_page",
      severity: "low",
      impactArea: "rankings",
      message: `${tooLongAltCount} images have alt text over 125 characters — keep alt text concise and descriptive`,
      details: { tooLongAltCount },
    });
  }

  return issues;
};

export const imageChecks: CheckFunction[] = [
  checkImageFormats,
  checkResponsiveImages,
  checkImagePriority,
  checkAltTextQuality,
];
