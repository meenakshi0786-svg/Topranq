import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const DEFAULT_USER_EMAIL = "demo@ranqapex.com";

const ADMIN_EMAILS = [
  "majidyusufi@gmail.com",
  "meenakshi.dubey@syvora.com",
  "katapariscontact@gmail.com",
  "meenakshi0786@gmail.com",
  "meesyvora@gmail.com",
];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function canGenerateArticles(user: { email: string; plan: string }): boolean {
  // Admins always have access
  if (isAdmin(user.email)) return true;
  // Paid users have access
  if (user.plan === "dollar1" || user.plan === "dollar5") return true;
  // Free users cannot generate
  return false;
}

export async function getOrCreateUser(): Promise<typeof schema.users.$inferSelect> {
  // Check for logged-in user via cookie
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (user) return user;
  }

  // Fallback: default demo user
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
