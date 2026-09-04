import { describe, it, expect } from "vitest";
import { groupAmbientRuns, type FeedEntryGroup } from "./feed-grouping";
import type { FeedEntry } from "@/lib/api/schemas";

const ana = { id: "ana", username: "ana", displayName: "Ana" };
const beto = { id: "beto", username: "beto", displayName: "Beto" };

let seq = 0;
function listen(
  author = ana,
  overrides: Partial<Extract<FeedEntry, { kind: "listen" }>> = {},
): FeedEntry {
  seq += 1;
  return {
    kind: "listen",
    id: `l${seq}`,
    listenContext: "first_listen",
    body: null,
    reaction: null,
    audience: "public",
    createdAt: `2026-08-${String(30 - seq).padStart(2, "0")}T00:00:00Z`,
    target: { type: "recording", id: `rec${seq}`, title: `Tema ${seq}`, subtitle: null, artistName: null, coverThumbUrl: null },
    author,
    ...overrides,
  };
}

function favorite(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "favorite",
    id: `f${seq}`,
    targetType: "release-group",
    audience: "public",
    createdAt: `2026-08-${String(30 - seq).padStart(2, "0")}T00:00:00Z`,
    target: { id: `rg${seq}`, title: `Disco ${seq}`, artistName: null, coverThumbUrl: null },
    author,
  };
}

function comment(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "comment",
    id: `c${seq}`,
    body: "Algo escrito",
    createdAt: `2026-08-${String(30 - seq).padStart(2, "0")}T00:00:00Z`,
    target: { type: "release-group", id: `rg${seq}`, title: `Disco ${seq}`, artistName: null, coverThumbUrl: null },
    author,
  };
}

describe("groupAmbientRuns", () => {
  it("pliega 3+ escuchas consecutivas del mismo autor en un grupo", () => {
    const rows = groupAmbientRuns([listen(), listen(), listen()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("group");
    expect((rows[0] as FeedEntryGroup).entries).toHaveLength(3);
    expect((rows[0] as FeedEntryGroup).groupedKind).toBe("listen");
  });

  it("no pliega solo 2", () => {
    const rows = groupAmbientRuns([listen(), listen()]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen"]);
  });

  it("un comentario en el medio corta la corrida", () => {
    const rows = groupAmbientRuns([listen(), listen(), comment(), listen(), listen()]);
    // 2 + comentario + 2 → nada llega a 3
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "comment", "listen", "listen"]);
  });

  it("una escucha con nota corta la corrida y nunca se colapsa", () => {
    const rows = groupAmbientRuns([
      listen(),
      listen(),
      listen(ana, { body: "Me voló la cabeza" }),
      listen(),
      listen(),
      listen(),
    ]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "listen", "group"]);
    expect((rows[3] as FeedEntryGroup).entries).toHaveLength(3);
  });

  it("no mezcla escuchas y favoritos en un mismo grupo", () => {
    const rows = groupAmbientRuns([listen(), listen(), favorite(), favorite(), favorite()]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "group"]);
    expect((rows[2] as FeedEntryGroup).groupedKind).toBe("favorite");
  });

  it("no agrupa entre autores distintos", () => {
    const rows = groupAmbientRuns([listen(ana), listen(ana), listen(beto), listen(beto)]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "listen", "listen"]);
  });

  it("la fecha del grupo es la de la entrada más reciente (la primera)", () => {
    const first = listen();
    const rows = groupAmbientRuns([first, listen(), listen()]);
    expect((rows[0] as FeedEntryGroup).createdAt).toBe(first.createdAt);
  });
});
