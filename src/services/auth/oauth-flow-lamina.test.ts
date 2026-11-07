// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { generateOAuthFlowState } from "./oauth-flow";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

describe("intención de Lámina en el estado del flujo", () => {
  it("se guarda en un flujo login", () => {
    expect(generateOAuthFlowState("es", undefined, true, { kind: "lamina", id: ID }).buildIntent).toEqual({ kind: "lamina", id: ID });
  });

  it("sin intención no queda el campo", () => {
    expect(generateOAuthFlowState("es")).not.toHaveProperty("buildIntent");
  });

  it.each(["link", "reauth"] as const)("con %s se ignora: el retorno sigue siendo a Ajustes", (intent) => {
    expect(generateOAuthFlowState("es", { intent, userId: "u1" }, true, { kind: "lamina", id: ID })).not.toHaveProperty("buildIntent");
  });
});

describe("lectura del estado", () => {
  it("una cookie con el campo anterior se sigue leyendo como intención de Lámina", async () => {
    const { cookies } = await import("next/headers");
    const raw = JSON.stringify({ state: "s", codeVerifier: "v", nonce: "n", locale: "es", laminaId: ID });
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: raw }), set: vi.fn() } as never);
    const { consumeOAuthFlowCookies } = await import("./oauth-flow");
    expect((await consumeOAuthFlowCookies())?.buildIntent).toEqual({ kind: "lamina", id: ID });
  });

  it("una intención guardada inválida se descarta", async () => {
    const { cookies } = await import("next/headers");
    const raw = JSON.stringify({ state: "s", codeVerifier: "v", nonce: "n", locale: "es", buildIntent: { kind: "discography", artistId: "//otro" } });
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: raw }), set: vi.fn() } as never);
    const { consumeOAuthFlowCookies } = await import("./oauth-flow");
    expect((await consumeOAuthFlowCookies())?.buildIntent).toBeUndefined();
  });
});
