export {};

// Smoke test del cambio rework-account-settings (Fase 1: cuenta y seguridad).
// Ejecuta contra Postgres REAL el SQL que las pruebas unitarias mockean:
// cambio de usuario (enfriamiento, reserva sin distinguir mayúsculas, alias,
// recuperación), cambio de email con confirmación, cambio y creación de
// contraseña, vincular/desvincular Google, sesiones por dispositivo e idioma.
// Escribe fixtures `smoke_acct_*` y los borra al terminar (ON DELETE CASCADE).
// Captura el token del correo desde el adaptador `console` (no envía correo real).
// Correr idealmente contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-account-settings.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, authIdentity, emailChangeToken, session, usernameAlias } from "../src/db/schema";
import { clearAuthAttempts } from "../src/services/auth/rate-limit";

assertSmokeAllowed();

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
delete process.env.EMAIL_TRANSPORT;
clearAuthAttempts();

const suffix = randomUUID().slice(0, 8);
const cookieJar = new Map<string, string>();
let userAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
const createdUserIds: string[] = [];
const day = 24 * 60 * 60 * 1000;

function mockCookies() {
  return {
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { value };
    },
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0) cookieJar.delete(name);
      else cookieJar.set(name, value);
    },
  };
}

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function codeOf(action: () => Promise<unknown>): Promise<string | null> {
  try {
    await action();
    return null;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) return String((error as { code: unknown }).code);
    return error instanceof Error ? error.message : String(error);
  }
}

async function captureChangeToken(action: () => Promise<void>): Promise<string> {
  let captured = "";
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    captured += args.map((arg) => String(arg)).join(" ");
  };
  try {
    await action();
  } finally {
    console.log = originalLog;
  }
  const match = captured.match(/change-email\?token=([A-Za-z0-9_%.-]+)/);
  if (!match?.[1]) throw new Error("No se capturó el token del correo de cambio de email");
  return decodeURIComponent(match[1]);
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
        cookies: async () => mockCookies(),
        headers: async () => new Headers({ "user-agent": userAgent }),
        draftMode: async () => ({ isEnabled: false }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const [users, username, emailChange, passwordChange, sessions, sessionList, identities, accountSettings] =
    await Promise.all([
      import("../src/services/auth/users"),
      import("../src/services/auth/username"),
      import("../src/services/auth/email-change"),
      import("../src/services/auth/password-change"),
      import("../src/services/auth/sessions"),
      import("../src/services/auth/session-list"),
      import("../src/services/auth/identities"),
      import("../src/services/profiles/account-settings"),
    ]);
  return { users, username, emailChange, passwordChange, sessions, sessionList, identities, accountSettings };
}

