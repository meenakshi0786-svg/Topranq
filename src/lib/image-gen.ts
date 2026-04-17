// AI featured image generation — uses Nano Banana (Gemini Image) via OpenRouter.
// Falls back to Pollinations.ai if OpenRouter fails.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const OUTPUT_DIR = path.join(process.cwd(), "data", "article-images");
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function generateFeaturedImageUrl(
  prompt: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      const url = await generateWithNanoBanana(apiKey, prompt);
      if (url) return url;
    } catch (err) {
      console.warn("[image-gen] Nano Banana via OpenRouter failed, falling back to Pollinations:", err);
    }
  }
  return generateWithPollinations(prompt);
}

async function generateWithNanoBanana(apiKey: string, prompt: string): Promise<string | null> {
  const enriched = `Generate an image: ${prompt}, editorial blog header, professional photography, high detail, 16:9 aspect ratio, clean modern design`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content: enriched }],
    }),
  });

  if (!res.ok) {
    console.warn(`[image-gen] OpenRouter ${IMAGE_MODEL} error: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;

  // OpenRouter returns images in message.images array
  const images = message?.images as Array<{ type: string; image_url: { url: string } }> | undefined;
  if (!images || images.length === 0) {
    console.warn("[image-gen] No image in response");
    return null;
  }

  const imageUrl = images[0]?.image_url?.url;
  if (!imageUrl || !imageUrl.startsWith("data:image")) {
    console.warn("[image-gen] Invalid image data URL");
    return null;
  }

  // Extract base64 data from data URL
  const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) {
    console.warn("[image-gen] Could not parse base64 from data URL");
    return null;
  }

  const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
  const buffer = Buffer.from(base64Match[2], "base64");

  // Save to persistent volume
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const hash = crypto.createHash("sha1").update(prompt).digest("hex").slice(0, 16);
  const filename = `nb-${hash}.${ext}`;
  const outPath = path.join(OUTPUT_DIR, filename);
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
