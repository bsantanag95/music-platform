export {};

// Smoke test del cambio add-password-reset. Escribe fixtures en la BD apuntada
// por DATABASE_URL y los limpia al final. Ejercita los route handlers reales de
// forgot/reset contra Postgres y captura el token del correo desde el adaptador
// `console` (no se envía correo real, la red no sale del proceso).
// Correr idealmente contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-password-reset.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, passwordResetToken, session } from "../src/db/schema";
import { authenticateUser } from "../src/services/auth/users";
import { hashPassword } from "../src/services/auth/password";
import { createSession } from "../src/services/auth/sessions";
import { clearAuthAttempts } from "../src/services/auth/rate-limit";
import { hashResetToken } from "../src/services/auth/password-reset";

assertSmokeAllowed();

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
delete process.env.EMAIL_TRANSPORT;

clearAuthAttempts();

const suffix = randomUUID().slice(0, 8);
const localUser = {
  id: randomUUID(),
  username: `smoke-reset-local-${suffix}`,
  email: `smoke-reset-local-${suffix}@example.test`,
};
const googleUser = {
  id: randomUUID(),
  username: `smoke-reset-google-${suffix}`,
  email: `smoke-reset-google-${suffix}@example.test`,
};
const unknownEmail = `smoke-reset-unknown-${suffix}@example.test`;

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
        cookies: async () => ({ get: () => undefined, set: () => undefined }),
        headers: async () => new Headers(),
        draftMode: async () => ({ isEnabled: false }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const [forgotModule, resetModule, { NextRequest }] = await Promise.all([
    import("../src/app/api/auth/password/forgot/route"),
    import("../src/app/api/auth/password/reset/route"),
    import("next/server"),
  ]);

  return { NextRequest, forgotPost: forgotModule.POST, resetPost: resetModule.POST };
}

function jsonRequest(NextRequest: NextRequestCtor, url: string, body: unknown): NextRequestT {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequestT;
}

async function captureResetToken(action: () => Promise<void>): Promise<string> {
  let captured = "";
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    captured += args.map((arg) => String(arg)).join(" ");
    originalLog(...args);
  };
  try {
    await action();
    for (let attempt = 0; attempt < 40; attempt++) {
      const match = captured.match(/reset-password\?token=([A-Za-z0-9_-]+)/);
      if (match?.[1]) return match[1];
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("No se capturó el token del correo por el adaptador console");
  } finally {
    console.log = originalLog;
  }
}

