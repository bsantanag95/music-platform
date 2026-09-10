import { describe, expect, it } from "vitest";
import { isRestrictionActive } from "./restrictions";

const now = new Date("2026-09-09T12:00:00.000Z");

describe("ventana de restricciones", () => {
  it("considera activa una restricción vigente", () => {
    expect(isRestrictionActive({ startsAt: new Date("2026-09-09T11:00:00.000Z"), expiresAt: new Date("2026-09-09T13:00:00.000Z"), revokedAt: null }, now)).toBe(true);
  });

  it("considera expirada una restricción llegada a su límite", () => {
    expect(isRestrictionActive({ startsAt: new Date("2026-09-09T11:00:00.000Z"), expiresAt: now, revokedAt: null }, now)).toBe(false);
  });

  it("considera inactiva una restricción revocada", () => {
    expect(isRestrictionActive({ startsAt: new Date("2026-09-09T11:00:00.000Z"), expiresAt: null, revokedAt: new Date("2026-09-09T11:30:00.000Z") }, now)).toBe(false);
  });
});
