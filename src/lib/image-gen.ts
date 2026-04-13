// AI featured image generation — uses Pollinations.ai (free, no key required).
// Returns a stable URL that serves the generated PNG directly on first load.

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

interface ImageOptions {
  width?: number;
  height?: number;
  model?: "flux" | "turbo";
  seed?: number;
}

export function generateFeaturedImageUrl(
  prompt: string,
  opts: ImageOptions = {}
): string {
  const { width = 1200, height = 630, model = "flux", seed } = opts;

  // Enrich prompt for better results — cinematic/editorial style
  const enriched = `${prompt}, editorial blog header, cinematic lighting, professional photography, high detail, 16:9`;

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    nologo: "true",
    enhance: "true",
  });
  if (seed !== undefined) params.set("seed", String(seed));

  return `${POLLINATIONS_BASE}/${encodeURIComponent(enriched)}?${params.toString()}`;
}

// Build a concise image prompt from article metadata
export function buildImagePrompt(
  title: string,
  topic: string,
  tone: string
): string {
  // Strip punctuation/quotes that confuse image models
  const cleanTitle = title.replace(/["']/g, "").slice(0, 120);
  const style =
    tone === "technical"
      ? "minimalist flat design, data visualization"
      : tone === "casual"
      ? "bright warm colors, lifestyle photography"
      : "modern editorial, clean composition";
  return `${cleanTitle} — ${topic}, ${style}`;
}
