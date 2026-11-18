// @vitest-environment node
// Idempotencia del backfill de categorías (`scripts/backfill-release-group-category.ts`): aplicar el plan una vez y volver a planear
// no debe producir más cambios. Es la propiedad que permite reanudar un backfill interrumpido sin miedo.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { mapReleaseGroupCategory } from "../musicbrainz/mappers";
import { planCategoryUpdates, type FetchedTypes, type StoredCategory } from "./release-group-category";

const CATEGORIES = ["studio", "single_ep", "compilation", "live_other", "categoria-vieja"];

const stored = fc.uniqueArray(
  fc.record({
    id: fc.uuid(),
    mbid: fc.uuid(),
    title: fc.string({ maxLength: 12 }),
    category: fc.constantFrom(...CATEGORIES),
  }),
  { selector: (r) => r.mbid, maxLength: 10 },
);

const fetchedFor = (rows: StoredCategory[]) =>
  fc.tuple(
    fc.array(
      fc.record({
        primaryType: fc.option(fc.constantFrom("Album", "Single", "EP", "Broadcast", "Other"), { nil: undefined }),
        secondaryTypes: fc.option(fc.array(fc.constantFrom("Compilation", "Live", "Soundtrack", "Demo", "Remix"), { maxLength: 3 }), {
          nil: undefined,
        }),
      }),
      { minLength: rows.length, maxLength: rows.length },
    ),
    // Algunas filas guardadas no vuelven en la respuesta de MusicBrainz: el plan no debe tocarlas.
    fc.array(fc.boolean(), { minLength: rows.length, maxLength: rows.length }),
  ).map(([types, present]) =>
    rows.flatMap((row, i) => (present[i] ? [{ mbid: row.mbid, ...types[i]! } satisfies FetchedTypes] : [])),
  );

const scenario = stored.chain((rows) => fc.tuple(fc.constant(rows), fetchedFor(rows)));

function apply(rows: StoredCategory[], updates: ReturnType<typeof planCategoryUpdates>): StoredCategory[] {
  const byId = new Map(updates.map((u) => [u.id, u.to]));
  return rows.map((row) => (byId.has(row.id) ? { ...row, category: byId.get(row.id)! } : row));
}

describe("planCategoryUpdates", () => {
  it("es idempotente: tras aplicar el plan, volver a planear no cambia nada", () => {
    assertProperty(
      fc.property(scenario, ([rows, fetched]) => {
        const next = apply(rows, planCategoryUpdates(rows, fetched));
        return planCategoryUpdates(next, fetched).length === 0;
      }),
    );
  });

  it("solo toca filas que MusicBrainz devolvió, y solo cuando la categoría realmente cambia", () => {
    assertProperty(
      fc.property(scenario, ([rows, fetched]) => {
        const fetchedByMbid = new Map(fetched.map((f) => [f.mbid, f]));
        return planCategoryUpdates(rows, fetched).every((u) => {
          const types = fetchedByMbid.get(u.mbid);
          return types !== undefined && u.from !== u.to && u.to === mapReleaseGroupCategory(types.primaryType, types.secondaryTypes);
        });
      }),
    );
  });

  it("no depende del orden de las filas ni del de la respuesta", () => {
    assertProperty(
      fc.property(scenario, ([rows, fetched]) => {
        const key = (u: { id: string; to: string }) => `${u.id}:${u.to}`;
        const a = planCategoryUpdates(rows, fetched).map(key).sort();
        const b = planCategoryUpdates([...rows].reverse(), [...fetched].reverse()).map(key).sort();
        return JSON.stringify(a) === JSON.stringify(b);
      }),
    );
  });
});
