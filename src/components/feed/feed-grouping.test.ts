import { describe, it, expect } from "vitest";
import { groupFeedRuns, type FeedEntryGroup, type FeedRotationPeak } from "./feed-grouping";
import type { FeedEntry } from "@/lib/api/schemas";

const ana = { id: "ana", username: "ana", displayName: "Ana" };
const beto = { id: "beto", username: "beto", displayName: "Beto" };

let seq = 0;
const iso = () => `2026-08-${String(30 - (seq % 28)).padStart(2, "0")}T00:00:00Z`;

// Para los tests de pico de rotación: `now` fijo y fechas controladas dentro
// o fuera de la ventana de 7 días.
const NOW = new Date("2026-09-10T00:00:00Z");
const dayBefore = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function targetListen(
  target: Extract<FeedEntry, { kind: "listen" }>["target"],
  createdAt: string,
  author = ana,
): FeedEntry {
  seq += 1;
  return {
    kind: "listen",
    id: `l${seq}`,
    listenContext: "relisten",
    body: null,
    reaction: null,
    audience: "public",
    createdAt,
    target,
    author,
  };
}
const song = (id: string): Extract<FeedEntry, { kind: "listen" }>["target"] => ({
  type: "recording",
  id,
  title: `Tema ${id}`,
  subtitle: null,
  artistName: "Artista",
  coverThumbUrl: null,
});
const album = (id: string): Extract<FeedEntry, { kind: "listen" }>["target"] => ({
  type: "release-group",
  id,
  title: `Disco ${id}`,
  subtitle: null,
  artistName: "Artista",
  coverThumbUrl: null,
});
const artistTarget = (id: string): Extract<FeedEntry, { kind: "listen" }>["target"] => ({
  type: "artist",
  id,
  title: `Artista ${id}`,
  subtitle: null,
  artistName: null,
  coverThumbUrl: null,
});

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
function albumSongListen(albumId: string, songId: string, author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "listen", id: `als${seq}`, listenContext: "first_listen", body: null, reaction: null,
    audience: "public", createdAt: iso(),
    target: {
      type: "recording", id: songId, title: `Tema ${songId}`, subtitle: null,
      artistName: "Artista del álbum", albumId, albumTitle: "Álbum de prueba", coverThumbUrl: null,
    },
    author,
  };
}
function albumSongRating(albumId: string, songId: string, author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "rating", id: `ars${seq}`, stars: "4.0", detailedScore: null, createdAt: iso(),
    target: {
      type: "recording", id: songId, title: `Tema ${songId}`,
      artistName: "Artista del álbum", albumId, albumTitle: "Álbum de prueba", coverThumbUrl: null,
    },
    author,
  };
}
function albumSongFavorite(albumId: string, songId: string, author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "favorite", id: `afv${seq}`, targetType: "recording", audience: "public", createdAt: iso(),
    target: {
      id: songId, title: `Tema ${songId}`,
      artistName: "Artista del álbum", albumId, albumTitle: "Álbum de prueba", coverThumbUrl: null,
    },
    author,
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
function follow(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "follow", id: `fo${seq}`, createdAt: iso(), author,
    followedUser: { id: `u${seq}`, username: `user${seq}`, displayName: `User ${seq}` },
  };
}
function followArtist(author = ana): FeedEntry {
  seq += 1;
  return {
    kind: "follow-artist", id: `fa${seq}`, createdAt: iso(), author,
    artist: { id: `art${seq}`, name: `Artista ${seq}` },
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

  it("pliega 3+ 'seguir a un usuario' consecutivos del mismo autor como grupo tier 4 (add-feed-kind-differentiation)", () => {
    const rows = groupFeedRuns([follow(), follow(), follow()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("group");
    expect((rows[0] as FeedEntryGroup).groupedKind).toBe("follow");
    expect((rows[0] as FeedEntryGroup).tier).toBe(4);
  });

  it("no pliega solo 2 'seguir a un usuario'", () => {
    expect(groupFeedRuns([follow(), follow()]).map((r) => r.kind)).toEqual(["follow", "follow"]);
  });

  it("no mezcla 'seguir a un usuario' con escuchas en un mismo grupo", () => {
    const rows = groupFeedRuns([follow(), follow(), listen(), listen(), listen()]);
    expect(rows.map((r) => r.kind)).toEqual(["follow", "follow", "group"]);
    expect((rows[2] as FeedEntryGroup).groupedKind).toBe("listen");
  });

  it("pliega 3+ 'seguir a un artista' consecutivos del mismo autor como grupo tier 4 (add-artist-follow-feed-entry)", () => {
    const rows = groupFeedRuns([followArtist(), followArtist(), followArtist()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("group");
    expect((rows[0] as FeedEntryGroup).groupedKind).toBe("follow-artist");
    expect((rows[0] as FeedEntryGroup).tier).toBe(4);
  });

  it("no pliega solo 2 'seguir a un artista'", () => {
    expect(groupFeedRuns([followArtist(), followArtist()]).map((r) => r.kind)).toEqual([
      "follow-artist",
      "follow-artist",
    ]);
  });

  it("no mezcla 'seguir a un usuario' y 'seguir a un artista' en una misma corrida", () => {
    const rows = groupFeedRuns([follow(), follow(), follow(), followArtist(), followArtist(), followArtist()]);
    expect(rows.map((r) => r.kind)).toEqual(["group", "group"]);
    expect((rows[0] as FeedEntryGroup).groupedKind).toBe("follow");
    expect((rows[1] as FeedEntryGroup).groupedKind).toBe("follow-artist");
  });

  it("la fecha del grupo es la de la entrada más reciente (la primera)", () => {
    const first = listen();
    const rows = groupFeedRuns([first, listen(), listen()]);
    expect((rows[0] as FeedEntryGroup).createdAt).toBe(first.createdAt);
  });

  describe("tramo de álbum: agrupación por tipo no contigua (add-feed-album-sweep)", () => {
    it("3 canciones valoradas del mismo álbum, seguidas, se agrupan (caso ya cubierto por la agrupación contigua)", () => {
      const rows = groupFeedRuns([
        albumSongRating("alb1", "s1"),
        albumSongRating("alb1", "s2"),
        albumSongRating("alb1", "s3"),
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0]!.kind).toBe("group");
      expect((rows[0] as FeedEntryGroup).groupedKind).toBe("rating");
      expect((rows[0] as FeedEntryGroup).entries).toHaveLength(3);
    });

    it("escucha + rating intercalados por canción se agrupan por tipo, cada uno por separado", () => {
      const rows = groupFeedRuns([
        albumSongListen("alb1", "s1"),
        albumSongRating("alb1", "s1"),
        albumSongListen("alb1", "s2"),
        albumSongRating("alb1", "s2"),
        albumSongListen("alb1", "s3"),
        albumSongRating("alb1", "s3"),
      ]);

      // dos grupos: 3 ratings + 3 escuchas, aunque nunca hubo dos seguidas del mismo kind
      const groups = rows.filter((r): r is FeedEntryGroup => r.kind === "group");
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.groupedKind).sort()).toEqual(["listen", "rating"]);
      expect(groups.every((g) => g.entries.length === 3)).toBe(true);
    });

    it("solo 2 canciones valoradas no alcanza el umbral: se muestran sueltas", () => {
      const rows = groupFeedRuns([albumSongRating("alb1", "s1"), albumSongRating("alb1", "s2")]);

      expect(rows.every((r) => r.kind !== "group")).toBe(true);
      expect(rows).toHaveLength(2);
    });

    it("no mezcla canciones de álbumes distintos en un mismo grupo", () => {
      const rows = groupFeedRuns([
        albumSongRating("alb1", "s1"),
        albumSongRating("alb1", "s2"),
        albumSongRating("alb2", "s3"),
        albumSongRating("alb2", "s4"),
        albumSongRating("alb2", "s5"),
      ]);

      // el segundo álbum sí alcanza el umbral (3); el primero no (2 sueltas)
      const groups = rows.filter((r): r is FeedEntryGroup => r.kind === "group");
      expect(groups).toHaveLength(1);
      expect(groups[0]!.entries.map((e) => (e.kind === "rating" ? e.target.id : null))).toEqual(["s3", "s4", "s5"]);
      expect(rows.filter((r) => r.kind === "rating")).toHaveLength(2);
    });

    it("no mezcla entre autores distintos", () => {
      const rows = groupFeedRuns([
        albumSongRating("alb1", "s1", ana),
        albumSongRating("alb1", "s2", ana),
        albumSongRating("alb1", "s3", beto),
      ]);

      expect(rows.every((r) => r.kind !== "group")).toBe(true);
      expect(rows).toHaveLength(3);
    });

    it("un comentario entre medio corta el tramo", () => {
      const rows = groupFeedRuns([
        albumSongRating("alb1", "s1"),
        albumSongRating("alb1", "s2"),
        comment(),
        albumSongRating("alb1", "s3"),
      ]);

      expect(rows.every((r) => r.kind !== "group")).toBe(true);
      expect(rows.map((r) => r.kind)).toEqual(["rating", "rating", "comment", "rating"]);
    });

    it("una entrada sin álbum resuelto después del tramo queda afuera, sin romper el grupo ya formado", () => {
      const rows = groupFeedRuns([
        albumSongRating("alb1", "s1"),
        albumSongRating("alb1", "s2"),
        albumSongRating("alb1", "s3"),
        ratingSong(), // sin albumId — corta el tramo, se evalúa aparte
      ]);

      expect(rows[0]!.kind).toBe("group");
      expect((rows[0] as FeedEntryGroup).entries).toHaveLength(3);
      expect(rows[1]!.kind).toBe("rating");
    });

    it("3 canciones marcadas como favorito (sin rating) también se agrupan", () => {
      const rows = groupFeedRuns([
        albumSongFavorite("alb1", "s1"),
        albumSongFavorite("alb1", "s2"),
        albumSongFavorite("alb1", "s3"),
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0]!.kind).toBe("group");
      expect((rows[0] as FeedEntryGroup).groupedKind).toBe("favorite");
      expect((rows[0] as FeedEntryGroup).entries).toHaveLength(3);
    });

    it("un favorito de paso (agregado y quitado) no le quita a un grupo de ratings la chance de alcanzar el umbral", () => {
      const rows = groupFeedRuns([
        albumSongRating("alb1", "s1"),
        albumSongFavorite("alb1", "s2"), // favorito de paso, entre medio
        albumSongRating("alb1", "s2"),
        albumSongRating("alb1", "s3"),
      ]);

      const ratingGroup = rows.find((r): r is FeedEntryGroup => r.kind === "group" && r.groupedKind === "rating");
      expect(ratingGroup?.entries).toHaveLength(3);
      // el favorito de paso queda como su propia fila suelta, no rompe el grupo de ratings
      expect(rows.some((r) => r.kind === "favorite")).toBe(true);
    });

    it("favorito y rating no se fusionan: cada uno necesita sus propias 3 canciones", () => {
      const rows = groupFeedRuns([
        albumSongFavorite("alb1", "s1"),
        albumSongRating("alb1", "s1"),
        albumSongFavorite("alb1", "s2"),
        albumSongRating("alb1", "s2"),
      ]);

      // 2 favoritos y 2 ratings — ninguno de los dos buckets alcanza el umbral
      expect(rows.every((r) => r.kind !== "group")).toBe(true);
      expect(rows).toHaveLength(4);
    });
  });

  describe("pico de rotación (add-feed-rotation-peak)", () => {
    it("3 escuchas del mismo tema en la ventana se sintetizan como pico de canción", () => {
      const rows = groupFeedRuns(
        [
          targetListen(song("rec-x"), dayBefore(1)),
          targetListen(song("rec-x"), dayBefore(3)),
          targetListen(song("rec-x"), dayBefore(5)),
        ],
        NOW,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.kind).toBe("rotation-peak");
      const peak = rows[0] as FeedRotationPeak;
      expect(peak.target).toMatchObject({ type: "recording", id: "rec-x", title: "Tema rec-x" });
      expect(peak.count).toBe(3);
      expect(peak.createdAt).toBe(dayBefore(1)); // el más reciente de la corrida
    });

    it("2 escuchas del mismo álbum en la ventana forman pico, aunque no alcancen GROUP_MIN", () => {
      const rows = groupFeedRuns(
        [targetListen(album("rg-y"), dayBefore(2)), targetListen(album("rg-y"), dayBefore(6))],
        NOW,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.kind).toBe("rotation-peak");
      expect((rows[0] as FeedRotationPeak).count).toBe(2);
      expect((rows[0] as FeedRotationPeak).target.type).toBe("release-group");
    });

    it("2 escuchas del mismo tema no forman pico (umbral de canción es 3)", () => {
      const rows = groupFeedRuns(
        [targetListen(song("rec-x"), dayBefore(1)), targetListen(song("rec-x"), dayBefore(2))],
        NOW,
      );
      expect(rows.map((r) => r.kind)).toEqual(["listen", "listen"]);
    });

    it("corrida del mismo tema con solo 1 registro en la ventana cae al grupo genérico", () => {
      const rows = groupFeedRuns(
        [
          targetListen(song("rec-x"), dayBefore(2)),
          targetListen(song("rec-x"), dayBefore(20)),
          targetListen(song("rec-x"), dayBefore(25)),
        ],
        NOW,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.kind).toBe("group");
    });

    it("corrida de temas distintos sigue siendo grupo genérico, no pico", () => {
      const rows = groupFeedRuns(
        [
          targetListen(song("rec-a"), dayBefore(1)),
          targetListen(song("rec-b"), dayBefore(2)),
          targetListen(song("rec-c"), dayBefore(3)),
        ],
        NOW,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.kind).toBe("group");
    });

    it("corrida del mismo artista nunca produce pico", () => {
      const rows = groupFeedRuns(
        [
          targetListen(artistTarget("art-1"), dayBefore(1)),
          targetListen(artistTarget("art-1"), dayBefore(2)),
          targetListen(artistTarget("art-1"), dayBefore(3)),
        ],
        NOW,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.kind).toBe("group");
    });

    it("una entrada con texto entre medio corta el pico", () => {
      const rows = groupFeedRuns(
        [
          targetListen(song("rec-x"), dayBefore(1)),
          targetListen(song("rec-x"), dayBefore(2)),
          comment(),
          targetListen(song("rec-x"), dayBefore(3)),
        ],
        NOW,
      );
      expect(rows.map((r) => r.kind)).toEqual(["listen", "listen", "comment", "listen"]);
    });

    it("el rastro reciente (self) también sintetiza el pico", () => {
      // `groupFeedRuns` es agnóstico a la variante; la omisión del autor la
      // decide el render. Acá solo verificamos que el pico se forma igual.
      const rows = groupFeedRuns(
        [
          targetListen(song("rec-x"), dayBefore(1), beto),
          targetListen(song("rec-x"), dayBefore(2), beto),
          targetListen(song("rec-x"), dayBefore(4), beto),
        ],
        NOW,
      );
      expect(rows[0]!.kind).toBe("rotation-peak");
      expect((rows[0] as FeedRotationPeak).author.id).toBe("beto");
    });
  });
});
