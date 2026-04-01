import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || ""; // Gmail App Password
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@topranq.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

function getTransport() {
  if (!SMTP_USER || !SMTP_PASS) {
    // Dev fallback: log to console instead of sending
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface ReviewEmailData {
  to: string;
  articleTitle: string;
  targetKeyword: string;
  intent: string;
  wordCount: number;
  qualityScore: number;
  previewText: string; // first ~300 words
  reviewToken: string;
}

export async function sendReviewEmail(data: ReviewEmailData): Promise<boolean> {
  const reviewUrl = `${APP_URL}/review/${data.reviewToken}`;

  const subject = `TopRanq draft ready: ${data.articleTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4F6EF7,#7C5CFC);padding:32px 32px 24px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Your Draft Is Ready</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Review and approve to publish</p>
    </div>

    <!-- Summary -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a2e;">${escapeHtml(data.articleTitle)}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0;">Target Keyword</td>
          <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;border-bottom:1px solid #f0f0f0;">${escapeHtml(data.targetKeyword)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0;">Intent</td>
          <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;border-bottom:1px solid #f0f0f0;">${escapeHtml(data.intent)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0;">Word Count</td>
          <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right;border-bottom:1px solid #f0f0f0;">${data.wordCount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;font-size:13px;">Quality Score</td>
          <td style="padding:8px 0;font-size:13px;font-weight:600;color:${data.qualityScore >= 80 ? '#22c55e' : data.qualityScore >= 60 ? '#f59e0b' : '#ef4444'};text-align:right;">${data.qualityScore}/100</td>
        </tr>
      </table>

      <!-- Preview -->
      <div style="background:#f8f9fc;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999;">Preview</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#444;">${escapeHtml(data.previewText)}...</p>
      </div>

      <!-- Buttons -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${reviewUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;margin-right:12px;">Accept Draft</a>
        <a href="${reviewUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;">Request Rework</a>
      </div>
      <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#999;">
        Or copy this link: <a href="${reviewUrl}" style="color:#4F6EF7;">${reviewUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f8f9fc;text-align:center;">
      <p style="margin:0;font-size:11px;color:#999;">This link expires in 72 hours. Sent by TopRanq.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `TopRanq Draft Ready: ${data.articleTitle}

Keyword: ${data.targetKeyword}
Intent: ${data.intent}
Word Count: ${data.wordCount}
Quality: ${data.qualityScore}/100

Preview:
${data.previewText}...

Review your article: ${reviewUrl}

This link expires in 72 hours.`;

  const transport = getTransport();
  if (!transport) {
    console.log("[EMAIL] SMTP not configured. Review URL:", reviewUrl);
    console.log("[EMAIL] Subject:", subject);
    return true; // Succeed silently in dev
  }

  try {
    await transport.sendMail({
      from: `"TopRanq" <${FROM_EMAIL}>`,
      to: data.to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
    return false;
  }
}

export async function sendPublishErrorEmail(to: string, articleTitle: string, error: string): Promise<boolean> {
  const transport = getTransport();
  const subject = `TopRanq publish failed: ${articleTitle}`;
  const text = `Publishing failed for "${articleTitle}".\n\nError: ${error}\n\nPlease check your connector settings and try again from the dashboard.`;

  if (!transport) {
    console.log("[EMAIL] Publish error notification:", subject);
    return true;
  }

  try {
    await transport.sendMail({
      from: `"TopRanq" <${FROM_EMAIL}>`,
      to,
      subject,
      text,
    });
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
