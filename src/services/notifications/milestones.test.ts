import { describe, expect, it } from "vitest";
import {
  COMMENT_LIKE_MILESTONES,
  LIST_SAVE_MILESTONES,
  crossedMilestone,
  highestMilestone,
} from "./milestones";

describe("escala de likes", () => {
  it("no avisa antes del primero ni con conteos inválidos", () => {
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 0)).toBeNull();
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 9)).toBeNull();
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, -3)).toBeNull();
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, Number.NaN)).toBeNull();
  });

  it("devuelve el hito exacto en cada borde de la escala", () => {
    const expected: Array<[number, number]> = [
      [10, 10],
      [25, 25],
      [50, 50],
      [100, 100],
      [500, 500],
      [1000, 1000],
      [2500, 2500],
      [5000, 5000],
      [10000, 10000],
    ];
    for (const [count, milestone] of expected) {
      expect(highestMilestone(COMMENT_LIKE_MILESTONES, count)).toBe(milestone);
    }
  });

  it("mantiene el hito anterior entre dos hitos", () => {
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 11)).toBe(10);
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 24)).toBe(10);
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 9_999)).toBe(5_000);
  });

  it("un salto avisa solo el hito más alto", () => {
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 30)).toBe(25);
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 12_000)).toBe(10_000);
  });

  it("después de 10000 avanza cada 10000", () => {
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 10_001)).toBe(10_000);
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 19_999)).toBe(10_000);
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 20_000)).toBe(20_000);
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 34_567)).toBe(30_000);
    expect(highestMilestone(COMMENT_LIKE_MILESTONES, 1_000_000)).toBe(1_000_000);
  });
});

describe("escala de guardados", () => {
  it("empieza en el primer guardado", () => {
    expect(highestMilestone(LIST_SAVE_MILESTONES, 0)).toBeNull();
    expect(highestMilestone(LIST_SAVE_MILESTONES, 1)).toBe(1);
    expect(highestMilestone(LIST_SAVE_MILESTONES, 4)).toBe(1);
    expect(highestMilestone(LIST_SAVE_MILESTONES, 5)).toBe(5);
  });

  it("salta al hito más alto y mantiene el anterior entre hitos", () => {
    expect(highestMilestone(LIST_SAVE_MILESTONES, 7)).toBe(5);
    expect(highestMilestone(LIST_SAVE_MILESTONES, 999)).toBe(500);
    expect(highestMilestone(LIST_SAVE_MILESTONES, 1_000)).toBe(1_000);
  });

  it("después de 1000 avanza cada 1000", () => {
    expect(highestMilestone(LIST_SAVE_MILESTONES, 1_001)).toBe(1_000);
    expect(highestMilestone(LIST_SAVE_MILESTONES, 2_500)).toBe(2_000);
    expect(highestMilestone(LIST_SAVE_MILESTONES, 12_345)).toBe(12_000);
  });
});

describe("hito que cruza una interacción", () => {
  it("avisa solo cuando el conteo llega al hito", () => {
    expect(crossedMilestone(COMMENT_LIKE_MILESTONES, 9)).toBeNull();
    expect(crossedMilestone(COMMENT_LIKE_MILESTONES, 10)).toBe(10);
    expect(crossedMilestone(COMMENT_LIKE_MILESTONES, 11)).toBeNull();
    expect(crossedMilestone(COMMENT_LIKE_MILESTONES, 25)).toBe(25);
  });

  it("un hito ya pasado no se avisa con retraso", () => {
    expect(crossedMilestone(COMMENT_LIKE_MILESTONES, 16)).toBeNull();
    expect(crossedMilestone(LIST_SAVE_MILESTONES, 3)).toBeNull();
  });

  it("después del último valor suelto cruza en cada paso", () => {
    expect(crossedMilestone(COMMENT_LIKE_MILESTONES, 20_000)).toBe(20_000);
    expect(crossedMilestone(COMMENT_LIKE_MILESTONES, 20_001)).toBeNull();
    expect(crossedMilestone(LIST_SAVE_MILESTONES, 1)).toBe(1);
    expect(crossedMilestone(LIST_SAVE_MILESTONES, 2_000)).toBe(2_000);
  });
});
