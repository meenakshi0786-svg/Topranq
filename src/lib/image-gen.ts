// AI featured image generation — uses Nano Banana (Google Gemini Image API).
// Falls back to Pollinations.ai if Gemini API key is not set.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
// Save to data/ volume (persists across docker rebuilds), served via /api/images/[filename]
const OUTPUT_DIR = path.join(process.cwd(), "data", "article-images");
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function generateFeaturedImageUrl(
  prompt: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const url = await generateWithNanoBanana(apiKey, prompt);
      if (url) return url;
    } catch (err) {
      console.warn("[image-gen] Nano Banana failed, falling back to Pollinations:", err);
    }
  }
  return generateWithPollinations(prompt);
}

async function generateWithNanoBanana(apiKey: string, prompt: string): Promise<string | null> {
  const enriched = `${prompt}, editorial blog header, professional photography, high detail, 16:9 aspect ratio, clean modern design`;

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: enriched }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn(`[image-gen] Gemini API error ${res.status}:`, errText.slice(0, 200));
    return null;
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart?.inlineData?.data) return null;

  // Save base64 image to disk
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const hash = crypto.createHash("sha1").update(prompt).digest("hex").slice(0, 16);
  const ext = imagePart.inlineData.mimeType === "image/jpeg" ? "jpg" : "png";
  const filename = `nb-${hash}.${ext}`;
  const outPath = path.join(OUTPUT_DIR, filename);

  const buffer = Buffer.from(imagePart.inlineData.data, "base64");
  fs.writeFileSync(outPath, buffer);

  return `/api/images/${filename}`;
}

function generateWithPollinations(prompt: string): string {
  const enriched = `${prompt}, editorial blog header, cinematic lighting, professional photography, high detail, 16:9`;
  const params = new URLSearchParams({
    width: "1200",
    height: "630",
    model: "flux",
    nologo: "true",
    enhance: "true",
  });
  return `${POLLINATIONS_BASE}/${encodeURIComponent(enriched)}?${params.toString()}`;
}

export function buildImagePrompt(
  title: string,
  topic: string,
  tone: string
): string {
  const cleanTitle = title.replace(/["']/g, "").slice(0, 120);
  const style =
    tone === "technical"
      ? "minimalist flat design, data visualization"
      : tone === "casual"
      ? "bright warm colors, lifestyle photography"
      : "modern editorial, clean composition";
  return `${cleanTitle} — ${topic}, ${style}`;
}
