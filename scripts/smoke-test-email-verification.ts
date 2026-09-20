export {};

// Smoke test del cambio add-email-verification. Escribe fixtures en la BD
// apuntada por DATABASE_URL y los limpia al final. Ejercita los route handlers
// reales de registro y verificación contra Postgres y captura el token del
// correo desde el adaptador `console` (no se envía correo real).
// Correr idealmente contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-email-verification.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, emailVerificationToken } from "../src/db/schema";
import { clearAuthAttempts } from "../src/services/auth/rate-limit";
import { hashVerificationToken } from "../src/services/auth/email-verification";

assertSmokeAllowed();

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
delete process.env.EMAIL_TRANSPORT;
clearAuthAttempts();

const suffix = randomUUID().slice(0, 8);
const cookieJar = new Map<string, string>();
const createdUserIds: string[] = [];

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

type NextRequestT = import("next/server").NextRequest;
type NextRequestCtor = typeof import("next/server").NextRequest;

async function loadRoutes() {
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

  const [registerModule, verifyModule, resendModule, sessionsModule, { NextRequest }] =
    await Promise.all([
      import("../src/app/api/auth/register/route"),
      import("../src/app/api/auth/email/verify/route"),
      import("../src/app/api/auth/email/verify/resend/route"),
      import("../src/services/auth/sessions"),
      import("next/server"),
    ]);

  return {
    NextRequest,
    registerPost: registerModule.POST,
    verifyPost: verifyModule.POST,
    resendPost: resendModule.POST,
    createSession: sessionsModule.createSession,
  };
}

function jsonRequest(NextRequest: NextRequestCtor, url: string, body: unknown): NextRequestT {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequestT;
}

async function captureVerificationToken(action: () => Promise<void>): Promise<string> {
  let captured = "";
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    captured += args.map((arg) => String(arg)).join(" ");
    originalLog(...args);
  };
  try {
    await action();
    for (let attempt = 0; attempt < 40; attempt++) {
      const match = captured.match(/verify-email\?token=([A-Za-z0-9_-]+)/);
      if (match?.[1]) return match[1];
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("No se capturó el token de verificación del correo de consola");
  } finally {
    console.log = originalLog;
  }
}

