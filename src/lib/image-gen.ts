// AI featured image generation — uses Nano Banana (Gemini Image) via OpenRouter.
// Falls back to Pollinations.ai if OpenRouter fails.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const OUTPUT_DIR = path.join(process.cwd(), "data", "article-images");
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const CULTURAL_SUBJECT: Record<string, string> = {
  French: "French woman in her late 20s, effortlessly chic Parisian style, natural beauty",
  Spanish: "Spanish woman, Mediterranean features, warm confident expression",
  German: "German woman, Northern European features, understated elegant style",
  Italian: "Italian woman, Milan fashion sensibility, expressive and poised",
  Japanese: "Japanese woman, contemporary Tokyo style, refined and minimal",
  Korean: "Korean woman, modern Seoul aesthetic, clean and polished look",
  Chinese: "Chinese woman, contemporary Shanghai style, sophisticated presence",
  Arabic: "Arab woman, elegant modest fashion, graceful and composed",
  Hindi: "Indian woman, modern professional style, vibrant and confident",
  Turkish: "Turkish woman, Istanbul-inspired fashion, warm and stylish",
  Portuguese: "Brazilian woman, modern São Paulo energy, natural and vibrant",
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
      console.warn("[image-gen] Nano Banana failed, falling back to Pollinations:", err);
    }
  }
  return generateWithPollinations(prompt);
}

async function generateWithNanoBanana(apiKey: string, prompt: string, language?: string): Promise<string | null> {
  const subject = language && language !== "English"
    ? CULTURAL_SUBJECT[language] || "stylish woman, natural and confident"
    : "stylish woman, natural and confident";

  const enriched = `Create an editorial-style lifestyle photograph.

Scene:
${prompt}. A real, lived-in environment that feels authentic — not a studio set. Think magazine editorial shot on location.

Subject:
${subject}. Captured mid-moment doing something natural — not posing for camera. Expression is genuine: focused, calm, or softly smiling. Body language is relaxed and confident.

Mood & Emotion:
Aspirational but approachable. The viewer should think "I want that life" not "that's an ad." Warm, inviting, real.

Lighting:
Natural light as primary source — window light, golden hour, or soft overcast. Subtle warm tone. Soft shadows that add depth. No harsh flash, no ring light, no flat studio lighting.

Composition:
Rule of thirds. Slight depth of field with subject sharp and background gently blurred. Shot at eye level or slightly above. Leave breathing room in the frame — not tightly cropped.

Aesthetic:
Clean, modern, premium. Muted earth tones and soft pastels. Minimal clutter. Every element in frame is intentional. Magazine-quality editorial look.

Details:
Textures matter — fabric weave, natural materials, soft surfaces. Include 1-2 contextual props that tell a story (coffee cup, open book, draped fabric, plant). Background should complement, not compete.

Avoid:
Stock photo look, staged poses, overly polished skin, fake smiles, unnatural lighting, cluttered backgrounds, text overlays, watermarks, logos, borders, corporate feel.

Style:
Shot on DSLR with 85mm f/1.4 lens, realistic, high detail, cinematic depth of field. 16:9 landscape orientation.`;

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
  const enriched = `${prompt}, editorial lifestyle photography, natural light, DSLR 85mm, cinematic depth of field, muted tones, magazine quality, 16:9`;
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

  const environment =
    tone === "technical"
      ? "Modern home office or co-working space. Clean desk with laptop, notebook, and coffee. Minimalist decor, natural wood and white surfaces"
      : tone === "casual"
      ? "Bright café or sunlit living room. Relaxed atmosphere with plants, soft textiles, and warm natural light streaming through windows"
      : "Elegant boutique interior or styled apartment. Curated details — fresh flowers, quality materials, soft neutral palette";

  return `${cleanTitle}. Topic: ${topic}. Environment: ${environment}`;
}
