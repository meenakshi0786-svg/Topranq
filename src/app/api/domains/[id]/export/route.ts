import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// GET /api/domains/:id/export — Export audit report as downloadable HTML
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Load domain
  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, id),
  });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const hostname = (() => {
    try { return new URL(domain.domainUrl).hostname; } catch { return domain.domainUrl; }
  })();

  // Load latest completed audit
  const audit = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.domainId, id),
    orderBy: desc(schema.auditRuns.createdAt),
  });

  if (!audit || audit.status !== "complete") {
    return NextResponse.json({ error: "No completed audit found" }, { status: 400 });
  }

  // Load issues
  const issues = db
    .select()
    .from(schema.auditIssues)
    .where(eq(schema.auditIssues.auditRunId, audit.id))
    .all();

  // Parse scores
  const scores = audit.scoresJson ? JSON.parse(audit.scoresJson) : null;

  // Group issues by severity
  const critical = issues.filter((i) => i.severity === "critical");
  const high = issues.filter((i) => i.severity === "high");
  const medium = issues.filter((i) => i.severity === "medium");
  const low = issues.filter((i) => i.severity === "low");

  // Generate HTML report
  const html = generateReport({
    hostname,
    domainUrl: domain.domainUrl,
    auditDate: audit.completedAt || audit.createdAt || new Date().toISOString(),
    overallScore: audit.overallScore || 0,
    pagesCrawled: audit.pagesCrawled || 0,
    scores,
    issues: { critical, high, medium, low, total: issues.length },
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="seo-report-${hostname}-${new Date().toISOString().split("T")[0]}.html"`,
    },
  });
}

interface ReportData {
  hostname: string;
  domainUrl: string;
  auditDate: string;
  overallScore: number;
  pagesCrawled: number;
  scores: {
    overall: number;
    categories: Array<{ category: string; label: string; score: number; issueCount: number }>;
  } | null;
  issues: {
    critical: typeof schema.auditIssues.$inferSelect[];
    high: typeof schema.auditIssues.$inferSelect[];
    medium: typeof schema.auditIssues.$inferSelect[];
    low: typeof schema.auditIssues.$inferSelect[];
    total: number;
  };
}

function generateReport(data: ReportData): string {
  const { hostname, domainUrl, auditDate, overallScore, pagesCrawled, scores, issues } = data;
  const date = new Date(auditDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const scoreColor = overallScore >= 80 ? "#30A46C" : overallScore >= 60 ? "#E5890A" : "#E5484D";

  const renderIssueTable = (
    issueList: typeof schema.auditIssues.$inferSelect[],
    severity: string,
    color: string
  ) => {
    if (issueList.length === 0) return "";
    return `
      <div class="section">
        <h2 style="color: ${color};">${severity} Issues (${issueList.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Description</th>
              <th>Affected URLs</th>
            </tr>
          </thead>
          <tbody>
            ${issueList.map((issue) => {
              const urls = issue.affectedUrls ? JSON.parse(issue.affectedUrls) : [];
              return `
                <tr>
                  <td><strong>${escapeHtml(issue.issueType)}</strong></td>
                  <td>${escapeHtml(issue.description)}</td>
                  <td>${urls.length > 0 ? urls.slice(0, 3).map((u: string) => `<code>${escapeHtml(u)}</code>`).join("<br>") + (urls.length > 3 ? `<br><em>+${urls.length - 3} more</em>` : "") : "—"}</td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report — ${escapeHtml(hostname)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1A1A2E; line-height: 1.6; background: #fff; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
    .header { text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 2px solid #EEF1F6; }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .header p { color: #5A6178; font-size: 14px; }
    .score-ring { width: 120px; height: 120px; margin: 24px auto; position: relative; }
    .score-ring svg { transform: rotate(-90deg); }
    .score-value { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .score-value .num { font-size: 36px; font-weight: 700; color: ${scoreColor}; }
    .score-value .label { font-size: 12px; color: #9AA0B4; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 40px; }
    .summary-card { text-align: center; padding: 20px 12px; border-radius: 12px; background: #F5F7FA; }
    .summary-card .count { font-size: 28px; font-weight: 700; }
    .summary-card .lbl { font-size: 12px; color: #5A6178; margin-top: 4px; }
    .categories { margin-bottom: 40px; }
    .cat-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .cat-bar .lbl { width: 160px; font-size: 14px; color: #5A6178; }
    .cat-bar .bar { flex: 1; height: 8px; background: #EEF1F6; border-radius: 4px; overflow: hidden; }
    .cat-bar .bar-fill { height: 100%; border-radius: 4px; }
    .cat-bar .score { width: 40px; text-align: right; font-size: 14px; font-weight: 700; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #EEF1F6; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; background: #F5F7FA; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #5A6178; }
    td { padding: 10px 12px; border-bottom: 1px solid #EEF1F6; vertical-align: top; }
    code { background: #F5F7FA; padding: 2px 6px; border-radius: 4px; font-size: 11px; word-break: break-all; }
    .footer { text-align: center; margin-top: 48px; padding-top: 24px; border-top: 2px solid #EEF1F6; color: #9AA0B4; font-size: 12px; }
    @media print { body { font-size: 11px; } .container { padding: 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SEO Audit Report</h1>
      <p>${escapeHtml(domainUrl)} · ${date} · ${pagesCrawled} pages analyzed</p>
      <div class="score-ring">
        <svg width="120" height="120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#EEF1F6" stroke-width="6"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="${scoreColor}" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${2 * Math.PI * 52}" stroke-dashoffset="${2 * Math.PI * 52 * (1 - overallScore / 100)}"/>
        </svg>
        <div class="score-value">
          <span class="num">${overallScore}</span>
          <span class="label">/100</span>
        </div>
      </div>
    </div>

    <div class="summary">
      <div class="summary-card">
        <div class="count" style="color:#E5484D">${issues.critical.length}</div>
        <div class="lbl">Critical</div>
      </div>
      <div class="summary-card">
        <div class="count" style="color:#E5890A">${issues.high.length}</div>
        <div class="lbl">High</div>
      </div>
      <div class="summary-card">
        <div class="count" style="color:#F0C000">${issues.medium.length}</div>
        <div class="lbl">Medium</div>
      </div>
      <div class="summary-card">
        <div class="count" style="color:#4F6EF7">${issues.low.length}</div>
        <div class="lbl">Low</div>
      </div>
    </div>

    ${scores ? `
    <div class="section categories">
      <h2>Category Breakdown</h2>
      ${scores.categories.map((cat) => {
        const c = cat.score >= 80 ? "#30A46C" : cat.score >= 60 ? "#E5890A" : "#E5484D";
        return `
        <div class="cat-bar">
          <span class="lbl">${escapeHtml(cat.label)}</span>
          <div class="bar"><div class="bar-fill" style="width:${cat.score}%;background:${c}"></div></div>
          <span class="score" style="color:${c}">${cat.score}</span>
        </div>`;
      }).join("")}
    </div>` : ""}

    ${renderIssueTable(issues.critical, "Critical", "#E5484D")}
    ${renderIssueTable(issues.high, "High", "#E5890A")}
    ${renderIssueTable(issues.medium, "Medium", "#F0C000")}
    ${renderIssueTable(issues.low, "Low", "#4F6EF7")}

    <div class="footer">
      <p>Generated by TopRanq SEO Analyzer · ${date}</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
