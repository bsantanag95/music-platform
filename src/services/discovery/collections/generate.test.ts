import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_ALBUMS_FOR_SECTION } from "../constants";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), transaction: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));

import { generateCollection } from "./generate";
import type { CollectionTemplate } from "./templates";

function templateReturning(ids: string[]): CollectionTemplate {
  return {
    key: "t",
    rank: 1,
    periodKey: () => "evergreen",
    title: () => "T",
    select: async () => ids,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("generateCollection", () => {
  it("con menos del mínimo no consulta la BD ni abre transacción", async () => {
    const ids = Array.from({ length: MIN_ALBUMS_FOR_SECTION - 1 }, (_, i) => `a${i}`);
    await expect(generateCollection(templateReturning(ids))).resolves.toEqual({ status: "skipped", items: ids.length });
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("descarta ids repetidos antes de contar contra el mínimo", async () => {
    const ids = Array.from({ length: MIN_ALBUMS_FOR_SECTION + 2 }, () => "mismo");
    await expect(generateCollection(templateReturning(ids))).resolves.toEqual({ status: "skipped", items: 1 });
  });
});
