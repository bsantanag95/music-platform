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
  isAccountIntent,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
  resolveIntent,
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

describe("intenciones del flujo", () => {
  it("resolveIntent acepta solo el conjunto cerrado y cae en login", () => {
    expect(resolveIntent("login")).toBe("login");
    expect(resolveIntent("link")).toBe("link");
    expect(resolveIntent("reauth")).toBe("reauth");
    expect(resolveIntent("admin")).toBe("login");
    expect(resolveIntent("")).toBe("login");
    expect(resolveIntent(null)).toBe("login");
    expect(resolveIntent(undefined)).toBe("login");
  });

  it("isAccountIntent distingue las intenciones que operan sobre una sesión", () => {
    expect(isAccountIntent("link")).toBe(true);
    expect(isAccountIntent("reauth")).toBe(true);
    expect(isAccountIntent("login")).toBe(false);
  });

  it("el flujo por defecto es login y no lleva usuario", () => {
    const flow = generateOAuthFlowState("es");
    expect(flow.intent).toBe("login");
    expect(flow).not.toHaveProperty("userId");
  });

  it("un flujo de vincular o confirmar guarda la intención y quién lo inició", () => {
    expect(generateOAuthFlowState("en", { intent: "link", userId: "u1" })).toMatchObject({
      intent: "link",
      userId: "u1",
      locale: "en",
    });
    expect(generateOAuthFlowState("es", { intent: "reauth", userId: "u2" })).toMatchObject({
      intent: "reauth",
      userId: "u2",
    });
  });

  it("una cookie anterior a las intenciones se consume como login", async () => {
    mocks.cookieGet.mockReturnValue({
      value: JSON.stringify({ state: "s", codeVerifier: "v", nonce: "n", locale: "es" }),
    });
    const flow = await consumeOAuthFlowCookies();
    expect(flow?.intent).toBe("login");
  });

  it("una intención manipulada en la cookie se trata como login", async () => {
    mocks.cookieGet.mockReturnValue({
      value: JSON.stringify({ state: "s", codeVerifier: "v", nonce: "n", locale: "es", intent: "admin" }),
    });
    expect((await consumeOAuthFlowCookies())?.intent).toBe("login");
  });

  it("conserva la intención y el usuario de una cookie válida", async () => {
    mocks.cookieGet.mockReturnValue({
      value: JSON.stringify({ state: "s", codeVerifier: "v", nonce: "n", locale: "en", intent: "link", userId: "u1" }),
    });
    expect(await consumeOAuthFlowCookies()).toMatchObject({ intent: "link", userId: "u1" });
  });
});

