export {};

// Smoke test del cambio add-keep-signed-in: sesión mantenida / no mantenida contra
// Postgres REAL (el SQL que las pruebas unitarias mockean): la migración 0058, la
// duración de cada tipo, la renovación por uso de las mantenidas (sin tocar
// `created_at`), que las no mantenidas no se renuevan y caducan, la rotación que
// conserva la elección y que una sesión anterior a la columna queda como mantenida.
// Escribe un usuario `smoke_keep_*` y lo borra al terminar (ON DELETE CASCADE limpia
// sus sesiones). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_keep_%';
// Correr idealmente contra una BD de scratch (migración 0058 aplicada):
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-keep-signed-in.ts

import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, session } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const cookieJar = new Map<string, string>();
const createdUserIds: string[] = [];
const hour = 60 * 60 * 1000;
const day = 24 * hour;

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

const near = (actual: Date, expectedMs: number, toleranceMs = 2 * 60 * 1000) =>
  Math.abs(actual.getTime() - expectedMs) <= toleranceMs;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function rowOf(token: string) {
  const [row] = await db.select().from(session).where(eq(session.tokenHash, hashToken(token)));
  return row;
}

// La renovación se escribe sin bloquear la respuesta: se espera a que aparezca.
async function waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  let value = await read();
  for (let attempt = 0; attempt < 40 && !done(value); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    value = await read();
  }
  return value;
}

