import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";
import type { RegisterRequest } from "@/lib/api/schemas";

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function registerUser(input: RegisterRequest) {
  try {
    const [user] = await db
      .insert(appUser)
      .values({ username: input.username, email: input.email, passwordHash: await hashPassword(input.password) })
      .returning();
    return user;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const [existing] = await db
        .select({ username: appUser.username, email: appUser.email })
        .from(appUser)
        .where(or(eq(appUser.username, input.username), eq(appUser.email, input.email)))
        .limit(1);
      if (existing?.username === input.username) throw new Error("USERNAME_TAKEN");
      throw new Error("EMAIL_TAKEN");
    }
    throw error;
  }
}

export async function authenticateUser(identifier: string, password: string) {
  const normalized = identifier.toLowerCase();
  const [user] = await db
    .select()
    .from(appUser)
    .where(or(eq(appUser.email, normalized), eq(appUser.username, identifier)))
    .limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, password))) return null;
  return user;
}
