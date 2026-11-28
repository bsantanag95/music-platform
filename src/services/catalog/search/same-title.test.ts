// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { albumView, sameTitleAsQuery } from "./same-title";

const titles = (...list: string[]) => list.map((title) => ({ title }));

describe("sameTitleAsQuery (redesign-search-phase3)", () => {
  it("ignora mayúsculas, puntuación y el artículo inicial", () => {
    expect(sameTitleAsQuery("THE WALL", "the wall")).toBe(true);
    expect(sameTitleAsQuery("Wall", "the wall")).toBe(true);
    expect(sameTitleAsQuery("Creep!", "creep")).toBe(true);
    expect(sameTitleAsQuery("The Wall (Live)", "the wall")).toBe(false);
    expect(sameTitleAsQuery("Anything", "")).toBe(false);
  });
});

describe("albumView (redesign-search-phase3)", () => {
  it("the wall: casi todos iguales → rejilla", () => {
    expect(albumView("the wall", titles("The Wall", "THE WALL", "The Wall", "The Wall", "Wall Street"))).toBe("grid");
  });

  it("ok computer: títulos distintos → filas", () => {
    expect(
      albumView("ok computer", titles("Ok Computer", "OK Computer Turns 10", "A Tribute to OK Computer", "OKX", "Mojo Presents")),
    ).toBe("rows");
  });

  it("menos de 4 discos → filas", () => {
    expect(albumView("the wall", titles("The Wall", "The Wall", "The Wall"))).toBe("rows");
  });

  it("solo depende de los títulos: el orden no cambia la vista", () => {
    const pool = ["The Wall", "the wall", "Other", "Wall", "Brick"];
    assertProperty(
      fc.property(fc.array(fc.constantFrom(...pool), { maxLength: 10 }), (list) => {
        const reversed = [...list].reverse();
        return albumView("the wall", titles(...list)) === albumView("the wall", titles(...reversed));
      }),
    );
  });
});
