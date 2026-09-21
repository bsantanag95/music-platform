import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { clearAuthAttempts } from "./rate-limit";
import { hashPassword } from "./password";
import { isRecentSession, RECENT_AUTH_WINDOW_MS, requireRecentAuth } from "./recent-auth";
import type { ResolvedSession } from "./sessions";

// argon2 real: hashPassword/verifyPassword son la única forma de probar el
// contrato de verdad (el hash nunca se compara a mano).
async function sessionFor(options: {
  password: string | null;
  createdAgoMs?: number;
  id?: string;
}): Promise<ResolvedSession> {
  return {
    sessionId: "s1",
    sessionCreatedAt: new Date(Date.now() - (options.createdAgoMs ?? 0)),
    user: {
      id: options.id ?? "user-1",
      passwordHash: options.password === null ? null : await hashPassword(options.password),
    },
  } as unknown as ResolvedSession;
}

async function code(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof ApiError ? error.code : "OTHER";
  }
}

beforeEach(() => clearAuthAttempts());

describe("requireRecentAuth", () => {
  it("acepta la contraseña correcta de una cuenta con contraseña", async () => {
    const current = await sessionFor({ password: "correcta-123" });
    await expect(requireRecentAuth(current, "correcta-123")).resolves.toBeUndefined();
  });

  it("rechaza una contraseña incorrecta o ausente con INVALID_CREDENTIALS", async () => {
    const current = await sessionFor({ password: "correcta-123" });
    expect(await code(requireRecentAuth(current, "otra-cosa"))).toBe("INVALID_CREDENTIALS");
    expect(await code(requireRecentAuth(current))).toBe("INVALID_CREDENTIALS");
  });

  it("no exige contraseña ni sesión reciente si la contraseña es correcta", async () => {
    const current = await sessionFor({ password: "correcta-123", createdAgoMs: 5 * 24 * 60 * 60 * 1000 });
    await expect(requireRecentAuth(current, "correcta-123")).resolves.toBeUndefined();
  });

  it("acepta una cuenta sin contraseña con la sesión de hace 3 minutos", async () => {
    const current = await sessionFor({ password: null, createdAgoMs: 3 * 60 * 1000 });
    await expect(requireRecentAuth(current)).resolves.toBeUndefined();
  });

  it("pide REAUTH_REQUIRED a una cuenta sin contraseña con la sesión de hace 2 días", async () => {
    const current = await sessionFor({ password: null, createdAgoMs: 2 * 24 * 60 * 60 * 1000 });
    expect(await code(requireRecentAuth(current))).toBe("REAUTH_REQUIRED");
  });

  it("limita los intentos de contraseña por usuario", async () => {
    const current = await sessionFor({ password: "correcta-123" });
    for (let attempt = 0; attempt < 10; attempt++) {
      expect(await code(requireRecentAuth(current, "mal"))).toBe("INVALID_CREDENTIALS");
    }
    // Pasado el límite ni siquiera la contraseña correcta se verifica.
    expect(await code(requireRecentAuth(current, "correcta-123"))).toBe("RATE_LIMITED");
  });

  it("una contraseña correcta reinicia el contador del usuario", async () => {
    const current = await sessionFor({ password: "correcta-123" });
    for (let attempt = 0; attempt < 9; attempt++) await code(requireRecentAuth(current, "mal"));
    await requireRecentAuth(current, "correcta-123");
    for (let attempt = 0; attempt < 9; attempt++) {
      expect(await code(requireRecentAuth(current, "mal"))).toBe("INVALID_CREDENTIALS");
    }
  });
});

describe("isRecentSession", () => {
  it("usa una ventana de 10 minutos", () => {
    const now = Date.now();
    expect(isRecentSession(new Date(now - RECENT_AUTH_WINDOW_MS + 1000), now)).toBe(true);
    expect(isRecentSession(new Date(now - RECENT_AUTH_WINDOW_MS - 1000), now)).toBe(false);
  });
});
