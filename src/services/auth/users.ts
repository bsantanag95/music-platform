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

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;

export function sanitizeUsernameFromEmail(localPart: string): string {
  let sanitized = localPart.replace(/[^a-zA-Z0-9_]/g, "");
  if (sanitized.length === 0) sanitized = "user";
  if (sanitized.length < USERNAME_MIN) {
    sanitized = sanitized.padEnd(USERNAME_MIN, "_");
  }
  if (sanitized.length > USERNAME_MAX) {
    sanitized = sanitized.slice(0, USERNAME_MAX);
  }
  return sanitized;
}

export async function findAvailableUsername(base: string): Promise<string> {
  const candidate = sanitizeUsernameFromEmail(base);
  if (!USERNAME_REGEX.test(candidate)) {
    throw new Error("USERNAME_INVALID");
  }

  const [existing] = await db
    .select({ username: appUser.username })
    .from(appUser)
    .where(eq(appUser.username, candidate))
    .limit(1);

  if (!existing) return candidate;

  for (let suffix = 2; suffix <= 1000; suffix++) {
    const withSuffix = `${candidate}${suffix}`;
    if (withSuffix.length > USERNAME_MAX) break;
    const [taken] = await db
      .select({ username: appUser.username })
      .from(appUser)
      .where(eq(appUser.username, withSuffix))
      .limit(1);
    if (!taken) return withSuffix;
  }

  throw new Error("USERNAME_TAKEN");
}

export async function findUserByEmail(email: string) {
  const normalized = email.toLowerCase();
  const [user] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.email, normalized))
    .limit(1);
  return user ?? null;
}
