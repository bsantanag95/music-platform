export {};

import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { SignJWT, exportJWK } from "jose";
import { and, eq, inArray } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, authIdentity, session } from "../src/db/schema";
import { clearAuthAttempts } from "../src/services/auth/rate-limit";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_ISSUER,
  GOOGLE_JWKS_URL,
  GOOGLE_TOKEN_URL,
} from "../src/services/auth/providers/google-config";

assertSmokeAllowed();

// El flujo OAuth completo se ejercita con credenciales de Google falsas:
// global.fetch se mockea para el token endpoint y el JWKS, así que no se
// necesita una app OAuth real (ver AGENTS.md, sección de smoke tests).
process.env.GOOGLE_CLIENT_ID = "smoke-client-id";
process.env.GOOGLE_CLIENT_SECRET = "smoke-client-secret";
process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
process.env.GOOGLE_OAUTH_SCOPES = "openid email profile";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
// Para variar la IP por x-forwarded-for y no chocar el rate limit en memoria.
process.env.AUTH_TRUSTED_PROXY = "1";

clearAuthAttempts();

// --- Cookie jar en memoria para next/headers.cookies() -----------------------
//
// Los route handlers de OAuth llaman cookies() de next/headers, que fuera de un
// request scope de Next lanza "cookies was called outside a request scope". Este
// proyecto corre los scripts como CJS bajo tsx, así que interceptamos
// Module._load para devolver un cookies() mock respaldado por un jar en memoria.
const cookieJar = new Map<string, string>();

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

function readFlowState() {
  const raw = cookieJar.get("oauth_state");
  if (!raw) throw new Error("No se encontró la cookie oauth_state tras /start");
  return JSON.parse(raw) as {
    state: string;
    codeVerifier: string;
    codeChallenge: string;
    nonce: string;
    locale: string;
  };
}

// --- Clave RSA y emisión de ID tokens firmados --------------------------------
const SMOKE_KID = "smoke-key";
let jwksKeys: unknown[] = [];
let currentIdToken = "";

async function setupKeyMaterial(): Promise<CryptoKey> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await exportJWK(publicKey);
  jwksKeys = [
    { kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e, kid: SMOKE_KID, alg: "RS256", use: "sig" },
  ];
  return privateKey;
}

async function signIdToken(
  privateKey: CryptoKey,
  claims: { sub: string; email: string; emailVerified: boolean; nonce: string },
): Promise<string> {
  return new SignJWT({
    sub: claims.sub,
    email: claims.email,
    email_verified: claims.emailVerified,
    name: "Smoke Google User",
    nonce: claims.nonce,
  })
    .setProtectedHeader({ alg: "RS256", kid: SMOKE_KID })
    .setIssuedAt()
    .setIssuer(GOOGLE_ISSUER)
    .setAudience(process.env.GOOGLE_CLIENT_ID!)
    .setExpirationTime("1h")
    .sign(privateKey);
}

// --- Mock de global.fetch para Google -----------------------------------------
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetchMock(): void {
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(GOOGLE_TOKEN_URL)) {
      return jsonResponse({
        id_token: currentIdToken,
        access_token: "smoke-access-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    if (url.startsWith(GOOGLE_JWKS_URL)) {
      return jsonResponse({ keys: jwksKeys });
    }
    throw new Error(`fetch inesperado en smoke test: ${url}`);
  };
}

// --- Carga de los route handlers reales ---------------------------------------
type NextRequestT = import("next/server").NextRequest;