async function main() {
  try {
    const passwordHash = await hashPassword("old-password-123");
    await db.insert(appUser).values([{ ...localUser, passwordHash }, googleUser]);

    const { NextRequest, forgotPost, resetPost } = await loadRoutes();
    const forgotUrl = "http://localhost:3000/api/auth/password/forgot";
    const resetUrl = "http://localhost:3000/api/auth/password/reset";

    // 202 invariante: email inexistente y cuenta solo-Google no revelan nada.
    const unknownResponse = await forgotPost(jsonRequest(NextRequest, forgotUrl, { email: unknownEmail }));
    if (unknownResponse.status !== 202) throw new Error(`email inexistente devolvió ${unknownResponse.status}`);

    const googleResponse = await forgotPost(jsonRequest(NextRequest, forgotUrl, { email: googleUser.email }));
    if (googleResponse.status !== 202) throw new Error(`cuenta solo-Google devolvió ${googleResponse.status}`);
    const googleTokens = await db
      .select({ id: passwordResetToken.id })
      .from(passwordResetToken)
      .where(eq(passwordResetToken.userId, googleUser.id));
    if (googleTokens.length !== 0) throw new Error("se generó un token para una cuenta sin contraseña local");

    // Cuenta local: 202 y token capturado del correo de consola.
    let localResponseStatus = 0;
    const token = await captureResetToken(async () => {
      const response = await forgotPost(jsonRequest(NextRequest, forgotUrl, { email: localUser.email, locale: "es" }));
      localResponseStatus = response.status;
    });
    if (localResponseStatus !== 202) throw new Error(`cuenta local devolvió ${localResponseStatus}`);

    const stored = await db
      .select({ tokenHash: passwordResetToken.tokenHash })
      .from(passwordResetToken)
      .where(eq(passwordResetToken.userId, localUser.id));
    if (stored.length !== 1 || stored[0]?.tokenHash !== hashResetToken(token)) {
      throw new Error("el token persistido no coincide con el hash del token del correo");
    }

    // Sesiones activas que el reset debe invalidar.
    await createSession(localUser.id);
    await createSession(localUser.id);

    // Reusar la contraseña actual se rechaza y NO consume el token.
    const reusedPasswordResponse = await resetPost(
      jsonRequest(NextRequest, resetUrl, { token, password: "old-password-123" }),
    );
    if (reusedPasswordResponse.status !== 400) {
      throw new Error(`reusar la contraseña actual devolvió ${reusedPasswordResponse.status}`);
    }
    if ((await reusedPasswordResponse.json()).code !== "PASSWORD_REUSED") {
      throw new Error("reusar la contraseña actual no devolvió PASSWORD_REUSED");
    }
    const stillStored = await db
      .select({ id: passwordResetToken.id })
      .from(passwordResetToken)
      .where(eq(passwordResetToken.userId, localUser.id));
    if (stillStored.length !== 1) throw new Error("el rechazo por reuso consumió el token");

    // Reset exitoso.
    const resetResponse = await resetPost(
      jsonRequest(NextRequest, resetUrl, { token, password: "new-password-456" }),
    );
    if (resetResponse.status !== 200) throw new Error(`reset válido devolvió ${resetResponse.status}`);

    const withNewPassword = await authenticateUser(localUser.email, "new-password-456");
    if (!withNewPassword || withNewPassword.id !== localUser.id) {
      throw new Error("no se pudo iniciar sesión con la contraseña nueva");
    }
    const withOldPassword = await authenticateUser(localUser.email, "old-password-123");
    if (withOldPassword) throw new Error("la contraseña vieja sigue siendo válida tras el reset");

    const sessionsLeft = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, localUser.id));
    if (sessionsLeft.length !== 0) throw new Error("el reset no invalidó todas las sesiones");

    const tokensLeft = await db
      .select({ id: passwordResetToken.id })
      .from(passwordResetToken)
      .where(eq(passwordResetToken.userId, localUser.id));
    if (tokensLeft.length !== 0) throw new Error("quedaron tokens tras el reset");

    // Un solo uso: reusar el mismo token falla.
    const reuseResponse = await resetPost(
      jsonRequest(NextRequest, resetUrl, { token, password: "another-password-789" }),
    );
    if (reuseResponse.status !== 400) throw new Error(`reutilizar el token devolvió ${reuseResponse.status}`);
    if ((await reuseResponse.json()).code !== "INVALID_RESET_TOKEN") {
      throw new Error("reutilizar el token no devolvió INVALID_RESET_TOKEN");
    }

    // Token expirado: no consume ni cambia la contraseña.
    const expiredToken = `expired-${suffix}`;
    await db.insert(passwordResetToken).values({
      userId: localUser.id,
      tokenHash: hashResetToken(expiredToken),
      createdAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
    });
    const expiredResponse = await resetPost(
      jsonRequest(NextRequest, resetUrl, { token: expiredToken, password: "yet-another-000" }),
    );
    if (expiredResponse.status !== 400) throw new Error(`token expirado devolvió ${expiredResponse.status}`);
    if (!(await authenticateUser(localUser.email, "new-password-456"))) {
      throw new Error("un token expirado modificó la contraseña");
    }

    console.log("✅ smoke-test-password-reset: todos los casos pasaron");
  } finally {
    await db.delete(appUser).where(eq(appUser.id, localUser.id));
    await db.delete(appUser).where(eq(appUser.id, googleUser.id));
    console.log("🧹 smoke-test-password-reset: fixtures limpiados");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ smoke-test-password-reset falló:", error);
    process.exit(1);
  });
