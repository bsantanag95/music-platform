import { describe, expect, it } from "vitest";
import { tierTileSize } from "./TierFrame";

const post = { height: 1000, width: 952, label: 120 };

describe("tierTileSize", () => {
  it("con pocos discos usa la ficha más grande", () => {
    expect(tierTileSize([3, 2, 1, 0, 0, 0], post)).toBe(120);
  });

  it("se achica con la fila más llena y nunca baja del mínimo", () => {
    const many = tierTileSize([20, 10, 8, 6, 4, 2], post);
    expect(many).toBeLessThan(120);
    expect(tierTileSize([50, 0, 0, 0, 0, 0], post)).toBeGreaterThanOrEqual(24);
  });

  it("cabe en el alto del cuerpo", () => {
    for (const counts of [[12, 10, 10, 8, 6, 4], [50, 0, 0, 0, 0, 0], [9, 9, 9, 9, 9, 5]]) {
      const tile = tierTileSize(counts, post);
      const perLine = Math.floor((post.width - post.label - 6 + 6) / (tile + 6));
      const height = counts.reduce((sum, count) => {
        const lines = Math.max(1, Math.ceil(count / perLine));
        return sum + lines * tile + (lines - 1) * 6 + 12;
      }, 0) + 8 * 5;
      expect(height).toBeLessThanOrEqual(post.height);
    }
  });
});