async function loadOAuthRoutes() {
  const req = createRequire(import.meta.url);
  const nodeModule = req("node:module") as {
    _load: (request: string, parent: object | null, isMain: boolean) => unknown;
  };
  const originalLoad = nodeModule._load;
  nodeModule._load = function (request, parent, isMain) {
    if (request === "next/headers") {
      return {
        cookies: async () => mockCookies(),
        headers: async () => new Headers(),
        draftMode: async () => ({ isEnabled: false }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const [startModule, callbackModule, { NextRequest }] = await Promise.all([
    import("../src/app/api/auth/google/start/route"),
    import("../src/app/api/auth/google/callback/route"),
    import("next/server"),
  ]);

  return { NextRequest, startGet: startModule.GET, callbackGet: callbackModule.GET };
}

type NextRequestCtor = typeof import("next/server").NextRequest;

function makeStartRequest(NextRequest: NextRequestCtor, ip: string, locale?: string, extraQuery = ""): NextRequestT {
  const query = `${locale ? `?locale=${locale}` : "?"}${extraQuery}`;
  return new NextRequest(`http://localhost:3000/api/auth/google/start${query}`, {
    headers: { "x-forwarded-for": ip },
  }) as NextRequestT;
}

function makeCallbackRequest(
  NextRequest: NextRequestCtor,
  ip: string,
  code: string,
  state: string,
): NextRequestT {
  return new NextRequest(
    `http://localhost:3000/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    { headers: { "x-forwarded-for": ip } },
  ) as NextRequestT;
}

// --- Aserciones sobre la BD -----------------------------------------------------
async function countUsersByEmail(email: string): Promise<number> {
  const rows = await db.select().from(appUser).where(eq(appUser.email, email));
  return rows.length;
}

async function countIdentity(provider: string, providerAccountId: string): Promise<number> {
  const rows = await db
    .select()
    .from(authIdentity)
    .where(
      and(eq(authIdentity.provider, provider), eq(authIdentity.providerAccountId, providerAccountId)),
    );
  return rows.length;
}

async function main() {
  const privateKey = await setupKeyMaterial();
  const { NextRequest, startGet, callbackGet } = await loadOAuthRoutes();
  installFetchMock();

  const runId = randomBytes(4).toString("hex");
  const createdUserIds: string[] = [];
  const fixtureUserIds: string[] = [];

  try {
    // --- 1) Alta nueva: sub desconocido, email no usado --------------------------
    const emailNew = `smoke-oauth-new-${runId}@example.test`;
    const subNew = `smoke-sub-new-${runId}`;
    const ipA = `10.10.${runId.slice(0, 2)}.1`;

    let res = await startGet(makeStartRequest(NextRequest, ipA, "en"));
    if (res.status !== 307 || !(res.headers.get("location") ?? "").startsWith(GOOGLE_AUTH_URL)) {
      throw new Error(`start (alta nueva): status ${res.status}`);
    }

    const flowA = readFlowState();
    currentIdToken = await signIdToken(privateKey, {
      sub: subNew,
      email: emailNew,
      emailVerified: true,
      nonce: flowA.nonce,
    });
    res = await callbackGet(makeCallbackRequest(NextRequest, ipA, "auth-code-a", flowA.state));
    const locationA = res.headers.get("location") ?? "";
    if (res.status !== 307 || !locationA.endsWith("/en/welcome")) {
      throw new Error(`callback (alta nueva): status ${res.status}, location ${locationA}`);
    }

    const [createdUser] = await db.select().from(appUser).where(eq(appUser.email, emailNew));
    if (!createdUser) throw new Error("Alta nueva: no se creó app_user");
    // Registrar el id ANTES de los asserts siguientes: si el username derivado no
    // coincide o falta la identidad/sesión, el usuario ya queda cubierto por el
    // finally y no se fuga un fixture en la BD.
    createdUserIds.push(createdUser.id);
    if (createdUser.username !== `smokeoauthnew${runId}`) {
      throw new Error(`Alta nueva: username inesperado ${createdUser.username}`);
    }
    if ((await countIdentity("google", subNew)) !== 1) throw new Error("Alta nueva: sin auth_identity");
    const [createdSession] = await db.select().from(session).where(eq(session.userId, createdUser.id));
    if (!createdSession) throw new Error("Alta nueva: sin session");
    console.log("OK 1/6 alta nueva -> /en/welcome, app_user+auth_identity+session creados");

    // --- 2) Identidad existente: mismo sub vuelve a autenticar ------------------
    const ipB = `10.10.${runId.slice(0, 2)}.2`;
    res = await startGet(makeStartRequest(NextRequest, ipB, "es"));
    const flowB = readFlowState();
    currentIdToken = await signIdToken(privateKey, {
      sub: subNew,
      email: emailNew,
      emailVerified: true,
      nonce: flowB.nonce,
    });
    res = await callbackGet(makeCallbackRequest(NextRequest, ipB, "auth-code-b", flowB.state));
    const locationB = res.headers.get("location") ?? "";
    if (res.status !== 307 || !locationB.endsWith("/es/welcome")) {
      throw new Error(`callback (identidad existente): status ${res.status}, location ${locationB}`);
    }
    if ((await countUsersByEmail(emailNew)) !== 1) throw new Error("Identidad existente: usuario duplicado");
    if ((await countIdentity("google", subNew)) !== 1) throw new Error("Identidad existente: identidad duplicada");
    console.log("OK 2/6 identidad existente (sin onboarding) -> /es/welcome, sin duplicados");

    // --- 3) Email colisionado con cuenta local ------------------------------------
    const emailCollision = `smoke-oauth-collision-${runId}@example.test`;
    const [fixture] = await db
      .insert(appUser)
      .values({
        username: `smokeoauthcoll${runId}`,
        email: emailCollision,
        passwordHash: "smoke-not-a-real-hash",
      })
      .returning();
    if (!fixture) throw new Error("Email colisionado: no se pudo crear el fixture local");
    fixtureUserIds.push(fixture.id);

    const ipC = `10.10.${runId.slice(0, 2)}.3`;
    res = await startGet(makeStartRequest(NextRequest, ipC, "es"));
    const flowC = readFlowState();
    currentIdToken = await signIdToken(privateKey, {
      sub: `smoke-sub-collision-${runId}`,
      email: emailCollision,
      emailVerified: true,
      nonce: flowC.nonce,
    });
    res = await callbackGet(makeCallbackRequest(NextRequest, ipC, "auth-code-c", flowC.state));
    const locationC = res.headers.get("location") ?? "";
    if (!locationC.includes("code=EMAIL_TAKEN_BY_LOCAL")) {
      throw new Error(`callback (email colisionado): location ${locationC}`);
    }
    if ((await countUsersByEmail(emailCollision)) !== 1) {
      throw new Error("Email colisionado: se creó usuario no deseado");
    }
    if ((await countIdentity("google", `smoke-sub-collision-${runId}`)) !== 0) {
      throw new Error("Email colisionado: se creó identidad no deseada");
    }
    console.log("OK 3/6 email colisionado -> EMAIL_TAKEN_BY_LOCAL, sin crear nada");

    // --- 4) Email no verificado -> OAUTH_EMAIL_NOT_VERIFIED -------------------------
    const emailUnverified = `smoke-oauth-unver-${runId}@example.test`;
    const ipD = `10.10.${runId.slice(0, 2)}.4`;
    res = await startGet(makeStartRequest(NextRequest, ipD, "es"));
    const flowD = readFlowState();
    currentIdToken = await signIdToken(privateKey, {
      sub: `smoke-sub-unver-${runId}`,
      email: emailUnverified,
      emailVerified: false,
      nonce: flowD.nonce,
    });
    res = await callbackGet(makeCallbackRequest(NextRequest, ipD, "auth-code-d", flowD.state));
    const locationD = res.headers.get("location") ?? "";
    if (!locationD.includes("code=OAUTH_EMAIL_NOT_VERIFIED")) {
      throw new Error(`callback (email no verificado): location ${locationD}`);
    }
    if ((await countUsersByEmail(emailUnverified)) !== 0) {
      throw new Error("Email no verificado: se creó usuario no deseado");
    }
    console.log("OK 4/6 email no verificado -> OAUTH_EMAIL_NOT_VERIFIED, sin crear nada");

    // --- 5) Mantener la sesión (change add-keep-signed-in) -------------------------
    // La cookie de sesión sale en el Set-Cookie de la respuesta (no pasa por el jar).
    const sessionCookie = (response: Response): { token: string; maxAge: string | null } => {
      const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith("music_session="));
      if (!header) throw new Error("La respuesta no estableció la cookie music_session");
      return {
        token: header.split(";")[0]!.slice("music_session=".length),
        maxAge: header.match(/max-age=(\d+)/i)?.[1] ?? null,
      };
    };
    const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");
    const rowFor = async (token: string) =>
      (await db.select().from(session).where(eq(session.tokenHash, hashOf(token))))[0];
    const loginWith = async (ip: string, extraQuery: string) => {
      cookieJar.delete("music_session");
      await startGet(makeStartRequest(NextRequest, ip, "es", extraQuery));
      const flow = readFlowState() as ReturnType<typeof readFlowState> & { remember?: boolean };
      currentIdToken = await signIdToken(privateKey, {
        sub: subNew,
        email: emailNew,
        emailVerified: true,
        nonce: flow.nonce,
      });
      const response = await callbackGet(makeCallbackRequest(NextRequest, ip, "auth-code-r", flow.state));
      return { response, flow };
    };

    const ipE = `10.10.${runId.slice(0, 2)}.5`;
    const kept = await loginWith(ipE, "");
    const keptCookie = sessionCookie(kept.response);
    const keptRow = await rowFor(keptCookie.token);
    if (kept.flow.remember !== true) throw new Error("Sin remember el estado del flujo no mantiene la sesión");
    if (keptCookie.maxAge !== String(400 * 24 * 60 * 60)) {
      throw new Error(`Sesión mantenida: Max-Age inesperado ${keptCookie.maxAge}`);
    }
    if (keptRow?.remember !== true) throw new Error("Sesión mantenida: remember debía ser true");

    const ipF = `10.10.${runId.slice(0, 2)}.6`;
    const ephemeral = await loginWith(ipF, "&remember=0");
    const ephemeralCookie = sessionCookie(ephemeral.response);
    const ephemeralRow = await rowFor(ephemeralCookie.token);
    if (ephemeral.flow.remember !== false) throw new Error("remember=0 no quedó en el estado del flujo");
    if (ephemeralCookie.maxAge !== null) {
      throw new Error(`Sesión no mantenida: la cookie debía ser de sesión, trae Max-Age=${ephemeralCookie.maxAge}`);
    }
    if (ephemeralRow?.remember !== false) throw new Error("Sesión no mantenida: remember debía ser false");
    const hours = ((ephemeralRow?.expiresAt.getTime() ?? 0) - Date.now()) / 3_600_000;
    if (hours < 23 || hours > 25) throw new Error(`Sesión no mantenida: caducidad de ${hours.toFixed(1)} h`);
    console.log("OK 5/6 login con y sin remember -> cookie larga + 30 días / cookie de sesión + 24 h");

    // --- 6) Confirmar la identidad (reauth) conserva la elección -------------------
    const ipG = `10.10.${runId.slice(0, 2)}.7`;
    cookieJar.set("music_session", ephemeralCookie.token);
    await startGet(makeStartRequest(NextRequest, ipG, "es", "&intent=reauth"));
    const reauthFlow = readFlowState();
    currentIdToken = await signIdToken(privateKey, {
      sub: subNew,
      email: emailNew,
      emailVerified: true,
      nonce: reauthFlow.nonce,
    });
    const reauth = await callbackGet(makeCallbackRequest(NextRequest, ipG, "auth-code-g", reauthFlow.state));
    if (!(reauth.headers.get("location") ?? "").includes("google=confirmed")) {
      throw new Error(`reauth: location ${reauth.headers.get("location")}`);
    }
    const rotatedCookie = sessionCookie(reauth);
    const rotatedRow = await rowFor(rotatedCookie.token);
    if (rotatedCookie.token === ephemeralCookie.token) throw new Error("reauth: la sesión no se rotó");
    if (rotatedRow?.remember !== false || rotatedCookie.maxAge !== null) {
      throw new Error("reauth: la sesión rotada debía seguir siendo no mantenida (cookie de sesión)");
    }
    if (await rowFor(ephemeralCookie.token)) throw new Error("reauth: la sesión reemplazada sigue existiendo");
    cookieJar.delete("music_session");
    console.log("OK 6/6 reauth desde una sesión no mantenida -> rotada, sigue sin mantenerse");

    console.log("Smoke Google OAuth OK: flujo completo contra BD real.");
  } finally {
    for (const userId of createdUserIds) {
      await db.delete(session).where(eq(session.userId, userId));
      await db.delete(authIdentity).where(eq(authIdentity.userId, userId));
    }
    for (const userId of fixtureUserIds) {
      await db.delete(appUser).where(eq(appUser.id, userId));
    }
    // Los FKs de session/auth_identity son ON DELETE CASCADE sobre app_user:
    // borrar por id de usuario limpia cualquier fixture residual.
    if (createdUserIds.length) await db.delete(appUser).where(inArray(appUser.id, createdUserIds));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Smoke Google OAuth falló:", error);
    process.exit(1);
  });