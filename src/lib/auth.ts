import { db, schema } from "./db";
import { eq } from "drizzle-orm";

// Simple auth for MVP — no Clerk yet.
// Creates a default user on first request, returns their ID.
// In production, replace with Clerk middleware.

const DEFAULT_USER_EMAIL = "demo@ranqapex.com";

export async function getOrCreateUser(): Promise<typeof schema.users.$inferSelect> {
  let user = await db.query.users.findFirst({
    where: eq(schema.users.email, DEFAULT_USER_EMAIL),
  });

  if (!user) {
    const id = crypto.randomUUID();
    db.insert(schema.users)
      .values({
        id,
        email: DEFAULT_USER_EMAIL,
        name: "Demo User",
        plan: "free",
      })
      .run();
    user = await db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
  }

  return user!;
}
