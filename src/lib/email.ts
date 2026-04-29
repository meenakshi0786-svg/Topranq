import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || ""; // Gmail App Password
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@ranqapex.com";
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

  const subject = `Ranqapex draft ready: ${data.articleTitle}`;

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
      <p style="margin:0;font-size:11px;color:#999;">This link expires in 72 hours. Sent by Ranqapex.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Ranqapex Draft Ready: ${data.articleTitle}

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
      from: `"Ranqapex" <${FROM_EMAIL}>`,
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
  const subject = `Ranqapex publish failed: ${articleTitle}`;
  const text = `Publishing failed for "${articleTitle}".\n\nError: ${error}\n\nPlease check your connector settings and try again from the dashboard.`;

  if (!transport) {
    console.log("[EMAIL] Publish error notification:", subject);
    return true;
  }

  try {
    await transport.sendMail({
      from: `"Ranqapex" <${FROM_EMAIL}>`,
      to,
      subject,
      text,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendPaymentConfirmationEmail(
  to: string,
  userName: string,
  plan: "dollar1" | "dollar5",
  paymentId: string,
): Promise<boolean> {
  const planName = plan === "dollar1" ? "$1 Plan (Sonnet)" : "$5 Plan (Opus)";
  const articles = plan === "dollar1" ? 10 : 15;
  const amount = plan === "dollar1" ? "$1" : "$5";
  const telegramLink = "https://t.me/+zoz0403pg_45NTFl";

  const subject = `Payment Successful — ${planName}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 32px 24px;text-align:center;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:28px;">&#10003;</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Payment Successful!</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Thank you for choosing Ranqapex</p>
    </div>

    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#1a1a2e;margin:0 0 20px;">Hi ${escapeHtml(userName || "there")},</p>
      <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px;">
        Your payment of <strong>${amount}</strong> has been confirmed. Here are your plan details:
      </p>

      <div style="background:#f8f9fc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;color:#666;font-size:13px;border-bottom:1px solid #e5e7eb;">Plan</td>
            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #e5e7eb;">${planName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#666;font-size:13px;border-bottom:1px solid #e5e7eb;">Amount Paid</td>
            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#22c55e;text-align:right;border-bottom:1px solid #e5e7eb;">${amount}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#666;font-size:13px;border-bottom:1px solid #e5e7eb;">Articles Included</td>
            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #e5e7eb;">${articles} articles</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#666;font-size:13px;border-bottom:1px solid #e5e7eb;">Validity</td>
            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #e5e7eb;">30 days</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#666;font-size:13px;">Payment ID</td>
            <td style="padding:10px 0;font-size:11px;font-weight:500;color:#999;text-align:right;">${escapeHtml(paymentId)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4F6EF7,#7C5CFC);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;">Go to Dashboard</a>
      </div>

      <div style="background:#eef2ff;border-radius:12px;padding:16px;text-align:center;margin-bottom:8px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4F6EF7;">Join our Telegram community</p>
        <p style="margin:0 0 12px;font-size:12px;color:#666;">Get tips, updates, and direct support from the team.</p>
        <a href="${telegramLink}" style="display:inline-block;background:#0088cc;color:#fff;text-decoration:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;">Join Telegram Group</a>
      </div>
    </div>

    <div style="padding:16px 32px;background:#f8f9fc;text-align:center;">
      <p style="margin:0;font-size:11px;color:#999;">Need help? Contact us at ranqapexcontact@gmail.com</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Payment Successful — ${planName}

Hi ${userName || "there"},

Your payment of ${amount} has been confirmed.

Plan: ${planName}
Articles: ${articles}
Validity: 30 days
Payment ID: ${paymentId}

Dashboard: ${APP_URL}/dashboard

Join our Telegram community: ${telegramLink}

Need help? Contact ranqapexcontact@gmail.com`;

  const transport = getTransport();
  if (!transport) {
    console.log("[EMAIL] Payment confirmation (SMTP not configured):", subject);
    return true;
  }

  try {
    await transport.sendMail({
      from: `"Ranqapex" <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL] Payment confirmation sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send payment confirmation:", error);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
