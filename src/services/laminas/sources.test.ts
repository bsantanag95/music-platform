// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/catalog/cover-mirror", () => ({ scheduleCoverMirrorsForUrls: vi.fn() }));

import { listLaminaCandidates, type LaminaCandidateQuery } from "./sources";

// El SQL lo ejecuta `scripts/smoke-test-top-laminas.ts` contra Postgres real; aquí, lo que se rechaza antes de llegar a la base.
const LIST = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";
const base: LaminaCandidateQuery = { source: "ratings", entityType: "release-group" };

describe("listLaminaCandidates", () => {
  it.each<[string, Partial<LaminaCandidateQuery>]>([
    ["año y década juntos", { year: 1999, decade: 1990 }],
    ["una década que no lo es", { decade: 1995 }],
    ["una lista sin elegir", { source: "list" }],
    ["una lista con filtros", { source: "list", list: LIST, year: 1999 }],
    ["una lista fuera de esa fuente", { list: LIST }],
  ])("rechaza %s", async (_label, query) => {
    await expect(listLaminaCandidates("u1", { ...base, ...query })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
