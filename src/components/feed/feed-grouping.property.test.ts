// @vitest-environment node
// Propiedades del plegado de corridas del feed (`groupFeedRuns`): sea cual sea la secuencia de escuchas, el plegado no pierde ni
// reordena nada, y cada grupo es un tramo contiguo de una sola persona y un solo tipo.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import type { FeedEntry } from "@/lib/api/schemas";
import { groupFeedRuns, type FeedRow } from "./feed-grouping";

type Listen = Extract<FeedEntry, { kind: "listen" }>;

const NOW = new Date("2026-09-10T00:00:00Z");
const HOUR = 60 * 60 * 1000;

const authors = [
  { id: "ana", username: "ana", displayName: "Ana" },
  { id: "beto", username: "beto", displayName: "Beto" },
  { id: "cami", username: "cami", displayName: "Cami" },
];

const targetArb = fc.oneof(
  fc.integer({ min: 1, max: 3 }).map((n) => ({ type: "recording" as const, id: `song-${n}`, title: `Tema ${n}`, subtitle: null, artistName: "Artista", coverThumbUrl: null })),
  fc.integer({ min: 1, max: 3 }).map((n) => ({ type: "release-group" as const, id: `album-${n}`, title: `Disco ${n}`, subtitle: null, artistName: "Artista", coverThumbUrl: null })),
  fc.integer({ min: 1, max: 2 }).map((n) => ({ type: "artist" as const, id: `artist-${n}`, title: `Artista ${n}`, subtitle: null, artistName: null, coverThumbUrl: null })),
);

/** Un feed real viene ordenado de la más reciente a la más antigua: las separaciones son acumuladas y nunca negativas. */
const feed: fc.Arbitrary<FeedEntry[]> = fc
  .array(
    fc.record({
      authorIndex: fc.integer({ min: 0, max: authors.length - 1 }),
      target: targetArb,
      gapHours: fc.integer({ min: 0, max: 60 }),
    }),
    { maxLength: 18 },
  )
  .map((items) => {
    let elapsed = 0;
    return items.map((item, i): Listen => {
      elapsed += item.gapHours;
      return {
        kind: "listen",
        id: `l${i}`,
        listenContext: "relisten",
        body: null,
        reaction: null,
        audience: "public",
        createdAt: new Date(NOW.getTime() - elapsed * HOUR).toISOString(),
        target: item.target,
        author: authors[item.authorIndex]!,
      };
    });
  });

const ids = (rows: FeedRow[]) => rows.map((row) => row.id);

describe("groupFeedRuns", () => {
  it("no inventa filas: nunca hay más filas que entradas, y una lista vacía da una lista vacía", () => {
    assertProperty(
      fc.property(feed, (entries) => {
        const rows = groupFeedRuns(entries, NOW);
        return rows.length <= entries.length && (entries.length > 0 || rows.length === 0);
      }),
    );
  });

  it("es una función pura: la misma entrada da el mismo resultado y no muta la lista", () => {
    assertProperty(
      fc.property(feed, (entries) => {
        const before = JSON.stringify(entries);
        const a = groupFeedRuns(entries, NOW);
        const b = groupFeedRuns(entries, NOW);
        return JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(entries) === before;
      }),
    );
  });

  it("los ids de las filas no se repiten (son la `key` de React)", () => {
    assertProperty(
      fc.property(feed, (entries) => {
        const all = ids(groupFeedRuns(entries, NOW));
        return new Set(all).size === all.length;
      }),
    );
  });

  it("cada grupo es un tramo contiguo y en orden de entradas de una sola persona y un solo tipo", () => {
    assertProperty(
      fc.property(feed, (entries) => {
        const indexById = new Map(entries.map((e, i) => [e.id, i]));
        return groupFeedRuns(entries, NOW).every((row) => {
          if (row.kind !== "group") return true;
          const positions = row.entries.map((e) => indexById.get(e.id));
          const contiguous = positions.every((p, i) => p !== undefined && (i === 0 || p === positions[i - 1]! + 1));
          return (
            row.entries.length >= 2 &&
            contiguous &&
            row.entries.every((e) => e.author.id === row.author.id && e.kind === row.groupedKind) &&
            row.createdAt === row.entries[0]!.createdAt
          );
        });
      }),
    );
  });

  it("conserva el orden: las filas aparecen en el mismo orden que la primera entrada que representan", () => {
    assertProperty(
      fc.property(feed, (entries) => {
        const indexById = new Map(entries.map((e, i) => [e.id, i]));
        const anchors = groupFeedRuns(entries, NOW).flatMap((row) => {
          if (row.kind === "group") return [indexById.get(row.entries[0]!.id)!];
          if (row.kind === "listen") return [indexById.get(row.id)!];
          return []; // picos de rotación y filas de álbum: su id no es el de una entrada
        });
        return anchors.every((p, i) => i === 0 || p > anchors[i - 1]!);
      }),
    );
  });

  it("una sola escucha queda tal cual, sin plegar", () => {
    assertProperty(
      fc.property(
        feed.filter((entries) => entries.length === 1),
        (entries) => {
          const rows = groupFeedRuns(entries, NOW);
          return rows.length === 1 && rows[0]!.id === entries[0]!.id;
        },
      ),
    );
  });
});
