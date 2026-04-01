import type { CheckFunction, SEOIssue } from "../types";

// 1. Security headers check
export const checkSecurityHeaders: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.headers) return issues;

  const headers = Object.fromEntries(
    Object.entries(page.headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  // Strict-Transport-Security (HSTS)
  if (page.url.startsWith("https://") && !headers["strict-transport-security"]) {
    issues.push({
      checkId: "missing_hsts",
      category: "technical",
      severity: "medium",
      impactArea: "rankings",
      message: "Missing Strict-Transport-Security (HSTS) header",
    });
  }

  // X-Content-Type-Options
  if (!headers["x-content-type-options"]) {
    issues.push({
      checkId: "missing_content_type_options",
      category: "technical",
      severity: "low",
      impactArea: "ux",
      message: "Missing X-Content-Type-Options header — browsers may MIME-sniff responses",
    });
  }

  // X-Frame-Options or Content-Security-Policy frame-ancestors
  const csp = headers["content-security-policy"] || "";
  if (!headers["x-frame-options"] && !csp.includes("frame-ancestors")) {
    issues.push({
      checkId: "missing_frame_protection",
      category: "technical",
      severity: "medium",
      impactArea: "ux",
      message: "No clickjacking protection — missing X-Frame-Options or CSP frame-ancestors",
    });
  }

  // Content-Security-Policy
  if (!csp) {
    issues.push({
      checkId: "missing_csp",
      category: "technical",
      severity: "low",
      impactArea: "ux",
      message: "Missing Content-Security-Policy header — consider adding to prevent XSS attacks",
    });
  }

  // Referrer-Policy
  if (!headers["referrer-policy"]) {
    issues.push({
      checkId: "missing_referrer_policy",
      category: "technical",
      severity: "low",
      impactArea: "ux",
      message: "Missing Referrer-Policy header — sensitive URL data may leak to third parties",
    });
  }

  // Permissions-Policy (formerly Feature-Policy)
  if (!headers["permissions-policy"] && !headers["feature-policy"]) {
    issues.push({
      checkId: "missing_permissions_policy",
      category: "technical",
      severity: "low",
      impactArea: "ux",
      message: "Missing Permissions-Policy header — browser features like camera/mic are not restricted",
    });
  }

  return issues;
};

// 2. Check for server information leakage
export const checkServerLeakage: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.headers) return issues;

  const headers = Object.fromEntries(
    Object.entries(page.headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  // Server header revealing version info
  const server = headers["server"] || "";
  if (server && /\d+\.\d+/.test(server)) {
    issues.push({
      checkId: "server_version_exposed",
      category: "technical",
      severity: "low",
      impactArea: "ux",
      message: `Server header exposes version info: "${server}" — remove version numbers`,
      details: { server },
    });
  }

  // X-Powered-By header
  if (headers["x-powered-by"]) {
    issues.push({
      checkId: "powered_by_exposed",
      category: "technical",
      severity: "low",
      impactArea: "ux",
      message: `X-Powered-By header exposes technology: "${headers["x-powered-by"]}" — remove it`,
      details: { poweredBy: headers["x-powered-by"] },
    });
  }

  return issues;
};

export const securityChecks: CheckFunction[] = [
  checkSecurityHeaders,
  checkServerLeakage,
];
