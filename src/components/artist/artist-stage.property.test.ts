// @vitest-environment node
// Propiedades de la portada del artista (openspec: modernize-artist-page-phase1): sea cual sea la discografía, el fondo cae
// en un modo, el abanico no pasa de 5 fundas, el muro no deja celdas vacías y el retrato nunca queda vacío.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { FAN_MAX, WALL_CELLS, WALL_MIN, fanLayout, stageBackdrop, stagePortrait, wallCells, type StageCover } from "./artist-stage";

const coversArb: fc.Arbitrary<StageCover[]> = fc
  .uniqueArray(fc.integer({ min: 1, max: 200 }), { maxLength: 40 })
  .chain((ids) =>
    fc.tuple(...ids.map((id) => fc.option(fc.integer({ min: 1950, max: 2026 }), { nil: null }).map((year) => ({ id: `rg-${id}`, title: `Disco ${id}`, year, thumbUrl: `/c/${id}.jpg` })))),
  )
  .map((covers) => covers as StageCover[]);

describe("stageBackdrop", () => {
  it("elige el modo por la cantidad de carátulas y no inventa discos", () => {
    assertProperty(
      fc.property(coversArb, (covers) => {
        const { mode, covers: shown } = stageBackdrop(covers);
        const expected = covers.length >= WALL_MIN ? "wall" : covers.length >= 1 ? "fan" : "none";
        const ids = new Set(covers.map((c) => c.id));
        return mode === expected && shown.every((c) => ids.has(c.id)) && new Set(shown.map((c) => c.id)).size === shown.length;
      }),
    );
  });

  it("el abanico no pasa de 5 fundas y tiene una posición por funda", () => {
    assertProperty(
      fc.property(coversArb, (covers) => {
        const backdrop = stageBackdrop(covers);
        if (backdrop.mode !== "fan") return true;
        return backdrop.covers.length <= FAN_MAX && fanLayout(backdrop.covers.length).length === backdrop.covers.length;
      }),
    );
  });

  it("el muro llena todas sus celdas con carátulas del artista", () => {
    assertProperty(
      fc.property(coversArb, (covers) => {
        const backdrop = stageBackdrop(covers);
        if (backdrop.mode !== "wall") return true;
        const cells = wallCells(backdrop.covers);
        return cells.length === WALL_CELLS && cells.every(Boolean);
      }),
    );
  });
});

describe("stagePortrait", () => {
  it("nunca queda vacío: foto, una carátula del artista o iniciales", () => {
    assertProperty(
      fc.property(fc.boolean(), coversArb, fc.option(fc.integer({ min: 1, max: 200 }), { nil: null }), fc.string(), (hasPhoto, covers, best, name) => {
        const portrait = stagePortrait(hasPhoto, covers, best === null ? null : `rg-${best}`, name);
        if (hasPhoto) return portrait.kind === "photo";
        if (covers.length > 0) return portrait.kind === "cover" && covers.some((c) => c.id === portrait.cover.id);
        return portrait.kind === "initials" && portrait.initials.length > 0;
      }),
    );
  });
});
