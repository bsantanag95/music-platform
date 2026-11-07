import { describe, expect, it } from "vitest";
import { TRAY_GROUP, locateItem, moveItem, removeFromArrangement, shiftItem, type TierArrangement } from "./tier-arrangement";

const base = (): TierArrangement => ({ tiers: [["a", "b"], ["c"], [], [], [], []], tray: ["d"] });

describe("tier-arrangement", () => {
  it("mueve al final de otro nivel", () => {
    expect(moveItem(base(), "d", 0)).toEqual({ tiers: [["a", "b", "d"], ["c"], [], [], [], []], tray: [] });
  });

  it("mueve antes de un disco", () => {
    expect(moveItem(base(), "c", 0, "b").tiers[0]).toEqual(["a", "c", "b"]);
  });

  it("dentro del mismo nivel, antes de otro", () => {
    expect(moveItem(base(), "b", 0, "a").tiers[0]).toEqual(["b", "a"]);
  });

  it("a la bandeja", () => {
    const moved = moveItem(base(), "a", TRAY_GROUP);
    expect(moved.tray).toEqual(["d", "a"]);
    expect(moved.tiers[0]).toEqual(["b"]);
  });

  it("no cambia con un ítem desconocido, un grupo fuera de rango o soltando sobre sí mismo", () => {
    const start = base();
    expect(moveItem(start, "x", 0)).toBe(start);
    expect(moveItem(start, "a", 7)).toBe(start);
    expect(moveItem(start, "a", 0, "a")).toBe(start);
  });

  it("corre a izquierda y derecha sin salir del nivel", () => {
    expect(shiftItem(base(), "b", -1).tiers[0]).toEqual(["b", "a"]);
    expect(shiftItem(base(), "a", -1)).toEqual(base());
    expect(shiftItem(base(), "b", 1)).toEqual(base());
  });

  it("ubica y quita", () => {
    expect(locateItem(base(), "d")).toEqual({ group: TRAY_GROUP, index: 0 });
    expect(locateItem(base(), "z")).toBeNull();
    expect(removeFromArrangement(base(), "c").tiers[1]).toEqual([]);
  });

  it("no muta la disposición recibida", () => {
    const start = base();
    moveItem(start, "a", 3);
    expect(start).toEqual(base());
  });
});
