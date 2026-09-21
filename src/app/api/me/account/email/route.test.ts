import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { clearAuthAttempts } from "@/services/auth/rate-limit";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requestEmailChange: vi.fn(),
  getPendingEmailChange: vi.fn(),
  confirmEmailChange: vi.fn(),
  EmailConfigError: class EmailConfigError extends Error {},
}));

vi.mock("@/services/auth/authorization", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/services/email", () => ({ EmailConfigError: mocks.EmailConfigError }));
vi.mock("@/services/auth/email-change", () => ({
  requestEmailChange: mocks.requestEmailChange,
  getPendingEmailChange: mocks.getPendingEmailChange,
  confirmEmailChange: mocks.confirmEmailChange,
}));

import { GET, POST } from "./route";
import { POST as CONFIRM } from "../../../auth/email/change/confirm/route";

const current = { sessionId: "s1", user: { id: "u1" } };

function post(body: unknown) {
  return new NextRequest("http://localhost/api/me/account/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function confirm(body: unknown) {
  return new NextRequest("http://localhost/api/auth/email/change/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAuthAttempts();
  mocks.requireSession.mockResolvedValue(current);
  mocks.requestEmailChange.mockResolvedValue(undefined);
});

describe("POST /api/me/account/email", () => {
  it("pide el cambio con el idioma validado", async () => {
    const res = await POST(post({ newEmail: "nuevo@ejemplo.com", password: "pw", locale: "en" }));
    expect(res.status).toBe(200);
    expect(mocks.requestEmailChange).toHaveBeenCalledWith(current, {
      newEmail: "nuevo@ejemplo.com",
      password: "pw",
      locale: "en",
    });
  });

  it("un idioma desconocido cae al idioma por defecto", async () => {
    await POST(post({ newEmail: "nuevo@ejemplo.com", locale: "fr" }));
    expect(mocks.requestEmailChange).toHaveBeenCalledWith(current, expect.objectContaining({ locale: "es" }));
  });

  it("rechaza un email inválido", async () => {
    const res = await POST(post({ newEmail: "no-es-email" }));
    expect(res.status).toBe(400);
    expect(mocks.requestEmailChange).not.toHaveBeenCalled();
  });

  it("traduce un transporte no configurado a EMAIL_CONFIG_MISSING", async () => {
    mocks.requestEmailChange.mockRejectedValue(new mocks.EmailConfigError());
    const res = await POST(post({ newEmail: "nuevo@ejemplo.com" }));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("EMAIL_CONFIG_MISSING");
  });

  it.each([
    ["EMAIL_TAKEN", 409],
    ["INVALID_CREDENTIALS", 403],
    ["REAUTH_REQUIRED", 403],
  ] as const)("propaga %s", async (code, status) => {
    mocks.requestEmailChange.mockRejectedValue(new ApiError(code, status, "x"));
    const res = await POST(post({ newEmail: "nuevo@ejemplo.com" }));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
  });

  it("limita los pedidos por usuario", async () => {
    for (let call = 0; call < 10; call++) {
      expect((await POST(post({ newEmail: "nuevo@ejemplo.com" }))).status).toBe(200);
    }
    const res = await POST(post({ newEmail: "nuevo@ejemplo.com" }));
    expect(res.status).toBe(429);
  });

  it("exige sesión", async () => {
    mocks.requireSession.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await POST(post({ newEmail: "nuevo@ejemplo.com" }))).status).toBe(401);
  });
});

describe("GET /api/me/account/email", () => {
  it("devuelve el cambio pendiente o null", async () => {
    mocks.getPendingEmailChange.mockResolvedValue({
      newEmail: "nuevo@ejemplo.com",
      expiresAt: new Date("2026-09-22T00:00:00Z"),
    });
    expect(await (await GET()).json()).toEqual({
      pending: { newEmail: "nuevo@ejemplo.com", expiresAt: "2026-09-22T00:00:00.000Z" },
    });
    mocks.getPendingEmailChange.mockResolvedValue(null);
    expect(await (await GET()).json()).toEqual({ pending: null });
  });
});

describe("POST /api/auth/email/change/confirm", () => {
  it("confirma con el token, sin exigir sesión", async () => {
    mocks.confirmEmailChange.mockResolvedValue({ email: "nuevo@ejemplo.com" });
    const res = await CONFIRM(confirm({ token: "tok", locale: "en" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, email: "nuevo@ejemplo.com" });
    expect(mocks.confirmEmailChange).toHaveBeenCalledWith("tok", "en");
    expect(mocks.requireSession).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo sin token", async () => {
    expect((await CONFIRM(confirm({}))).status).toBe(400);
  });

  it("propaga un enlace inválido o un email tomado", async () => {
    mocks.confirmEmailChange.mockRejectedValue(new ApiError("INVALID_VERIFICATION_TOKEN", 400, "x"));
    const res = await CONFIRM(confirm({ token: "tok" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_VERIFICATION_TOKEN");
  });
});
