import { describe, expect, it } from "vitest";
import { groupByField } from "./group-by-field";

describe("groupByField", () => {
  it("agrupa tramos consecutivos del mismo campo y respeta el orden", () => {
    const items = [
      { key: "a", field: "pop" },
      { key: "b", field: "pop" },
      { key: "c", field: "rap" },
    ];
    expect(groupByField(items).map((g) => [g.field, g.items.map((i) => i.key)])).toEqual([
      ["pop", ["a", "b"]],
      ["rap", ["c"]],
    ]);
  });

  it("las categorías sin campo forman un solo grupo sin clave", () => {
    const items = [
      { key: "a", field: null },
      { key: "b", field: null },
    ];
    expect(groupByField(items)).toEqual([{ field: null, items }]);
  });

  it("lista vacía", () => {
    expect(groupByField([])).toEqual([]);
  });
});
