import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";

const getCookie = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getCookie })),
}));

vi.mock("@/services/auth/sessions", () => ({
  clearSessionCookie: vi.fn(),
  deleteSessionByToken: vi.fn().mockResolvedValue(undefined),
}));

describe("/api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCookie.mockReturnValue({ value: "token" });
  });

  it.each([POST, DELETE])("exporta logout para el método soportado", async (handler) => {
    const response = await handler();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
