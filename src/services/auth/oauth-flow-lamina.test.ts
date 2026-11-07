// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { generateOAuthFlowState } from "./oauth-flow";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

describe("intención de Lámina en el estado del flujo", () => {
  it("se guarda en un flujo login", () => {
    expect(generateOAuthFlowState("es", undefined, true, ID).laminaId).toBe(ID);
  });

  it("sin intención no queda el campo", () => {
    expect(generateOAuthFlowState("es")).not.toHaveProperty("laminaId");
  });

  it.each(["link", "reauth"] as const)("con %s se ignora: el retorno sigue siendo a Ajustes", (intent) => {
    expect(generateOAuthFlowState("es", { intent, userId: "u1" }, true, ID)).not.toHaveProperty("laminaId");
  });
});
