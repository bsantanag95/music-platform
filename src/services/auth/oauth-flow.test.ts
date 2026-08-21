import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  cookieGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mocks.cookieGet,
    set: mocks.cookieSet,
  }),
}));

import {
  computeCodeChallenge,
  consumeOAuthFlowCookies,
  generateOAuthFlowState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
  resolveLocale,
  setOAuthFlowCookies,
} from "./oauth-flow";

describe("resolveLocale", () => {
  it("devuelve el valor si está en la lista de locales soportados", () => {
    expect(resolveLocale("es")).toBe("es");
    expect(resolveLocale("en")).toBe("en");
  });

  it("usa el locale por defecto para valores vacíos o no soportados", () => {
    expect(resolveLocale(null)).toBe("es");
    expect(resolveLocale(undefined)).toBe("es");
    expect(resolveLocale("fr")).toBe("es");
    expect(resolveLocale("//evil.com")).toBe("es");
  });
});

describe("utilidades del flujo OAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieGet.mockReturnValue(undefined);
  });

  it("genera state, nonce, codeVerifier y codeChallenge aleatorios", () => {
    const a = generateOAuthFlowState();
    const b = generateOAuthFlowState();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });

  it("persiste el locale en el estado del flujo", () => {
    const flow = generateOAuthFlowState("en");
    expect(flow.locale).toBe("en");
  });

  it("usa el locale por defecto si no se indica", () => {
    const flow = generateOAuthFlowState();
    expect(flow.locale).toBe("es");
  });

  it("el codeChallenge es el SHA-256 base64url del codeVerifier", () => {
    const flow = generateOAuthFlowState();
    expect(flow.codeChallenge).toBe(computeCodeChallenge(flow.codeVerifier));
  });

  it("setea cookies httpOnly/secure/sameSite=lax con TTL corto", async () => {
    const flow = generateOAuthFlowState();
    await setOAuthFlowCookies(flow);

    expect(mocks.cookieSet).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      JSON.stringify(flow),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: OAUTH_STATE_TTL_MS / 1000,
      }),
    );
  });

  it("consume las cookies y las borra", async () => {
    const flow = generateOAuthFlowState();
    mocks.cookieGet.mockReturnValue({ value: JSON.stringify(flow) });

    const consumed = await consumeOAuthFlowCookies();
    expect(consumed).toEqual(flow);
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
  });

  it("normaliza el locale de una cookie a un valor soportado", async () => {
    const flow = generateOAuthFlowState();
    mocks.cookieGet.mockReturnValue({ value: JSON.stringify({ ...flow, locale: "fr" }) });

    const consumed = await consumeOAuthFlowCookies();
    expect(consumed?.locale).toBe("es");
  });

  it("devuelve null si la cookie está ausente", async () => {
    mocks.cookieGet.mockReturnValue(undefined);
    const consumed = await consumeOAuthFlowCookies();
    expect(consumed).toBeNull();
  });

  it("devuelve null si el JSON de la cookie es inválido", async () => {
    mocks.cookieGet.mockReturnValue({ value: "not-json" });
    const consumed = await consumeOAuthFlowCookies();
    expect(consumed).toBeNull();
  });

  it("devuelve null si faltan campos requeridos", async () => {
    mocks.cookieGet.mockReturnValue({ value: JSON.stringify({ state: "s" }) });
    const consumed = await consumeOAuthFlowCookies();
    expect(consumed).toBeNull();
  });
});