async function main() {
  const { NextRequest, registerPost, verifyPost, resendPost, createSession } = await loadRoutes();
  const base = "http://localhost:3000";
  const registerUrl = `${base}/api/auth/register`;
  const verifyUrl = `${base}/api/auth/email/verify`;
  const resendUrl = `${base}/api/auth/email/verify/resend`;

  try {
    // 1) Registro local: 201, token creado, email sin verificar.
    const emailA = `smoke-verify-${suffix}-a@example.test`;
    let registerStatus = 0;
    const tokenA = await captureVerificationToken(async () => {
      const response = await registerPost(
        jsonRequest(NextRequest, registerUrl, {
          username: `smoke_verify_${suffix}_a`,
          email: emailA,
          password: "initial-password-123",
          locale: "es",
        }),
      );
      registerStatus = response.status;
    });
    if (registerStatus !== 201) throw new Error(`el registro devolvió ${registerStatus}`);

    const [userA] = await db.select().from(appUser).where(eq(appUser.email, emailA)).limit(1);
    if (!userA) throw new Error("no se creó el usuario de prueba");
    createdUserIds.push(userA.id);
    if (userA.emailVerifiedAt) throw new Error("el registro local quedó verificado sin consumir token");

    const storedA = await db
      .select({ tokenHash: emailVerificationToken.tokenHash })
      .from(emailVerificationToken)
      .where(eq(emailVerificationToken.userId, userA.id));
    if (storedA.length !== 1 || storedA[0]?.tokenHash !== hashVerificationToken(tokenA)) {
      throw new Error("el token persistido no coincide con el del correo");
    }

    // 2) Verificación exitosa.
    const verifyResponse = await verifyPost(jsonRequest(NextRequest, verifyUrl, { token: tokenA }));
    if (verifyResponse.status !== 200) throw new Error(`la verificación devolvió ${verifyResponse.status}`);

    const [verifiedA] = await db
      .select({ emailVerifiedAt: appUser.emailVerifiedAt })
      .from(appUser)
      .where(eq(appUser.id, userA.id))
      .limit(1);
    if (!verifiedA?.emailVerifiedAt) throw new Error("no se marcó email_verified_at");

    const tokensLeftA = await db
      .select({ id: emailVerificationToken.id })
      .from(emailVerificationToken)
      .where(eq(emailVerificationToken.userId, userA.id));
    if (tokensLeftA.length !== 0) throw new Error("quedaron tokens tras verificar");

    // 3) Reuso del mismo token.
    const reuseResponse = await verifyPost(jsonRequest(NextRequest, verifyUrl, { token: tokenA }));
    if (reuseResponse.status !== 400) throw new Error(`reutilizar el token devolvió ${reuseResponse.status}`);
    if ((await reuseResponse.json()).code !== "INVALID_VERIFICATION_TOKEN") {
      throw new Error("reutilizar el token no devolvió INVALID_VERIFICATION_TOKEN");
    }

    // 4) Token expirado.
    const expiredToken = `expired-${suffix}`;
    await db.insert(emailVerificationToken).values({
      userId: userA.id,
      tokenHash: hashVerificationToken(expiredToken),
      createdAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
    });
    const expiredResponse = await verifyPost(jsonRequest(NextRequest, verifyUrl, { token: expiredToken }));
    if (expiredResponse.status !== 400) throw new Error(`token expirado devolvió ${expiredResponse.status}`);

    // 5) Reenvío de una cuenta ya verificada → 409.
    const sessionA = await createSession(userA.id);
    cookieJar.set("music_session", sessionA.token);
    const resendVerified = await resendPost(
      jsonRequest(NextRequest, resendUrl, { locale: "es" }),
    );
    if (resendVerified.status !== 409) throw new Error(`reenviar verificado devolvió ${resendVerified.status}`);
    if ((await resendVerified.json()).code !== "EMAIL_ALREADY_VERIFIED") {
      throw new Error("reenviar verificado no devolvió EMAIL_ALREADY_VERIFIED");
    }

    // 6) Reenvío de una cuenta sin verificar → 200 y un solo token vigente.
    const emailB = `smoke-verify-${suffix}-b@example.test`;
    let registerBStatus = 0;
    const tokenBInitial = await captureVerificationToken(async () => {
      const response = await registerPost(
        jsonRequest(NextRequest, registerUrl, {
          username: `smoke_verify_${suffix}_b`,
          email: emailB,
          password: "initial-password-123",
          locale: "en",
        }),
      );
      registerBStatus = response.status;
    });
    if (registerBStatus !== 201) throw new Error(`el segundo registro devolvió ${registerBStatus}`);

    const [userB] = await db.select().from(appUser).where(eq(appUser.email, emailB)).limit(1);
    if (!userB) throw new Error("no se creó el segundo usuario de prueba");
    createdUserIds.push(userB.id);

    const sessionB = await createSession(userB.id);
    cookieJar.set("music_session", sessionB.token);
    const tokenBResent = await captureVerificationToken(async () => {
      const response = await resendPost(jsonRequest(NextRequest, resendUrl, { locale: "en" }));
      if (response.status !== 200) {
        throw new Error(`reenviar sin verificar devolvió ${response.status}`);
      }
    });

    const tokensLeftB = await db
      .select({ tokenHash: emailVerificationToken.tokenHash })
      .from(emailVerificationToken)
      .where(eq(emailVerificationToken.userId, userB.id));
    if (tokensLeftB.length !== 1) throw new Error("el reenvío no dejó exactamente un token vigente");
    if (tokensLeftB[0]?.tokenHash !== hashVerificationToken(tokenBResent)) {
      throw new Error("el token vigente no es el del último reenvío");
    }
    if (tokensLeftB[0]?.tokenHash === hashVerificationToken(tokenBInitial)) {
      throw new Error("el reenvío no invalidó el token anterior");
    }

    console.log("✅ smoke-test-email-verification: todos los casos pasaron");
  } finally {
    cookieJar.clear();
    for (const userId of createdUserIds) {
      await db.delete(appUser).where(eq(appUser.id, userId));
    }
    console.log("🧹 smoke-test-email-verification: fixtures limpiados");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ smoke-test-email-verification falló:", error);
    process.exit(1);
  });
