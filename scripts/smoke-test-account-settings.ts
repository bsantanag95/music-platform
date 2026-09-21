export {};

// Smoke test del cambio rework-account-settings (Fase 1: cuenta y seguridad; Fase 2:
// identidad musical, preguntas, zona horaria y hora local; Fase 3: cuenta desactivada,
// reactivación, eliminación en cascada y exportación).
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
import {
  appUser,
  authIdentity,
  comment,
  favorite,
  listenEntry,
  rating,
  releaseGroup,
  review,
  session,
  userFollow,
  userList,
  userProfilePrompt,
  userRoleAction,
  usernameAlias,
  emailChangeToken,
} from "../src/db/schema";
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

  const [users, username, emailChange, passwordChange, sessions, sessionList, identities, accountSettings, musicIdentity, identity, profileView, lifecycle, following, blocking, profilesSvc, feedSvc, homeSvc, communitySvc, discovery, listsSvc, savedLists, reviewsSvc, socialSvc, dataExport] =
    await Promise.all([
      import("../src/services/auth/users"),
      import("../src/services/auth/username"),
      import("../src/services/auth/email-change"),
      import("../src/services/auth/password-change"),
      import("../src/services/auth/sessions"),
      import("../src/services/auth/session-list"),
      import("../src/services/auth/identities"),
      import("../src/services/profiles/account-settings"),
      import("../src/services/profiles/music-identity"),
      import("../src/services/profiles/identity"),
      import("../src/services/profiles/profile-view"),
      import("../src/services/auth/account-lifecycle"),
      import("../src/services/social/following"),
      import("../src/services/social/blocking"),
      import("../src/services/social/profiles"),
      import("../src/services/feed/feed"),
      import("../src/services/home/home"),
      import("../src/services/activity/community-activity"),
      import("../src/services/lists/discovery"),
      import("../src/services/lists/lists"),
      import("../src/services/lists/saved-lists"),
      import("../src/services/reviews"),
      import("../src/services/social"),
      import("../src/services/profiles/data-export"),
    ]);
  return { users, username, emailChange, passwordChange, sessions, sessionList, identities, accountSettings, musicIdentity, identity, profileView, lifecycle, following, blocking, profilesSvc, feedSvc, homeSvc, communitySvc, discovery, listsSvc, savedLists, reviewsSvc, socialSvc, dataExport };
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


    console.log("\n7) Identidad musical, preguntas, zona horaria y hora local (Fase 2)");
    const m = await newUser("m");
    const saved = await s.musicIdentity.updateMusicIdentity(m.id, { selfRoles: ["collector", "dj"], genres: ["post-punk", "jazz"], listeningFormats: ["vinyl"] });
    check(saved.selfRoles.join() === "collector,dj" && saved.genres.join() === "post-punk,jazz", "roles, géneros y formatos se guardan y conservan su orden");
    await s.musicIdentity.updateMusicIdentity(m.id, { genres: [] });
    const [afterGenres] = await db.select({ genres: appUser.genres, selfRoles: appUser.selfRoles }).from(appUser).where(eq(appUser.id, m.id));
    check(afterGenres?.genres.length === 0 && afterGenres.selfRoles.length === 2, "vaciar un campo no toca los demás");
    check((await codeOf(() => s.musicIdentity.updateMusicIdentity(m.id, { selfRoles: ["listener", "collector", "musician", "dj"] }))) === "VALIDATION_ERROR", "un cuarto rol se rechaza en el servicio");

    // La base también impide pasarse de los topes (defensa aunque el servicio falle).
    const tooMany = await codeOf(() => db.update(appUser).set({ selfRoles: ["listener", "collector", "musician", "dj"] }).where(eq(appUser.id, m.id)));
    check(tooMany !== null && String(tooMany).includes("chk_app_user_self_roles") || tooMany === "23514", "el CHECK de la base rechaza un cuarto rol aunque se salte el servicio");

    console.log("  · preguntas");
    const prompts = await s.musicIdentity.replacePrompts(m.id, [
      { promptKey: "first-record", answer: "  Un casete de Los Prisioneros  " },
      { promptKey: "sunday-record", answer: "Kind of Blue, sin apuro" },
    ]);
    check(prompts.length === 2 && prompts[0]?.answer === "Un casete de Los Prisioneros" && prompts[1]?.position === 1, "las preguntas se guardan recortadas y en orden");
    const replaced = await s.musicIdentity.replacePrompts(m.id, [{ promptKey: "defended-song", answer: "una sola" }]);
    check(replaced.length === 1 && (await s.musicIdentity.listPrompts(m.id)).length === 1, "guardar reemplaza el conjunto completo");
    check((await codeOf(() => s.musicIdentity.replacePrompts(m.id, [{ promptKey: "first-record", answer: "x".repeat(101) }]))) === "VALIDATION_ERROR", "una respuesta de 101 caracteres se rechaza");
    check((await s.musicIdentity.listPrompts(m.id)).length === 1, "un guardado inválido no cambia el conjunto anterior");
    const rawFourth = await codeOf(async () => {
      await db.insert(userProfilePrompt).values([
        { userId: m.id, promptKey: "first-record", answer: "a", position: 1 },
        { userId: m.id, promptKey: "sunday-record", answer: "b", position: 2 },
        { userId: m.id, promptKey: "guilty-pleasure", answer: "c", position: 3 },
      ]);
    });
    check(rawFourth !== null, "la base rechaza una cuarta pregunta (position 0..2)");
    const rawMultiline = await codeOf(() => db.insert(userProfilePrompt).values({ userId: m.id, promptKey: "first-concert", answer: "una\ndos", position: 2 }));
    check(rawMultiline !== null, "la base rechaza una respuesta con salto de línea");
    check((await s.musicIdentity.listPrompts(m.id)).length === 1, "los rechazos de la base no dejan filas a medias");

    console.log("  · zona horaria y hora local");
    await s.identity.updateIdentity(m.id, { timezone: "America/Santiago", showLocalTime: true });
    const [tz] = await db.select({ timezone: appUser.timezone, show: appUser.showLocalTime }).from(appUser).where(eq(appUser.id, m.id));
    check(tz?.timezone === "America/Santiago" && tz.show === true, "una zona válida y la hora local se guardan");
    check((await codeOf(() => s.identity.updateIdentity(m.id, { timezone: "Mars/Olympus" }))) === "VALIDATION_ERROR", "una zona inventada se rechaza");
    await s.identity.updateIdentity(m.id, { timezone: "" });
    const [cleared] = await db.select({ timezone: appUser.timezone, show: appUser.showLocalTime }).from(appUser).where(eq(appUser.id, m.id));
    check(cleared?.timezone === null && cleared.show === false, "vaciar la zona apaga la hora local");
    check((await codeOf(() => s.identity.updateIdentity(m.id, { showLocalTime: true }))) === "VALIDATION_ERROR", "activar la hora sin zona se rechaza");
    const rawLocalTime = await codeOf(() => db.update(appUser).set({ showLocalTime: true }).where(eq(appUser.id, m.id)));
    check(rawLocalTime !== null, "el CHECK de la base impide la hora local sin zona");

    console.log("  · privacidad de la ficha");
    await s.identity.updateIdentity(m.id, { timezone: "America/Santiago", showLocalTime: true });
    await db.update(appUser).set({ profileVisibility: "private" }).where(eq(appUser.id, m.id));
    const anon = await s.profileView.getProfileView(m.username, null);
    check(anon.accessible === false && anon.selfRoles.length === 0 && anon.prompts.length === 0 && anon.showLocalTime === false, "un perfil privado no entrega la ficha a un anónimo");
    check(anon.bio === null || typeof anon.bio === "string", "la identidad pública de siempre sigue entregándose");
    const stranger = await s.profileView.getProfileView(m.username, a.id);
    check(stranger.selfRoles.length === 0 && stranger.prompts.length === 0, "un usuario sin acceso tampoco la recibe");
    const owner = await s.profileView.getProfileView(m.username, m.id);
    check(owner.selfRoles.join() === "collector,dj" && owner.prompts.length === 1 && owner.showLocalTime === true, "el dueño siempre ve la suya");
    await db.update(appUser).set({ profileVisibility: "public" }).where(eq(appUser.id, m.id));
    const publicView = await s.profileView.getProfileView(m.username, null);
    check(publicView.selfRoles.length === 2 && publicView.prompts.length === 1, "un perfil público la entrega a cualquiera");

    const promptRows = async () => (await db.select().from(userProfilePrompt).where(eq(userProfilePrompt.userId, m.id))).length;
    check((await promptRows()) === 1, "hay preguntas antes de borrar la cuenta");
    await db.delete(appUser).where(eq(appUser.id, m.id));
    check((await promptRows()) === 0, "borrar la cuenta borra sus preguntas (ON DELETE CASCADE)");


    console.log("\n8) Cuenta desactivada (Fase 3): superficies, autoría conservada, reactivación");
    const [album] = await db.select({ id: releaseGroup.id }).from(releaseGroup).limit(1);
    if (!album) throw new Error("La BD de scratch no tiene ningún álbum: ingestá uno antes de correr este smoke");
    const target = await s.socialSvc.resolveSocialTarget("release-group", album.id);

    const v = await newUser("v");
    const t = await newUser("t");
    await s.following.followUser(v.id, t.username);
    await s.following.followUser(t.id, v.username);
    const list = await s.listsSvc.createList({ ownerId: t.id, entityType: "release-group", title: "Lista ZZ smoke", audience: "public" });
    await s.savedLists.saveList(v.id, list.id);
    await s.socialSvc.upsertRating(target, t.id, 4, 80);
    await s.reviewsSvc.createOrReplaceReview(target, t.id, { title: "Reseña ZZ", body: "cuerpo zz smoke" } as never);
    await s.socialSvc.createComment(target, t.id, "comentario zz smoke");
    await db.insert(favorite).values({ userId: t.id, releaseGroupId: album.id, audience: "public" });

    const has = (value: unknown, needle: string) => JSON.stringify(value).includes(needle);
    const followingOf = async () => (await s.following.listFollowing(v.id)).users.map((u) => u.username);
    const followersOf = async () => (await s.following.listFollowers(v.id)).users.map((u) => u.username);
    const authorsOf = async () => (await s.feedSvc.listFeedAuthors(v.id)).map((a) => a.username);

    check((await s.profilesSvc.getProfileByUsername(t.username, v.id)).username === t.username, "antes: el perfil de la persona se ve");
    check((await s.profilesSvc.searchUsers(t.username, v.id)).users.some((u) => u.username === t.username), "antes: aparece en la búsqueda");
    check((await followingOf()).includes(t.username) && (await followersOf()).includes(t.username), "antes: aparece entre seguidos y seguidores");
    const before = await s.identity.countFollows(v.id);
    check(before.followerCount === 1 && before.followingCount === 1, "antes: los contadores la cuentan");
    check((await authorsOf()).includes(t.username), "antes: es un autor filtrable del feed");
    check(has(await s.feedSvc.listFeed(v.id), t.username), "antes: sus eventos están en el feed");
    check(has(await s.discovery.listDiscoverLists(null), list.id), "antes: su lista pública figura en el descubrimiento");
    check(has(await s.savedLists.listSavedLists(v.id), list.id), "antes: su lista está entre las guardadas");
    check(has(await s.communitySvc.listCommunityActivity(v.id), t.username), "antes: figura en la actividad de la comunidad");
    const ratingsBefore = await s.socialSvc.getRatings(target);

    console.log("  · desactivar");
    const tSession = (await sessionOf(t.id)).resolved;
    check((await codeOf(() => s.lifecycle.deactivateAccount(tSession, "mala"))) === "INVALID_CREDENTIALS", "desactivar exige la contraseña");
    clearAuthAttempts();
    await s.lifecycle.deactivateAccount(tSession, password);
    const [deact] = await db.select({ at: appUser.deactivatedAt }).from(appUser).where(eq(appUser.id, t.id));
    check(deact?.at !== null, "queda registrada la fecha de desactivación");
    check((await db.select().from(session).where(eq(session.userId, t.id))).length === 0, "se cierran TODAS sus sesiones");

    check((await codeOf(() => s.profilesSvc.getProfileByUsername(t.username, v.id))) === "USER_NOT_FOUND", "el perfil responde como inexistente");
    check((await codeOf(() => s.profileView.getProfileView(t.username, null))) === "USER_NOT_FOUND", "la vista de perfil también (sin sesión)");
    check(!(await s.profilesSvc.searchUsers(t.username, v.id)).users.some((u) => u.username === t.username), "desaparece de la búsqueda");
    check(!(await followingOf()).includes(t.username) && !(await followersOf()).includes(t.username), "desaparece de seguidos y seguidores");
    const during = await s.identity.countFollows(v.id);
    check(during.followerCount === 0 && during.followingCount === 0, "deja de contarse en los contadores");
    check(!(await authorsOf()).includes(t.username), "deja de ser autor filtrable del feed");
    check(!has(await s.feedSvc.listFeed(v.id), t.username), "sus eventos desaparecen del feed");
    check(!has(await s.discovery.listDiscoverLists(null), list.id), "su lista sale del descubrimiento");
    check(!has(await s.savedLists.listSavedLists(v.id), list.id), "su lista sale de las guardadas");
    check(!has(await s.communitySvc.listCommunityActivity(v.id), t.username), "sale de la actividad de la comunidad");
    check(!has(await s.homeSvc.listPublicLists(v.id, 50), list.id), "su lista sale de Home");
    check(!has(await s.homeSvc.listPopularComments(50), "comentario zz smoke"), "su comentario sale de los populares de Home");
    check((await codeOf(() => s.following.followUser(v.id, t.username))) === "USER_NOT_FOUND", "no se la puede seguir");
    check((await codeOf(() => s.blocking.blockUser(v.id, t.username))) === "USER_NOT_FOUND", "no se la puede bloquear");
    check((await followingOf()).length === 0, "V sigue viendo su propia red sin ella (sin errores)");

    console.log("  · autoría conservada");
    const reviews = (await s.reviewsSvc.listReviews(target, 1, 50)).reviews;
    const mine = reviews.find((r) => r.body === "cuerpo zz smoke");
    check(mine !== undefined && mine.user.deactivated === true && mine.user.username === "" && mine.user.displayName === null, "la reseña se conserva con autoría «desactivada», sin usuario ni nombre");
    check(!has(mine, t.username), "el usuario real no aparece en la reseña");
    const comments = (await s.socialSvc.listComments(target, 1, 50)).comments;
    const myComment = comments.find((c) => c.body === "comentario zz smoke");
    check(myComment !== undefined && myComment.user.deactivated === true && myComment.user.username === "", "el comentario se conserva con autoría «desactivada»");
    const ratingsDuring = await s.socialSvc.getRatings(target);
    check(ratingsDuring.aggregate.count === ratingsBefore.aggregate.count, "las valoraciones siguen contando en los agregados");
    const [stillThere] = await db.select({ n: userList.id }).from(userList).where(eq(userList.id, list.id));
    check(stillThere !== undefined, "la lista sigue existiendo");
    check((await db.select().from(userFollow).where(eq(userFollow.followedId, t.id))).length === 1, "los seguimientos se conservan");
    check((await db.select().from(favorite).where(eq(favorite.userId, t.id))).length === 1, "los favoritos se conservan");

    console.log("  · reactivar");
    const found = await s.users.authenticateUser(t.username, password);
    check(found !== null && found.deactivatedAt !== null, "iniciar sesión encuentra a la cuenta aunque esté desactivada");
    check((await s.users.findUserWithPasswordByEmail(t.email)) !== null, "restablecer la contraseña también la encuentra");
    check((await s.lifecycle.reactivateAccount(t.id)) === true, "reactivar borra la marca");
    check((await s.lifecycle.reactivateAccount(t.id)) === false, "reactivar una cuenta activa no hace nada");
    check((await s.profilesSvc.getProfileByUsername(t.username, v.id)).username === t.username, "vuelve el perfil");
    check((await followingOf()).includes(t.username) && (await followersOf()).includes(t.username), "vuelven los seguidos y seguidores");
    const after = await s.identity.countFollows(v.id);
    check(after.followerCount === 1 && after.followingCount === 1, "vuelven los contadores");
    check(has(await s.feedSvc.listFeed(v.id), t.username), "vuelven sus eventos al feed");
    check(has(await s.savedLists.listSavedLists(v.id), list.id), "vuelve su lista guardada");
    const back = (await s.reviewsSvc.listReviews(target, 1, 50)).reviews.find((r) => r.body === "cuerpo zz smoke");
    check(back?.user.deactivated === false && back.user.username === t.username, "la reseña vuelve a mostrar su autoría real");

    console.log("\n9) Eliminar cuenta (Fase 3)");
    const d = await newUser("d");
    await s.following.followUser(d.id, v.username);
    await s.following.followUser(v.id, d.username);
    await s.listsSvc.createList({ ownerId: d.id, entityType: "release-group", title: "Lista D", audience: "public" });
    await s.socialSvc.upsertRating(target, d.id, 3, 60);
    await s.reviewsSvc.createOrReplaceReview(target, d.id, { title: null, body: "reseña de D" } as never);
    await s.socialSvc.createComment(target, d.id, "comentario de D");
    await db.insert(favorite).values({ userId: d.id, releaseGroupId: album.id, audience: "public" });
    await db.insert(listenEntry).values({ userId: d.id, releaseGroupId: album.id, listenContext: "first_listen", audience: "private", body: "nota privada de D" });
    await s.musicIdentity.replacePrompts(d.id, [{ promptKey: "first-record", answer: "algo" }]);
    await s.identities.linkIdentityToUser(d.id, { provider: "google", providerAccountId: `smoke-sub-${suffix}-d`, email: null, emailVerified: true } as never);
    const dSession = (await sessionOf(d.id)).resolved;

    // Exportar ANTES de borrar: el archivo trae lo propio y nada secreto.
    const exported = await s.dataExport.buildDataExport(d.id);
    const exportText = JSON.stringify(exported);
    check(exported.library.diary.length === 1 && exportText.includes("nota privada de D"), "la exportación incluye el diario con la nota privada");
    check(exported.activity.reviews.length === 1 && exported.activity.comments.length === 1 && exported.activity.ratings.length === 1, "la exportación incluye reseñas, comentarios y valoraciones");
    check(exported.catalog.releaseGroups[album.id] !== undefined, "la exportación acompaña los ids del catálogo con sus nombres");
    const [dRow] = await db.select().from(appUser).where(eq(appUser.id, d.id));
    check(!exportText.includes(dRow!.passwordHash ?? "__none__") && !/passwordHash|tokenHash|token_hash|session/i.test(exportText), "la exportación NO incluye el hash de la contraseña, tokens ni sesiones");
    check(exported.social.following.some((f) => f.username === v.username) && exported.social.followers.some((f) => f.username === v.username), "la exportación lista seguidores y seguidos como usuarios públicos");
    check(!exportText.includes(v.email), "la exportación NO incluye datos privados de otras personas (su email)");

    check((await codeOf(() => s.lifecycle.deleteAccount(dSession, { username: "otro", password }))) === "VALIDATION_ERROR", "eliminar exige el usuario de confirmación exacto");
    check((await codeOf(() => s.lifecycle.deleteAccount(dSession, { username: d.username, password: "mala" }))) === "INVALID_CREDENTIALS", "eliminar exige la contraseña");
    clearAuthAttempts();
    check((await db.select().from(appUser).where(eq(appUser.id, d.id))).length === 1, "los rechazos no borran nada");

    await s.lifecycle.deleteAccount(dSession, { username: d.username, password });
    const leftovers = {
      app_user: (await db.select().from(appUser).where(eq(appUser.id, d.id))).length,
      listas: (await db.select().from(userList).where(eq(userList.ownerId, d.id))).length,
      valoraciones: (await db.select().from(rating).where(eq(rating.userId, d.id))).length,
      reseñas: (await db.select().from(review).where(eq(review.userId, d.id))).length,
      comentarios: (await db.select().from(comment).where(eq(comment.userId, d.id))).length,
      favoritos: (await db.select().from(favorite).where(eq(favorite.userId, d.id))).length,
      diario: (await db.select().from(listenEntry).where(eq(listenEntry.userId, d.id))).length,
      preguntas: (await db.select().from(userProfilePrompt).where(eq(userProfilePrompt.userId, d.id))).length,
      sesiones: (await db.select().from(session).where(eq(session.userId, d.id))).length,
      identidades: (await db.select().from(authIdentity).where(eq(authIdentity.userId, d.id))).length,
      seguimientos: (await db.select().from(userFollow).where(eq(userFollow.followerId, d.id))).length + (await db.select().from(userFollow).where(eq(userFollow.followedId, d.id))).length,
    };
    check(Object.values(leftovers).every((n) => n === 0), `no queda ninguna fila de la persona (${JSON.stringify(leftovers)})`);
    const rest = await s.following.listFollowing(v.id);
    check(!rest.users.some((u) => u.username === d.username), "los demás dejan de verla en sus listados");
    check(!has(await s.reviewsSvc.listReviews(target, 1, 50), "reseña de D"), "su reseña se borra (no queda como «desactivada»)");

    console.log("  · cuenta con historial de moderación");
    const m2 = await newUser("mod");
    const other = await newUser("mod2");
    await db.insert(userRoleAction).values({ actorId: m2.id, targetId: other.id, role: "moderator", action: "grant" });
    const m2Session = (await sessionOf(m2.id)).resolved;
    const blockedCode = await codeOf(() => s.lifecycle.deleteAccount(m2Session, { username: m2.username, password }));
    check(blockedCode === "ACCOUNT_DELETION_BLOCKED", "una cuenta con historial de moderación NO se puede eliminar");
    check((await db.select().from(appUser).where(eq(appUser.id, m2.id))).length === 1, "y no cambia nada");
    await s.lifecycle.deactivateAccount(m2Session, password);
    const [m2Row] = await db.select({ at: appUser.deactivatedAt }).from(appUser).where(eq(appUser.id, m2.id));
    check(m2Row?.at !== null, "en su lugar sí se puede desactivar");

    console.log("\n✅ smoke de cuenta, identidad musical y ciclo de vida OK");
  } finally {
    // Las filas de auditoría referencian al actor con RESTRICT: hay que soltarlas antes.
    for (const id of createdUserIds) {
      await db.delete(userRoleAction).where(eq(userRoleAction.actorId, id)).catch(() => undefined);
    }
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
