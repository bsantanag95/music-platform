// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fanLayout, initialsOf, stageBackdrop, stageCovers, stagePortrait, wallCells } from "./artist-stage";

const item = (id: string, year: number | null, cover = true) => ({
  id,
  title: `Disco ${id}`,
  year,
  coverThumbUrl: cover ? `/c/${id}.jpg` : null,
  coverResolved: true,
});

describe("stageCovers", () => {
  it("toma solo la sección principal, con carátula, en orden y sin repetir", () => {
    const covers = stageCovers({
      sections: [
        { key: "main", items: [item("a", 1980), item("b", 1981, false), item("a", 1980), item("c", 1982)] },
        { key: "live", items: [item("d", 1985)] },
      ],
    });
    expect(covers.map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("sin discografía no hay carátulas", () => {
    expect(stageCovers(null)).toEqual([]);
  });
});

describe("stageBackdrop", () => {
  const covers = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `${i}`, title: `${i}`, year: 2000 + i, thumbUrl: `/${i}` }));

  it("muro desde 8, abanico de 1 a 7 y disco dibujado sin carátulas", () => {
    expect(stageBackdrop(covers(17)).mode).toBe("wall");
    expect(stageBackdrop(covers(8)).mode).toBe("wall");
    expect(stageBackdrop(covers(7))).toMatchObject({ mode: "fan" });
    expect(stageBackdrop(covers(7)).covers).toHaveLength(5);
    expect(stageBackdrop(covers(1)).mode).toBe("fan");
    expect(stageBackdrop([])).toEqual({ mode: "none", covers: [] });
  });

  it("el muro repite las carátulas en ciclo", () => {
    expect(wallCells(covers(2), 5).map((c) => c.id)).toEqual(["0", "1", "0", "1", "0"]);
  });

  it("una funda sola va sin giro grande; varias se reparten", () => {
    expect(fanLayout(1)).toEqual([{ left: 0, rotate: -2 }]);
    expect(fanLayout(3).map((f) => f.rotate)).toEqual([-3, 0, 3]);
  });
});

describe("stagePortrait", () => {
  const covers = [
    { id: "a", title: "A", year: 1980, thumbUrl: "/a" },
    { id: "b", title: "B", year: 1990, thumbUrl: "/b" },
    { id: "c", title: "C", year: null, thumbUrl: "/c" },
  ];

  it("con foto, la foto", () => {
    expect(stagePortrait(true, covers, "a", "Iron Maiden")).toEqual({ kind: "photo" });
  });

  it("sin foto, el mejor valorado o el más reciente con año", () => {
    expect(stagePortrait(false, covers, "a", "X")).toMatchObject({ kind: "cover", cover: { id: "a" } });
    expect(stagePortrait(false, covers, null, "X")).toMatchObject({ kind: "cover", cover: { id: "b" } });
  });

  it("sin foto ni carátulas, las iniciales", () => {
    expect(stagePortrait(false, [], null, "Iron Maiden")).toEqual({ kind: "initials", initials: "IM" });
    expect(initialsOf("Metallica")).toBe("M");
    expect(initialsOf("¡Álvaro díaz")).toBe("ÁD");
    expect(initialsOf("  ")).toBe("?");
  });
});
