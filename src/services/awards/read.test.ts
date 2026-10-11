import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const { orderNominations, sortCategoryEditions } = await import("./read");
import type { NominationView } from "./read";

const view = (id: string, won: boolean): NominationView => ({ id, won, text: id, credit: null, subject: null });

describe("orderNominations", () => {
  it("pone a los ganadores primero y respeta el orden curado dentro de cada grupo", () => {
    const rows = [
      { id: "a", won: false, sortOrder: 1 },
      { id: "b", won: true, sortOrder: 3 },
      { id: "c", won: false, sortOrder: 2 },
      { id: "d", won: true, sortOrder: 4 },
    ];
    const views = new Map(rows.map((r) => [r.id, view(r.id, r.won)]));
    expect(orderNominations(rows, views).map((n) => n.id)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("sortCategoryEditions", () => {
  it("campo general primero y, dentro de cada nivel, el orden curado", () => {
    const editions = [
      { key: "rock", tier: "genre" as const, sortOrder: 7 },
      { key: "bna", tier: "general" as const, sortOrder: 4 },
      { key: "pop", tier: "genre" as const, sortOrder: 5 },
      { key: "aoty", tier: "general" as const, sortOrder: 1 },
    ];
    expect(sortCategoryEditions(editions).map((e) => e.key)).toEqual(["aoty", "bna", "pop", "rock"]);
  });
});
