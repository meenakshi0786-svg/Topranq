import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getOrCreateUser();
  const domainId = request.nextUrl.searchParams.get("domainId");

  if (!domainId) {
    return NextResponse.json({ error: "Missing domainId" }, { status: 400 });
  }

  const jobs = db
    .select()
    .from(schema.agentJobs)
    .where(and(
      eq(schema.agentJobs.domainId, domainId),
      eq(schema.agentJobs.userId, user.id)
    ))
    .orderBy(desc(schema.agentJobs.createdAt))
    .limit(50)
    .all();

  // Parse JSON fields
  const parsed = jobs.map((job) => ({
    ...job,
    config: job.configJson ? JSON.parse(job.configJson) : null,
    output: job.outputJson ? JSON.parse(job.outputJson) : null,
    configJson: undefined,
    outputJson: undefined,
  }));

  return NextResponse.json(parsed);
}
