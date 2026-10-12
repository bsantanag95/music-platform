import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_ALBUMS_FOR_SECTION } from "../constants";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), transaction: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));

import type { CoverResolver } from "./covers";
import { generateCollection, previewCollection } from "./generate";
import type { CollectionTemplate } from "./types";

function templateReturning(ids: string[]): CollectionTemplate {
  return {
    key: "t",
    rank: 1,
    weight: 0,
    plan: async () => ({ periodKey: "evergreen", title: "T", candidates: ids }),
  };
}

// Resuelve carátulas sin tocar la BD: todos los candidatos "tienen" carátula.
const covers: CoverResolver = {
  first: async (ids) => ids[0] ?? null,
  take: async (ids, limit) => [...new Set(ids)].slice(0, limit),
  spent: 0,
  exhausted: false,
};

beforeEach(() => vi.clearAllMocks());

describe("generateCollection", () => {
  it("con menos del mínimo no consulta la BD ni abre transacción", async () => {
    const ids = Array.from({ length: MIN_ALBUMS_FOR_SECTION - 1 }, (_, i) => `a${i}`);
    const result = await generateCollection(templateReturning(ids), new Date(), covers);

    expect(result).toMatchObject({ status: "skipped", items: ids.length });
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("descarta ids repetidos antes de contar contra el mínimo", async () => {
    const ids = Array.from({ length: MIN_ALBUMS_FOR_SECTION + 2 }, () => "mismo");
    await expect(generateCollection(templateReturning(ids), new Date(), covers)).resolves.toMatchObject({
      status: "skipped",
      items: 1,
    });
  });

  it("una plantilla que se omite explica el motivo", async () => {
    const template: CollectionTemplate = {
      key: "t",
      rank: 1,
      weight: 0,
      plan: async () => ({ skip: "Sin premios cargados" }),
    };

    await expect(generateCollection(template, new Date(), covers)).resolves.toEqual({
      status: "skipped",
      items: 0,
      reason: "Sin premios cargados",
    });
  });
});

describe("previewCollection", () => {
  it("devuelve período, título y álbumes con carátula, sin escribir", async () => {
    const ids = Array.from({ length: 8 }, (_, i) => `a${i}`);
    const preview = await previewCollection(templateReturning(ids), new Date(), covers);

    expect(preview).toMatchObject({ key: "t", periodKey: "evergreen", title: "T", candidates: 8, reason: null });
    expect(preview.albumIds).toHaveLength(8);
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("explica cuántos candidatos tienen carátula cuando no llega al mínimo", async () => {
    const few: CoverResolver = { ...covers, take: async (ids) => ids.slice(0, 2) };
    const preview = await previewCollection(
      templateReturning(Array.from({ length: 9 }, (_, i) => `a${i}`)),
      new Date(),
      few,
    );

    expect(preview.reason).toBe(`Solo 2 de 9 candidatos tienen carátula (mínimo ${MIN_ALBUMS_FOR_SECTION})`);
    expect(preview.albumIds).toHaveLength(2);
  });

  it("avisa si el presupuesto de carátulas se agotó", async () => {
    const spent: CoverResolver = { ...covers, take: async () => [], exhausted: true, spent: 40 };
    const preview = await previewCollection(templateReturning(["a", "b"]), new Date(), spent);

    expect(preview.reason).toContain("se agotó el presupuesto de carátulas");
    expect(preview.coverBudgetExhausted).toBe(true);
  });

  it("propaga el motivo de una plantilla omitida", async () => {
    const template: CollectionTemplate = {
      key: "t",
      rank: 1,
      weight: 0,
      plan: async () => ({ skip: "Calendario vacío" }),
    };

    await expect(previewCollection(template, new Date(), covers)).resolves.toMatchObject({
      periodKey: null,
      reason: "Calendario vacío",
      albumIds: [],
    });
  });
});
