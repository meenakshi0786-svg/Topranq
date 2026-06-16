import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { generateSeedPrompts } from "@/lib/visibility/seed-prompts";

async function ownDomain(id: string) {
  const user = await getOrCreateUser();
  const domain = await db.query.domains.findFirst({ where: eq(schema.domains.id, id) });
  if (!domain || domain.userId !== user.id) return null;
  return domain;
}

// GET /api/domains/:id/visibility/prompts — list prompts
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ownDomain(id))) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const prompts = db
    .select()
    .from(schema.visibilityPrompts)
    .where(eq(schema.visibilityPrompts.domainId, id))
    .all();
  return NextResponse.json(prompts.map((p) => ({ id: p.id, text: p.text, source: p.source, active: p.active })));
}

// POST /api/domains/:id/visibility/prompts — add a prompt, or { seed: true } to auto-generate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const domain = await ownDomain(id);
  if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  if (body.seed) {
    const seeds = await generateSeedPrompts(id, domain.domainUrl);
    const inserted = seeds.map((text) =>
      db.insert(schema.visibilityPrompts)
        .values({ domainId: id, text, source: "auto", active: true })
        .returning()
        .get(),
    );
    return NextResponse.json(inserted.map((p) => ({ id: p.id, text: p.text, source: p.source, active: p.active })));
  }

  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Missing prompt text" }, { status: 400 });

  const prompt = db
    .insert(schema.visibilityPrompts)
    .values({ domainId: id, text, source: "user", active: true })
    .returning()
    .get();
  return NextResponse.json({ id: prompt.id, text: prompt.text, source: prompt.source, active: prompt.active });
}

// DELETE /api/domains/:id/visibility/prompts — remove a prompt by { promptId }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ownDomain(id))) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const { promptId } = await request.json();
  if (!promptId) return NextResponse.json({ error: "Missing promptId" }, { status: 400 });

  db.delete(schema.visibilityPrompts)
    .where(and(eq(schema.visibilityPrompts.id, promptId), eq(schema.visibilityPrompts.domainId, id)))
    .run();
  return NextResponse.json({ deleted: true });
}
