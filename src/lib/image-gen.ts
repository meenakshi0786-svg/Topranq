// AI featured image generation — uses Nano Banana (Gemini Image) via OpenRouter.
// Falls back to Pollinations.ai if OpenRouter fails.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const OUTPUT_DIR = path.join(process.cwd(), "data", "article-images");
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

// Map language to cultural context for image generation
const CULTURAL_CONTEXT: Record<string, string> = {
  French: "French woman, Parisian style, European fashion, warm Mediterranean lighting",
  Spanish: "Spanish woman, Mediterranean style, warm natural lighting",
  German: "German woman, Northern European style, clean Scandinavian lighting",
  Italian: "Italian woman, Milan fashion style, golden hour Mediterranean lighting",
  Japanese: "Japanese woman, Tokyo street style, soft ambient lighting",
  Korean: "Korean woman, Seoul fashion style, soft natural lighting",
  Chinese: "Chinese woman, modern Shanghai style, elegant ambient lighting",
  Arabic: "Arab woman, elegant modest fashion, warm golden lighting",
  Hindi: "Indian woman, modern Delhi style, vibrant warm lighting",
  Turkish: "Turkish woman, Istanbul fashion, warm natural lighting",
  Portuguese: "Brazilian woman, modern São Paulo style, tropical warm lighting",
};

export async function generateFeaturedImageUrl(
  prompt: string,
  language?: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      const url = await generateWithNanoBanana(apiKey, prompt, language);
      if (url) return url;
    } catch (err) {
      console.warn("[image-gen] Nano Banana via OpenRouter failed, falling back to Pollinations:", err);
    }
  }
  return generateWithPollinations(prompt);
}

async function generateWithNanoBanana(apiKey: string, prompt: string, language?: string): Promise<string | null> {
  const cultural = language && language !== "English" ? CULTURAL_CONTEXT[language] || "" : "";

  const enriched = `Create a high-quality editorial lifestyle photograph for a fashion/lifestyle blog.

SCENE: ${prompt}
${cultural ? `CULTURAL CONTEXT: ${cultural}` : ""}

PHOTOGRAPHY STYLE:
- Professional editorial photography, NOT stock photo
- Shot on Canon EOS R5 with 85mm f/1.4 lens
- Natural soft lighting, slightly warm tone
- Shallow depth of field with subject in sharp focus
- Clean, uncluttered background (neutral wall, studio, or elegant interior)
- Model should look natural, confident, and editorial — NOT posed or artificial
- Color palette: muted earth tones, soft pastels, warm neutrals
- Composition: rule of thirds, slightly off-center subject
- 16:9 aspect ratio, landscape orientation
- High resolution, magazine quality
- NO text, NO watermarks, NO logos, NO borders`;

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

  const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) {
    console.warn("[image-gen] Could not parse base64 from data URL");
    return null;
  }

  const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
  const buffer = Buffer.from(base64Match[2], "base64");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const hash = crypto.createHash("sha1").update(prompt + (language || "")).digest("hex").slice(0, 16);
  const filename = `nb-${hash}.${ext}`;
  const outPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outPath, buffer);

  return `/api/images/${filename}`;
}

function generateWithPollinations(prompt: string): string {
  const enriched = `${prompt}, editorial fashion photography, soft natural lighting, professional magazine quality, 16:9`;
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
  tone: string,
  language?: string,
): string {
  const cleanTitle = title.replace(/["']/g, "").slice(0, 120);

  // Build a scene description, not just keywords
  const cultural = language && language !== "English" ? CULTURAL_CONTEXT[language] || "" : "";
  const style =
    tone === "technical"
      ? "professional workspace, minimalist desk setup, clean modern environment"
      : tone === "casual"
      ? "relaxed lifestyle setting, natural daylight, warm casual atmosphere"
      : "elegant editorial setting, sophisticated interior, soft natural light";

  return `${cleanTitle}. ${topic}. ${style}${cultural ? `. Model: ${cultural}` : ""}`;
}