async function main() {
  const s = await loadServices();
  const password = "smoke-password-123";

  async function newUser(tag: string, withPassword = true) {
    const created = await s.users.registerUser({
      username: `smoke_acct_${suffix}_${tag}`,
      email: `smoke-acct-${suffix}-${tag}@example.test`,
      password,
    });
    if (!created) throw new Error("no se creó el usuario");
    createdUserIds.push(created.id);
    if (!withPassword) await db.update(appUser).set({ passwordHash: null }).where(eq(appUser.id, created.id));
    return created;
  }

  // Sesión "real" de la persona, con la forma de `resolveSession()`.
  async function sessionOf(userId: string, createdAgoMs = 0) {
    const created = await s.sessions.createSession(userId);
    const [row] = await db.select().from(session).where(eq(session.userId, userId)).orderBy(session.createdAt);
    const all = await db.select().from(session).where(eq(session.userId, userId));
    const mine = all.find((item) => item.expiresAt.getTime() === created.expiresAt.getTime()) ?? row;
    if (!mine) throw new Error("no se creó la sesión");
    if (createdAgoMs > 0) {
      await db.update(session).set({ createdAt: new Date(Date.now() - createdAgoMs) }).where(eq(session.id, mine.id));
    }
    const [user] = await db.select().from(appUser).where(eq(appUser.id, userId));
    return {
      resolved: { sessionId: mine.id, sessionCreatedAt: new Date(Date.now() - createdAgoMs), user: user! },
      token: created.token,
    };
  }

  try {
    const a = await newUser("a");
    const b = await newUser("b");

    console.log("\n1) Cambio de usuario");
    const oldA = a.username;
    const newA = `smoke_acct_${suffix}_a2`;
    const availability = await s.username.checkUsernameAvailability(a.id, newA);
    check(availability.available && availability.reason === null, "un usuario libre figura disponible");
    const taken = await s.username.checkUsernameAvailability(a.id, b.username.toUpperCase());
    check(!taken.available && taken.reason === "taken", "el usuario de otra cuenta figura ocupado SIN distinguir mayúsculas");

    const changed = await s.username.changeUsername(a.id, newA);
    check(changed.username === newA, "el primer cambio se aplica");
    const [afterA] = await db.select().from(appUser).where(eq(appUser.id, a.id));
    check(afterA?.username === newA && afterA.usernameChangedAt !== null, "queda registrada la fecha del cambio");
    check((await codeOf(() => s.username.changeUsername(a.id, `${newA}x`))) === "USERNAME_CHANGE_COOLDOWN", "un segundo cambio dentro de 30 días se rechaza");

    check((await s.username.resolveUsernameAlias(oldA)) === newA, "el usuario anterior redirige al nuevo");
    check((await s.username.resolveUsernameAlias(oldA.toUpperCase())) === newA, "la redirección tampoco distingue mayúsculas");
    check(await s.username.isUsernameReserved(oldA), "el usuario anterior queda reservado");
    const reservedForB = await s.username.checkUsernameAvailability(b.id, oldA);
    check(!reservedForB.available && reservedForB.reason === "taken", "otra cuenta no puede tomar el usuario reservado");
    check((await codeOf(() => s.users.registerUser({ username: oldA, email: `smoke-acct-${suffix}-x@example.test`, password }))) === "USERNAME_TAKEN", "no se puede registrar el usuario reservado");
    check((await codeOf(async () => { await db.update(appUser).set({ usernameChangedAt: new Date(Date.now() - 31 * day) }).where(eq(appUser.id, b.id)); return s.username.changeUsername(b.id, oldA); })) === "USERNAME_TAKEN", "otra cuenta tampoco puede CAMBIARSE al usuario reservado");

    // Recuperar el propio usuario anterior (pasado el enfriamiento).
    await db.update(appUser).set({ usernameChangedAt: new Date(Date.now() - 31 * day) }).where(eq(appUser.id, a.id));
    const recovered = await s.username.changeUsername(a.id, oldA);
    check(recovered.username === oldA, "pasado el enfriamiento se recupera el usuario anterior");
    const aliases = await db.select().from(usernameAlias).where(eq(usernameAlias.userId, a.id));
    check(aliases.length === 1 && aliases[0]?.username === newA, "la reserva del recuperado se libera y queda reservado el actual");

    // Reserva vencida.
    await db.update(usernameAlias).set({ expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 2000) }).where(eq(usernameAlias.userId, a.id));
    check((await s.username.resolveUsernameAlias(newA)) === null, "vencida la reserva el enlace ya no redirige");
    check(!(await s.username.isUsernameReserved(newA)), "vencida la reserva el usuario queda libre");
    const late = await s.users.registerUser({ username: newA, email: `smoke-acct-${suffix}-late@example.test`, password });
    if (late) createdUserIds.push(late.id);
    check(late?.username === newA, "vencida la reserva otra persona puede registrarlo");

    console.log("\n2) Sesiones por dispositivo");
    userAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
    const s1 = await sessionOf(a.id, 30 * 60 * 1000);
    userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    const s2 = await sessionOf(a.id);
    const listed = await s.sessionList.listMySessions(a.id, s2.resolved.sessionId);
    check(listed.length === 2 && listed[0]?.current === true, "la sesión actual va primero");
    check(listed.some((item) => item.deviceLabel === "Firefox · Linux") && listed.some((item) => item.deviceLabel === "Safari · iPhone"), "cada sesión guarda su etiqueta de dispositivo");
    check(listed.every((item) => !("tokenHash" in item)), "la lista no expone hashes de token");
    const otherList = await s.sessionList.listMySessions(b.id, "x");
    check(otherList.length === 0, "la lista solo contiene sesiones de la persona");
    check((await codeOf(() => s.sessionList.revokeSession(b.id, s1.resolved.sessionId, "x"))) === "SESSION_NOT_FOUND", "no se puede cerrar la sesión de otra persona");
    check((await codeOf(() => s.sessionList.revokeSession(a.id, s2.resolved.sessionId, s2.resolved.sessionId))) === "VALIDATION_ERROR", "no se puede cerrar la sesión actual por esta vía");
    await s.sessionList.revokeSession(a.id, s1.resolved.sessionId, s2.resolved.sessionId);
    check((await s.sessionList.listMySessions(a.id, s2.resolved.sessionId)).length === 1, "cerrar otra sesión la elimina");

    console.log("\n3) Cambio de email");
    const current = (await sessionOf(a.id)).resolved;
    const targetEmail = `smoke-acct-${suffix}-new@example.test`;
    check((await codeOf(() => s.emailChange.requestEmailChange(current, { newEmail: b.email, password, locale: "es" }))) === "EMAIL_TAKEN", "un email de otra cuenta se rechaza");
    check((await codeOf(() => s.emailChange.requestEmailChange(current, { newEmail: targetEmail, password: "mala", locale: "es" }))) === "INVALID_CREDENTIALS", "una contraseña incorrecta se rechaza");
    clearAuthAttempts();
    const token = await captureChangeToken(() => s.emailChange.requestEmailChange(current, { newEmail: targetEmail, password, locale: "es" }));
    const [stillOld] = await db.select({ email: appUser.email }).from(appUser).where(eq(appUser.id, a.id));
    check(stillOld?.email === a.email, "el email NO cambia al pedirlo");
    const [pendingRow] = await db.select().from(emailChangeToken).where(eq(emailChangeToken.userId, a.id));
    check(pendingRow?.newEmail === targetEmail && pendingRow.tokenHash !== token, "queda un cambio pendiente con el hash del token");
    check((await s.emailChange.getPendingEmailChange(a.id))?.newEmail === targetEmail, "el cambio pendiente es consultable");

    const confirmed = await s.emailChange.confirmEmailChange(token, "es");
    const [afterEmail] = await db.select().from(appUser).where(eq(appUser.id, a.id));
    check(confirmed.email === targetEmail && afterEmail?.email === targetEmail && afterEmail.emailVerifiedAt !== null, "confirmar cambia el email y lo marca verificado");
    check((await codeOf(() => s.emailChange.confirmEmailChange(token, "es"))) === "INVALID_VERIFICATION_TOKEN", "el enlace es de un solo uso");
    check((await s.emailChange.getPendingEmailChange(a.id)) === null, "el token se borra al confirmar");

    console.log("\n4) Contraseña");
    const fresh = await sessionOf(a.id);
    const spare = await sessionOf(a.id);
    check((await s.sessionList.listMySessions(a.id, fresh.resolved.sessionId)).length >= 2, "hay varias sesiones antes de cambiar la contraseña");
    check((await codeOf(() => s.passwordChange.changePassword(fresh.resolved, { currentPassword: "mala", newPassword: "nueva-clave-456", revokeOtherSessions: false, locale: "es" }))) === "INVALID_CREDENTIALS", "una contraseña actual incorrecta se rechaza");
    clearAuthAttempts();
    check((await codeOf(() => s.passwordChange.changePassword(fresh.resolved, { currentPassword: password, newPassword: password, revokeOtherSessions: false, locale: "es" }))) === "PASSWORD_REUSED", "no se acepta la misma contraseña");
    await s.passwordChange.changePassword(fresh.resolved, { currentPassword: password, newPassword: "nueva-clave-456", revokeOtherSessions: true, locale: "es" });
    const remaining = await db.select().from(session).where(eq(session.userId, a.id));
    check(remaining.length === 1 && remaining[0]?.id === fresh.resolved.sessionId, "cambiar la contraseña cierra las otras sesiones y conserva la actual");
    void spare;
    const [afterPw] = await db.select({ passwordHash: appUser.passwordHash }).from(appUser).where(eq(appUser.id, a.id));
    check(afterPw?.passwordHash !== null && !afterPw?.passwordHash.includes("nueva-clave-456"), "se guarda un hash, nunca la contraseña");

    console.log("\n5) Google: vincular, desvincular y crear contraseña");
    const identity = { provider: "google", providerAccountId: `smoke-sub-${suffix}`, email: "otra@gmail.test", emailVerified: true };
    await s.identities.linkIdentityToUser(a.id, identity);
    const [linked] = await db.select().from(authIdentity).where(and(eq(authIdentity.userId, a.id), eq(authIdentity.provider, "google")));
    check(linked?.providerAccountId === identity.providerAccountId, "vincular crea la identidad enlazada por el id de Google (no por email)");
    await s.identities.linkIdentityToUser(a.id, identity);
    check((await db.select().from(authIdentity).where(eq(authIdentity.userId, a.id))).length === 1, "vincular la misma identidad dos veces es inocuo");
    check((await codeOf(() => s.identities.linkIdentityToUser(b.id, identity)))?.includes("OAUTH_IDENTITY_TAKEN") === true, "una identidad ya vinculada a otra cuenta se rechaza");

    await s.identities.unlinkGoogle(a.id);
    check((await db.select().from(authIdentity).where(eq(authIdentity.userId, a.id))).length === 0, "con contraseña se puede desvincular Google");

    const g = await newUser("g", false);
    await s.identities.linkIdentityToUser(g.id, { provider: "google", providerAccountId: `smoke-sub-${suffix}-g`, email: null, emailVerified: true } as never);
    check((await codeOf(() => s.identities.unlinkGoogle(g.id))) === "LAST_ACCESS_METHOD", "si Google es el único acceso NO se puede desvincular");
    const oldSession = (await sessionOf(g.id, 2 * day)).resolved;
    check((await codeOf(() => s.passwordChange.createPassword(oldSession, { newPassword: "clave-nueva-789", locale: "es" }))) === "REAUTH_REQUIRED", "con la sesión antigua crear la contraseña pide confirmar con Google");
    const recent = (await sessionOf(g.id, 3 * 60 * 1000)).resolved;
    await s.passwordChange.createPassword(recent, { newPassword: "clave-nueva-789", locale: "es" });
    const access = await s.accountSettings.getAccessMethod(g.id);
    check(access.hasPassword && access.providers.includes("google"), "con sesión reciente se crea la contraseña y Google sigue vinculado");
    await s.identities.unlinkGoogle(g.id);
    check((await s.accountSettings.getAccessMethod(g.id)).providers.length === 0, "ya con contraseña se puede desvincular");

    console.log("\n6) Idioma");
    await s.accountSettings.setLocalePreference(a.id, "en");
    const [withLocale] = await db.select({ locale: appUser.locale }).from(appUser).where(eq(appUser.id, a.id));
    check(withLocale?.locale === "en", "el idioma preferido se guarda en la cuenta");
    check((await codeOf(() => s.accountSettings.setLocalePreference(a.id, "fr"))) === "VALIDATION_ERROR", "un idioma no soportado se rechaza");

    console.log("\n✅ smoke de cuenta y seguridad OK");
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
