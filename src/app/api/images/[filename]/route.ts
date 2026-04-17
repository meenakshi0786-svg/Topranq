import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_DIR = path.join(process.cwd(), "data", "article-images");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Sanitize filename to prevent path traversal
  const safe = path.basename(filename);
  const filePath = path.join(IMAGE_DIR, safe);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(safe).toLowerCase();
  const contentType =
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" :
    "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
