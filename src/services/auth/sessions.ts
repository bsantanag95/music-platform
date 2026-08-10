import { and, eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/db";
import { appUser, session, type AppUserRow } from "@/db/schema";

export const SESSION_COOKIE = "music_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(session).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(session).where(eq(session.tokenHash, hashToken(token)));
}

export async function deleteAllSessions(userId: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, userId));
}

export async function resolveSession(): Promise<{ sessionId: string; user: AppUserRow } | null> {
  scheduleSessionCleanup();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ sessionId: session.id, expiresAt: session.expiresAt, user: appUser })
    .from(session)
    .innerJoin(appUser, eq(session.userId, appUser.id))
    .where(eq(session.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt <= new Date()) {
    void deleteExpiredSession(row.sessionId).catch((error) => {
      console.error("No se pudo limpiar la sesión expirada:", error);
    });
    return null;
  }
  return { sessionId: row.sessionId, user: row.user };
}

async function deleteExpiredSession(sessionId: string): Promise<void> {
  await db.delete(session).where(eq(session.id, sessionId));
}

let cleanupInFlight: Promise<void> | null = null;
export async function cleanupExpiredSessions(): Promise<void> {
  if (cleanupInFlight) return cleanupInFlight;
  cleanupInFlight = db
    .delete(session)
    .where(lt(session.expiresAt, new Date()))
    .then(() => undefined)
    .finally(() => {
      cleanupInFlight = null;
    });
  return cleanupInFlight;
}

let cleanupScheduled = false;
export function scheduleSessionCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  const timer = setTimeout(() => {
    cleanupScheduled = false;
    void cleanupExpiredSessions().catch((error) => {
      console.error("No se pudieron limpiar las sesiones expiradas:", error);
    });
  }, 60_000);
  timer.unref?.();
}

export function setSessionCookie(response: Response, token: string): void {
  // Los handlers usan NextResponse, cuya API de cookies está disponible en runtime.
  (response as Response & { cookies: { set: (name: string, value: string, options: object) => void } }).cookies.set(
    SESSION_COOKIE,
    token,
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS / 1000 },
  );
}

export function clearSessionCookie(response: Response): void {
  (response as Response & { cookies: { set: (name: string, value: string, options: object) => void } }).cookies.set(
    SESSION_COOKIE,
    "",
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 },
  );
}

export async function rotateCurrentSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .delete(session)
      .where(and(eq(session.tokenHash, hashToken(token)), eq(session.userId, userId)));
  }
  return createSession(userId);
}
