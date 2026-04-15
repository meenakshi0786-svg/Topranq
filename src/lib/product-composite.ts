/**
 * Compose a single hero image from 5 product photos.
 * Layout: 1 large on the left (600×630) + 2×2 grid of 4 on the right (each 300×315).
 * Output: 1200×630 JPEG saved to /public/article-images/<hash>.jpg.
 */

import sharp from "sharp";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "article-images");
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 630;
const LEFT_WIDTH = 600;
const RIGHT_CELL_WIDTH = 300;
const RIGHT_CELL_HEIGHT = 315;
const FETCH_TIMEOUT_MS = 10000;
const BACKGROUND = { r: 245, g: 247, b: 250, alpha: 1 };

export interface CompositeResult {
  url: string;
  path: string;
  productsUsed: number;
}

export async function composeProductHero(
  imageUrls: string[],
  cacheKey: string,
): Promise<CompositeResult | null> {
  if (imageUrls.length === 0) return null;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const hash = crypto.createHash("sha1").update(cacheKey + imageUrls.join("|")).digest("hex").slice(0, 16);
  const filename = `${hash}.jpg`;
  const outPath = path.join(OUTPUT_DIR, filename);
  const publicUrl = `/article-images/${filename}`;

  if (fs.existsSync(outPath)) {
    return { url: publicUrl, path: outPath, productsUsed: Math.min(imageUrls.length, 5) };
  }

  // Fetch up to 5 images
  const buffers = await Promise.all(
    imageUrls.slice(0, 5).map(fetchImage),
  );
  const valid = buffers.filter((b): b is Buffer => b !== null);
  if (valid.length === 0) return null;

  // Pad by cycling if fewer than 5 loaded
  const images: Buffer[] = [];
  for (let i = 0; i < 5; i++) images.push(valid[i % valid.length]);

  // Resize each to its target cell size
  const [bigBuf, ...smallBufs] = await Promise.all([
    resizeCover(images[0], LEFT_WIDTH, OUTPUT_HEIGHT),
    resizeCover(images[1], RIGHT_CELL_WIDTH, RIGHT_CELL_HEIGHT),
    resizeCover(images[2], RIGHT_CELL_WIDTH, RIGHT_CELL_HEIGHT),
    resizeCover(images[3], RIGHT_CELL_WIDTH, RIGHT_CELL_HEIGHT),
    resizeCover(images[4], RIGHT_CELL_WIDTH, RIGHT_CELL_HEIGHT),
  ]);

  await sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 3,
      background: BACKGROUND,
    },
  })
    .composite([
      { input: bigBuf, left: 0, top: 0 },
      { input: smallBufs[0], left: LEFT_WIDTH, top: 0 },
      { input: smallBufs[1], left: LEFT_WIDTH + RIGHT_CELL_WIDTH, top: 0 },
      { input: smallBufs[2], left: LEFT_WIDTH, top: RIGHT_CELL_HEIGHT },
      { input: smallBufs[3], left: LEFT_WIDTH + RIGHT_CELL_WIDTH, top: RIGHT_CELL_HEIGHT },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outPath);

  return { url: publicUrl, path: outPath, productsUsed: valid.length };
}

async function fetchImage(url: string): Promise<Buffer | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RanqapexBot/1.0; +https://ranqapex.com)",
      },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resizeCover(buf: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(buf)
    .resize(width, height, { fit: "cover", position: "attention" })
    .toBuffer();
}
