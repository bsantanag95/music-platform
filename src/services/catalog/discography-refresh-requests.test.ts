import { beforeEach, describe, expect, it, vi } from "vitest";

// El SQL (cruce del calendario con los créditos y la espera de 24 h) lo ejercita el smoke contra
// Postgres (scripts/smoke-test-artist-discography.ts); aquí, el contrato: cuenta y nunca lanza.
const execute = vi.hoisted(() => vi.fn());
vi.mock("@/db", () => ({ db: { execute } }));

const { requestDiscographyRefreshes } = await import("./discography-refresh-requests");

beforeEach(() => {
  execute.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requestDiscographyRefreshes", () => {
  it("devuelve cuántos artistas quedaron con la solicitud", async () => {
    execute.mockResolvedValueOnce([{ id: "a-1" }, { id: "a-2" }]);
    await expect(requestDiscographyRefreshes()).resolves.toBe(2);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("un fallo de la base se registra y no se propaga", async () => {
    execute.mockRejectedValueOnce(new Error("conexión perdida"));
    await expect(requestDiscographyRefreshes()).resolves.toBe(0);
    expect(console.error).toHaveBeenCalled();
  });
});
