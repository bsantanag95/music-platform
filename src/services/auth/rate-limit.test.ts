import { describe, expect, it } from "vitest";
import { consumeAuthAttempt, clearAuthAttempts, getAuthClientIp } from "./rate-limit";

describe("rate limit de autenticación", () => {
  it("limita por ventana y permite nuevos intentos después de ella", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 10; i++) expect(consumeAuthAttempt([key], 1_000 + i)).toBe(true);
    expect(consumeAuthAttempt([key], 2_000)).toBe(false);
    expect(consumeAuthAttempt([key], 901_001)).toBe(true);
    clearAuthAttempts([key]);
  });

  it("no confía en X-Forwarded-For sin proxy confiable explícito", () => {
    expect(getAuthClientIp(new Headers({ "x-forwarded-for": "198.51.100.10" }))).toBe("unknown");
  });

  it("acepta X-Forwarded-For solo con configuración explícita", () => {
    vi.stubEnv("AUTH_TRUSTED_PROXY", "1");
    expect(getAuthClientIp(new Headers({ "x-forwarded-for": "198.51.100.10, 10.0.0.1" }))).toBe("198.51.100.10");
    vi.unstubAllEnvs();
  });

  it("prefiere la IP entregada por el runtime", () => {
    expect(getAuthClientIp(new Headers({ "x-forwarded-for": "198.51.100.10" }), "192.0.2.20")).toBe("192.0.2.20");
  });

  it("limita la cardinalidad del mapa", () => {
    for (let i = 0; i < 10_001; i++) consumeAuthAttempt([`cardinality-${i}`], 10_000);
    expect(consumeAuthAttempt(["cardinality-0"], 10_000)).toBe(true);
  });

  it("no expulsa una clave activa cuando se alcanza la cardinalidad máxima", () => {
    const victim = `active-${Date.now()}`;
    const now = Date.now();
    consumeAuthAttempt([victim], now);
    for (let i = 0; i < 10_000; i++) consumeAuthAttempt([`active-churn-${i}`], now);

    expect(consumeAuthAttempt([victim], now + 1)).toBe(true);
    expect(consumeAuthAttempt([victim], now + 2)).toBe(true);
    clearAuthAttempts([victim]);
  });

  it("no almacena más de MAX_ATTEMPTS intentos por clave", () => {
    const key = `bounded-${Date.now()}`;
    const now = Date.now();
    for (let i = 0; i < 100; i++) expect(consumeAuthAttempt([key], now + i)).toBe(i < 10);
    expect(consumeAuthAttempt([key], now + 101)).toBe(false);
    clearAuthAttempts([key]);
  });

  it("no consume claves secundarias si la clave primaria ya está bloqueada", () => {
    clearAuthAttempts();
    const primary = `primary-blocked-${Date.now()}`;
    const secondary = `secondary-untouched-${Date.now()}`;
    const now = Date.now();

    for (let i = 0; i < 10; i++) consumeAuthAttempt([primary], now + i);
    expect(consumeAuthAttempt([primary, secondary], now + 10)).toBe(false);

    for (let i = 0; i < 10; i++) expect(consumeAuthAttempt([secondary], now + 11 + i)).toBe(true);
    clearAuthAttempts([primary, secondary]);
  });
});
