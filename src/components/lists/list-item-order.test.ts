import { describe, expect, it } from "vitest";
import { moveByOffset, moveToEdge } from "./list-item-order";

const order = ["a", "b", "c", "d"];

describe("moveByOffset", () => {
  it("mueve una posición arriba y abajo", () => {
    expect(moveByOffset(order, "c", -1)).toEqual(["a", "c", "b", "d"]);
    expect(moveByOffset(order, "b", 1)).toEqual(["a", "c", "b", "d"]);
  });

  it("no hace nada en los extremos ni con ids desconocidos", () => {
    expect(moveByOffset(order, "a", -1)).toBe(order);
    expect(moveByOffset(order, "d", 1)).toBe(order);
    expect(moveByOffset(order, "z", 1)).toBe(order);
  });
});

describe("moveToEdge", () => {
  it("lleva al principio y al final conservando el orden relativo", () => {
    expect(moveToEdge(order, "c", "start")).toEqual(["c", "a", "b", "d"]);
    expect(moveToEdge(order, "b", "end")).toEqual(["a", "c", "d", "b"]);
  });

  it("id desconocido no cambia el orden", () => {
    expect(moveToEdge(order, "z", "start")).toBe(order);
  });
});