async function loadServices() {
  const req = createRequire(import.meta.url);
  const nodeModule = req("node:module") as {
    _load: (request: string, parent: object | null, isMain: boolean) => unknown;
  };
  const originalLoad = nodeModule._load;
  nodeModule._load = function (request, parent, isMain) {
    if (request === "next/headers") {
      return {
        cookies: async () => ({
          get: (name: string) => {
            const value = cookieJar.get(name);
            return value === undefined ? undefined : { value };
          },
        }),
        headers: async () => new Headers({ "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0" }),
        draftMode: async () => ({ isEnabled: false }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const [users, sessions] = await Promise.all([
    import("../src/services/auth/users"),
    import("../src/services/auth/sessions"),
  ]);
  return { users, sessions };
}

async function main() {
  const { users, sessions } = await loadServices();
  const { SESSION_COOKIE } = sessions;

  const created = await users.registerUser({
    username: `smoke_keep_${suffix}`,
    email: `smoke-keep-${suffix}@example.test`,
    password: "smoke-password-123",
  });
  if (!created) throw new Error("no se creó el usuario");
  createdUserIds.push(created.id);
  const userId = created.id;

  try {
    console.log("\n1) Duración de cada tipo de sesión");
    const kept = await sessions.createSession(userId, { remember: true });
    const keptRow = await rowOf(kept.token);
    check(keptRow?.remember === true, "la sesión mantenida guarda remember = true");
    check(keptRow !== undefined && near(keptRow.expiresAt, Date.now() + 30 * day), "la mantenida caduca a los 30 días");

    const ephemeral = await sessions.createSession(userId, { remember: false });
    const ephemeralRow = await rowOf(ephemeral.token);
    check(ephemeralRow?.remember === false, "la no mantenida guarda remember = false");
    check(ephemeralRow !== undefined && near(ephemeralRow.expiresAt, Date.now() + 24 * hour), "la no mantenida caduca a las 24 horas");

    const byDefault = await sessions.createSession(userId);
    check((await rowOf(byDefault.token))?.remember === true, "sin elección la sesión es mantenida");

    console.log("\n2) Renovación por uso");
    const [oldCreatedAt] = [keptRow!.createdAt];
    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() + 5 * day), lastSeenAt: new Date(Date.now() - hour) })
      .where(eq(session.id, keptRow!.id));
    cookieJar.set(SESSION_COOKIE, kept.token);
    const resolved = await sessions.resolveSession();
    check(resolved?.sessionId === keptRow!.id, "la sesión mantenida se resuelve");
    const renewed = await waitFor(() => rowOf(kept.token), (row) => (row?.expiresAt.getTime() ?? 0) > Date.now() + 20 * day);
    check(renewed !== undefined && near(renewed.expiresAt, Date.now() + 30 * day), "el uso extiende el vencimiento a 30 días desde ahora");
    check(renewed?.createdAt.getTime() === oldCreatedAt.getTime(), "la renovación no modifica created_at (la autenticación reciente no cambia)");
    check(renewed !== undefined && renewed.lastSeenAt !== null && renewed.lastSeenAt.getTime() > Date.now() - 60_000, "se registra la última actividad");

    const before = renewed!.expiresAt.getTime();
    await sessions.resolveSession();
    await new Promise((resolve) => setTimeout(resolve, 300));
    check((await rowOf(kept.token))?.expiresAt.getTime() === before, "otra petición dentro de la ventana no vuelve a escribir");

    console.log("\n3) La no mantenida no se renueva y caduca");
    const fixedExpiry = new Date(Date.now() + 3 * hour);
    await db
      .update(session)
      .set({ expiresAt: fixedExpiry, lastSeenAt: new Date(Date.now() - hour) })
      .where(eq(session.id, ephemeralRow!.id));
    cookieJar.set(SESSION_COOKIE, ephemeral.token);
    check((await sessions.resolveSession())?.sessionId === ephemeralRow!.id, "la no mantenida vigente se resuelve");
    const touched = await waitFor(() => rowOf(ephemeral.token), (row) => (row?.lastSeenAt?.getTime() ?? 0) > Date.now() - 60_000);
    check(touched !== undefined && touched.lastSeenAt !== null && touched.lastSeenAt.getTime() > Date.now() - 60_000, "se registra su última actividad");
    check(touched?.expiresAt.getTime() === fixedExpiry.getTime(), "pero su vencimiento NO se extiende");

    await db.update(session).set({ expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 2 * day) }).where(eq(session.id, ephemeralRow!.id));
    check((await sessions.resolveSession()) === null, "pasadas las 24 horas la no mantenida deja de valer aunque la cookie siga");

    console.log("\n4) Rotar conserva la elección");
    const rotatingEphemeral = await sessions.createSession(userId, { remember: false });
    cookieJar.set(SESSION_COOKIE, rotatingEphemeral.token);
    const rotatedFromEphemeral = await sessions.rotateCurrentSession(userId);
    check(rotatedFromEphemeral.remember === false, "rotar una no mantenida sin elección nueva da una no mantenida");
    check((await rowOf(rotatingEphemeral.token)) === undefined, "la sesión reemplazada ya no existe");
    check((await rowOf(rotatedFromEphemeral.token))?.remember === false, "la nueva queda guardada como no mantenida");
    check(near((await rowOf(rotatedFromEphemeral.token))!.expiresAt, Date.now() + 24 * hour), "y con su caducidad de 24 horas desde la rotación");

    cookieJar.set(SESSION_COOKIE, rotatedFromEphemeral.token);
    const forced = await sessions.rotateCurrentSession(userId, { remember: true });
    check(forced.remember === true && (await rowOf(forced.token))?.remember === true, "una elección explícita manda sobre la reemplazada");

    cookieJar.set(SESSION_COOKIE, "cookie-sin-fila");
    check((await sessions.rotateCurrentSession(userId)).remember === true, "sin sesión que reemplazar la nueva es mantenida");
    cookieJar.delete(SESSION_COOKIE);

    console.log("\n5) Sesión anterior a la columna");
    const legacyToken = `legacy-${suffix}`;
    await db.insert(session).values({
      userId,
      tokenHash: hashToken(legacyToken),
      expiresAt: new Date(Date.now() + 10 * day),
    });
    check((await rowOf(legacyToken))?.remember === true, "una fila insertada sin remember queda como mantenida (DEFAULT true)");
    cookieJar.set(SESSION_COOKIE, legacyToken);
    check((await sessions.resolveSession()) !== null, "y sigue siendo válida");
    const legacyRenewed = await waitFor(() => rowOf(legacyToken), (row) => (row?.expiresAt.getTime() ?? 0) > Date.now() + 20 * day);
    check(legacyRenewed !== undefined && near(legacyRenewed.expiresAt, Date.now() + 30 * day), "desde entonces se renueva con el uso");

    console.log("\n✅ smoke de sesión mantenida y no mantenida OK");
  } finally {
    for (const id of createdUserIds) {
      await db.delete(appUser).where(eq(appUser.id, id)).catch(() => undefined);
    }
    console.log(`(fixtures borrados: ${createdUserIds.length} usuarios)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
