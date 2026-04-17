/**
 * Compose a single hero image from 5 product photos.
 * Layout: 1 large on the left (600×630) + 2×2 grid of 4 on the right (each 300×315).
 * Output: 1200×630 JPEG saved to /public/article-images/<hash>.jpg.
 */

import sharp from "sharp";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "data", "article-images");
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
  const publicUrl = `/api/images/${filename}`;

  if (fs.existsSync(outPath)) {
    return { url: publicUrl, path: outPath, productsUsed: Math.min(imageUrls.length, 5) };
  }

  // Fetch up to 5 images
  const buffers = await Promise.all(imageUrls.slice(0, 5).map(fetchImage));
  const valid = buffers.filter((b): b is Buffer => b !== null);
  if (valid.length === 0) return null;

  // Pick a layout that matches how many relevant products we actually got.
  // Never pad with repeats — fewer, relevant cells beats a wall of duplicates.
  const cells = layoutFor(valid.length);
  const resized = await Promise.all(
    valid.slice(0, cells.length).map((buf, i) => resizeCover(buf, cells[i].w, cells[i].h)),
  );

  await sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 3,
      background: BACKGROUND,
    },
  })
    .composite(
      resized.map((input, i) => ({ input, left: cells[i].x, top: cells[i].y })),
    )
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outPath);

  return { url: publicUrl, path: outPath, productsUsed: valid.length };
}

interface Cell { x: number; y: number; w: number; h: number }

function layoutFor(count: number): Cell[] {
  const W = OUTPUT_WIDTH;
  const H = OUTPUT_HEIGHT;
  switch (count) {
    case 1:
      return [{ x: 0, y: 0, w: W, h: H }];
    case 2:
      return [
        { x: 0, y: 0, w: W / 2, h: H },
        { x: W / 2, y: 0, w: W / 2, h: H },
      ];
    case 3:
      // 1 big left, 2 stacked right
      return [
        { x: 0, y: 0, w: W / 2, h: H },
        { x: W / 2, y: 0, w: W / 2, h: H / 2 },
        { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
      ];
    case 4:
      // 2×2 grid
      return [
        { x: 0, y: 0, w: W / 2, h: H / 2 },
        { x: W / 2, y: 0, w: W / 2, h: H / 2 },
        { x: 0, y: H / 2, w: W / 2, h: H / 2 },
        { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
      ];
    default:
      // 5: 1 big left + 2×2 grid right
      return [
        { x: 0, y: 0, w: LEFT_WIDTH, h: OUTPUT_HEIGHT },
        { x: LEFT_WIDTH, y: 0, w: RIGHT_CELL_WIDTH, h: RIGHT_CELL_HEIGHT },
        { x: LEFT_WIDTH + RIGHT_CELL_WIDTH, y: 0, w: RIGHT_CELL_WIDTH, h: RIGHT_CELL_HEIGHT },
        { x: LEFT_WIDTH, y: RIGHT_CELL_HEIGHT, w: RIGHT_CELL_WIDTH, h: RIGHT_CELL_HEIGHT },
        { x: LEFT_WIDTH + RIGHT_CELL_WIDTH, y: RIGHT_CELL_HEIGHT, w: RIGHT_CELL_WIDTH, h: RIGHT_CELL_HEIGHT },
      ];
  }
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
