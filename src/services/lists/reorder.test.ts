import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

vi.mock("@/db", () => ({ db: {} }));
const { applyItemPlacements } = await import("./reorder");

const dialect = new PgDialect();
const LIST = "00000000-0000-4000-8000-000000000001";

/** Ejecuta `applyItemPlacements` contra un ejecutor falso y devuelve las sentencias que mandó. */
async function statements(placements: Parameters<typeof applyItemPlacements>[2]) {
  const execute = vi.fn<(query: SQL) => Promise<unknown[]>>(async () => []);
  await applyItemPlacements({ execute } as never, LIST, placements);
  return execute.mock.calls.map(([query]) => dialect.sqlToQuery(query));
}

describe("applyItemPlacements", () => {
  it("manda todo el orden en una sola sentencia, sea cual sea el tamaño de la lista", async () => {
    const placements = Array.from({ length: 300 }, (_, index) => ({ itemId: `item-${index}`, position: index + 1 }));
    const sent = await statements(placements);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.sql).toMatch(/^UPDATE user_list_item AS item\s+SET position = placed\.position\s+FROM \(VALUES/);
    expect(sent[0]!.sql).not.toContain("tier");
    // 2 parámetros por ítem + el id de la lista.
    expect(sent[0]!.params).toHaveLength(300 * 2 + 1);
    expect(sent[0]!.params.at(-1)).toBe(LIST);
  });

  it("en una tier list fija también el nivel, con la bandeja como null", async () => {
    const [query] = await statements([
      { itemId: "a", position: 1, tier: 0 },
      { itemId: "b", position: 2, tier: null },
    ]);
    expect(query!.sql).toContain("SET position = placed.position, tier = placed.tier");
    expect(query!.params).toEqual(["a", 1, 0, "b", 2, null, LIST]);
  });

  it("solo toca ítems de la lista indicada", async () => {
    const [query] = await statements([{ itemId: "a", position: 1 }]);
    expect(query!.sql).toMatch(/WHERE item\.list_id = \$\d+::uuid AND item\.id = placed\.id/);
  });

  it("sin ítems no manda nada", async () => {
    expect(await statements([])).toHaveLength(0);
  });
});
