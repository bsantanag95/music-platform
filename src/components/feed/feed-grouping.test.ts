import { describe, it, expect } from "vitest";
import { groupFeedRuns, type FeedEntryGroup } from "./feed-grouping";
import type { FeedEntry } from "@/lib/api/schemas";

const ana = { id: "ana", username: "ana", displayName: "Ana" };
const beto = { id: "beto", username: "beto", displayName: "Beto" };

let seq = 0;
const iso = () => `2026-08-${String(30 - (seq % 28)).padStart(2, "0")}T00:00:00Z`;

function listen(author = ana, overrides: Partial<Extract<FeedEntry, { kind: "listen" }>> = {}): FeedEntry {
  seq += 1;
  return {
    kind: "listen", id: `l${seq}`, listenContext: "first_listen", body: null, reaction: null,
    audience: "public", createdAt: iso(),
    target: { type: "recording", id: `rec${seq}`, title: `Tema ${seq}`, subtitle: null, artistName: null, coverThumbUrl: null },
    author, ...overrides,
  };
}
function favoriteAlbum(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "favorite", id: `f${seq}`, targetType: "release-group", audience: "public", createdAt: iso(),
    target: { id: `rg${seq}`, title: `Disco ${seq}`, artistName: null, coverThumbUrl: null }, author,
  };
}
function ratingAlbum(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "rating", id: `ra${seq}`, stars: "4.0", detailedScore: null, createdAt: iso(),
    target: { type: "release-group", id: `rg${seq}`, title: `Disco ${seq}`, artistName: null, coverThumbUrl: null }, author,
  };
}
function ratingSong(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "rating", id: `rs${seq}`, stars: "4.0", detailedScore: null, createdAt: iso(),
    target: { type: "recording", id: `rec${seq}`, title: `Tema ${seq}`, artistName: null, coverThumbUrl: null }, author,
  };
}
function comment(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "comment", id: `c${seq}`, body: "Algo escrito", createdAt: iso(),
    target: { type: "release-group", id: `rg${seq}`, title: `Disco ${seq}`, artistName: null, coverThumbUrl: null }, author,
  };
}
function review(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "review", id: `rv${seq}`, title: null, body: "Reseña", createdAt: iso(),
    target: { type: "release-group", id: `rg${seq}`, title: `Disco ${seq}`, artistName: null, coverThumbUrl: null }, author,
  };
}

describe("groupFeedRuns", () => {
  it("pliega 3+ escuchas consecutivas del mismo autor (tier 3)", () => {
    const rows = groupFeedRuns([listen(), listen(), listen()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("group");
    expect((rows[0] as FeedEntryGroup).groupedKind).toBe("listen");
    expect((rows[0] as FeedEntryGroup).tier).toBe(3);
  });

  it("no pliega solo 2", () => {
    expect(groupFeedRuns([listen(), listen()]).map((r) => r.kind)).toEqual(["listen", "listen"]);
  });

  it("pliega 3+ favoritos de álbum como grupo tier 2", () => {
    const rows = groupFeedRuns([favoriteAlbum(), favoriteAlbum(), favoriteAlbum()]);
    expect(rows[0]!.kind).toBe("group");
    expect((rows[0] as FeedEntryGroup).tier).toBe(2);
  });

  it("3 ratings de canción se colapsan, 2 ratings de álbum no, y no se fusionan", () => {
    const rows = groupFeedRuns([ratingAlbum(), ratingAlbum(), ratingSong(), ratingSong(), ratingSong()]);
    // los 2 de álbum sueltos + el grupo de 3 de canción
    expect(rows.map((r) => r.kind)).toEqual(["rating", "rating", "group"]);
    expect((rows[2] as FeedEntryGroup).tier).toBe(3);
    expect((rows[2] as FeedEntryGroup).entries).toHaveLength(3);
  });

  it("un comentario en el medio corta la corrida", () => {
    const rows = groupFeedRuns([listen(), listen(), comment(), listen(), listen()]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "comment", "listen", "listen"]);
  });

  it("una reseña en el medio corta la corrida", () => {
    const rows = groupFeedRuns([favoriteAlbum(), favoriteAlbum(), review(), favoriteAlbum(), favoriteAlbum()]);
    expect(rows.map((r) => r.kind)).toEqual(["favorite", "favorite", "review", "favorite", "favorite"]);
  });

  it("una escucha con nota corta la corrida y nunca se colapsa", () => {
    const rows = groupFeedRuns([
      listen(), listen(), listen(ana, { body: "Me voló" }), listen(), listen(), listen(),
    ]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "listen", "group"]);
  });

  it("no mezcla escuchas y favoritos en un mismo grupo", () => {
    const rows = groupFeedRuns([listen(), listen(), favoriteAlbum(), favoriteAlbum(), favoriteAlbum()]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "group"]);
    expect((rows[2] as FeedEntryGroup).groupedKind).toBe("favorite");
  });

  it("no agrupa entre autores distintos", () => {
    const rows = groupFeedRuns([listen(ana), listen(ana), listen(beto), listen(beto)]);
    expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "listen", "listen"]);
  });

  it("la fecha del grupo es la de la entrada más reciente (la primera)", () => {
    const first = listen();
    const rows = groupFeedRuns([first, listen(), listen()]);
    expect((rows[0] as FeedEntryGroup).createdAt).toBe(first.createdAt);
  });
});
