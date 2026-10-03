import { and, eq, isNull, lt, ne, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/db";
import { appUser, session, type AppUserRow } from "@/db/schema";
import { deviceLabelFromUserAgent } from "@/lib/device-label";

export const SESSION_COOKIE = "music_session";
/** Sesión mantenida: ventana de inactividad, renovada con el uso. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sesión no mantenida: duración fija desde el inicio, sin renovación. */
export const EPHEMERAL_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * Cookie de una sesión mantenida: el tope que aplican los navegadores. Como los
 * Server Components no pueden reescribir la cookie, la validez la decide siempre
 * `session.expires_at`; una cookie sin sesión vigente no autentica (ADR 0026).
 */
export const REMEMBER_COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60;
/** La última actividad de una sesión se escribe como mucho una vez por ventana. */
export const LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Etiqueta del dispositivo desde el User-Agent de la petición en curso. Fuera de
// una petición (scripts, tests) no hay encabezados: la sesión queda sin etiqueta.
async function currentDeviceLabel(): Promise<string | null> {
  try {
    return deviceLabelFromUserAgent((await headers()).get("user-agent"));
  } catch {
    return null;
  }
}

export interface SessionOptions {
  /** Mantener la sesión en el dispositivo (por defecto sí). */
  remember?: boolean;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
  remember: boolean;
}

export async function createSession(userId: string, options: SessionOptions = {}): Promise<CreatedSession> {
  const remember = options.remember ?? true;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? SESSION_TTL_MS : EPHEMERAL_SESSION_TTL_MS));
  await db.insert(session).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    deviceLabel: await currentDeviceLabel(),
    lastSeenAt: new Date(),
    remember,
  });
  return { token, expiresAt, remember };
}

export async function deleteSessionByToken(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(session).where(eq(session.tokenHash, hashToken(token)));
}

export async function deleteAllSessions(userId: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, userId));
}

/** Cierra todas las sesiones de la persona salvo la indicada (la actual). */
export async function deleteOtherSessions(userId: string, keepSessionId: string): Promise<void> {
  await db.delete(session).where(and(eq(session.userId, userId), ne(session.id, keepSessionId)));
}

export interface ResolvedSession {
  sessionId: string;
  /** Cuándo se inició esta sesión: base de la "autenticación reciente". */
  sessionCreatedAt: Date;
  user: AppUserRow;
}

export async function resolveSession(): Promise<ResolvedSession | null> {
  scheduleSessionCleanup();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      sessionId: session.id,
      sessionCreatedAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      remember: session.remember,
      user: appUser,
    })
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
  touchLastSeen(row.sessionId, row.lastSeenAt, row.remember);
  return { sessionId: row.sessionId, sessionCreatedAt: row.sessionCreatedAt, user: row.user };
}

// Última actividad de la sesión, escrita como mucho una vez por ventana para no
// convertir cada petición en una escritura. Una sesión mantenida aprovecha la misma
// escritura para extender su vencimiento (ventana deslizante); `created_at` no se
// toca, así que la autenticación reciente no cambia. El WHERE repite el umbral para
// que dos peticiones simultáneas no escriban dos veces. No bloquea la respuesta.
function touchLastSeen(sessionId: string, lastSeenAt: Date | null, remember: boolean): void {
  const now = Date.now();
  if (lastSeenAt && now - lastSeenAt.getTime() < LAST_SEEN_THROTTLE_MS) return;
  const threshold = new Date(now - LAST_SEEN_THROTTLE_MS);
  void db
    .update(session)
    .set(
      remember
        ? { lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_TTL_MS) }
        : { lastSeenAt: new Date(now) },
    )
    .where(and(eq(session.id, sessionId), or(isNull(session.lastSeenAt), lt(session.lastSeenAt, threshold))))
    .catch((error) => {
      console.error("No se pudo registrar la última actividad de la sesión:", error);
    });
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

export function setSessionCookie(response: Response, token: string, remember = true): void {
  // Los handlers usan NextResponse, cuya API de cookies está disponible en runtime.
  // Sin `maxAge` es una cookie de sesión: el navegador la descarta al cerrarse.
  (response as Response & { cookies: { set: (name: string, value: string, options: object) => void } }).cookies.set(
    SESSION_COOKIE,
    token,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      ...(remember ? { maxAge: REMEMBER_COOKIE_MAX_AGE_S } : {}),
    },
  );
}

export function clearSessionCookie(response: Response): void {
  (response as Response & { cookies: { set: (name: string, value: string, options: object) => void } }).cookies.set(
    SESSION_COOKIE,
    "",
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 },
  );
}

// Sin `remember` explícito la nueva sesión hereda la elección de la que reemplaza
// (reautenticar no convierte una sesión efímera en persistente); sin sesión previa,
// es mantenida.
export async function rotateCurrentSession(userId: string, options: SessionOptions = {}): Promise<CreatedSession> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let replacedRemember: boolean | undefined;
  if (token) {
    const [replaced] = await db
      .delete(session)
      .where(and(eq(session.tokenHash, hashToken(token)), eq(session.userId, userId)))
      .returning({ remember: session.remember });
    replacedRemember = replaced?.remember;
  }
  return createSession(userId, { remember: options.remember ?? replacedRemember ?? true });
}
