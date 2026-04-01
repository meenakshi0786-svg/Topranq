import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();

  const job = await db.query.agentJobs.findFirst({
    where: eq(schema.agentJobs.id, id),
  });

  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...job,
    config: job.configJson ? JSON.parse(job.configJson) : null,
    output: job.outputJson ? JSON.parse(job.outputJson) : null,
    configJson: undefined,
    outputJson: undefined,
  });
}
