import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const { latestPerAward, orderNominations, sortCategoryEditions } = await import("./read");
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
  it("niveles en orden (general, álbum, género) y, dentro de cada uno, el orden curado", () => {
    const editions = [
      { key: "rock-perf", tier: "genre" as const, sortOrder: 30 },
      { key: "rock-album", tier: "album" as const, sortOrder: 7 },
      { key: "bna", tier: "general" as const, sortOrder: 4 },
      { key: "pop-perf", tier: "genre" as const, sortOrder: 20 },
      { key: "aoty", tier: "general" as const, sortOrder: 1 },
      { key: "pop-album", tier: "album" as const, sortOrder: 5 },
    ];
    expect(sortCategoryEditions(editions).map((e) => e.key)).toEqual([
      "aoty",
      "bna",
      "pop-album",
      "rock-album",
      "pop-perf",
      "rock-perf",
    ]);
  });
});

describe("latestPerAward", () => {
  const c = (awardSlug: string, heldOn: string) => ({ awardSlug, heldOn });

  it("deja la ceremonia más reciente de cada premio, de la más reciente a la más antigua", () => {
    const result = latestPerAward([
      c("grammy", "2025-02-02"),
      c("grammy", "2026-02-01"),
      c("mercury-prize", "2025-09-11"),
      c("brit-awards", "2026-02-28"),
      c("brit-awards", "2025-03-08"),
    ]);
    expect(result).toEqual([c("brit-awards", "2026-02-28"), c("grammy", "2026-02-01"), c("mercury-prize", "2025-09-11")]);
  });

  it("no pierde un premio aunque otros tengan ceremonias más recientes", () => {
    const many = ["a", "b", "c", "d", "e", "f"].flatMap((slug, i) => [c(slug, `2026-0${i + 1}-10`), c(slug, `2025-0${i + 1}-10`)]);
    const withOld = [...many, c("viejo", "2021-01-01")];
    expect(latestPerAward(withOld).map((x) => x.awardSlug)).toContain("viejo");
    expect(latestPerAward(withOld)).toHaveLength(7);
  });

  it("sin ceremonias da una lista vacía y desempata por premio si la fecha coincide", () => {
    expect(latestPerAward([])).toEqual([]);
    expect(latestPerAward([c("b", "2026-02-01"), c("a", "2026-02-01")]).map((x) => x.awardSlug)).toEqual(["a", "b"]);
  });
});
