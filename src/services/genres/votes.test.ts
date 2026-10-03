import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appUser,
  genre,
  releaseGroup,
  releaseGroupEffectiveGenre,
  releaseGroupGenreScore,
  releaseGroupGenreVote,
} from "@/db/schema";

// Base mockeada: cada `select().from(tabla)` resuelve desde una cola por tabla y cada
// `execute` desde una cola en orden de llamada. El SQL real (vista de puntaje, tope, cascada) lo
// cubre el smoke test contra Postgres.
const state = vi.hoisted(() => ({
  byTable: new Map<unknown, unknown[][]>(),
  exec: [] as unknown[][],
  inserts: [] as unknown[],
  deletes: 0,
  restricted: false,
}));

vi.mock("@/db", () => {
  const makeChain = () => {
    let table: unknown;
    const chain: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve(state.byTable.get(table)?.shift() ?? []);
          return result.then.bind(result);
        }
        if (prop === "from") {
          return (t: unknown) => {
            table = t;
            return chain;
          };
        }
        return () => chain;
      },
    });
    return chain;
  };
  const db = {
    select: () => makeChain(),
    execute: async () => state.exec.shift() ?? [],
    insert: () => ({
      values: (v: unknown) => {
        state.inserts.push(v);
        return { onConflictDoUpdate: async () => undefined };
      },
    }),
    delete: () => ({
      where: async () => {
        state.deletes += 1;
      },
    }),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(db),
  };
  return { db };
});
vi.mock("@/services/auth/authorization", () => ({ hasActiveRestriction: async () => state.restricted }));

const { castGenreVote, removeGenreVote, getAlbumGenreVotes, getVoteAccess, MAX_VOTES_PER_ALBUM } = await import("./votes");

const RG = "00000000-0000-4000-8000-000000000001";
const USER = "00000000-0000-4000-8000-0000000000aa";

function queue(table: unknown, ...results: unknown[][]) {
  state.byTable.set(table, [...(state.byTable.get(table) ?? []), ...results]);
}

/** Álbum y género existentes, cuenta activa y (por defecto) con interacción previa. */
function happyPath(kind = "style") {
  queue(releaseGroup, [{ id: RG }]);
  queue(genre, [{ id: "g1", kind }]);
  queue(appUser, [{ deactivatedAt: null }]);
  state.exec = [[{ found: true }]];
}

beforeEach(() => {
  state.byTable = new Map();
  state.exec = [];
  state.inserts = [];
  state.deletes = 0;
  state.restricted = false;
});

describe("castGenreVote", () => {
  it("guarda el voto de una persona con interacción previa", async () => {
    happyPath();
    queue(releaseGroupGenreVote, []);
    await castGenreVote(USER, RG, "shoegaze", 1);
    expect(state.inserts).toEqual([{ userId: USER, releaseGroupId: RG, genreId: "g1", value: 1 }]);
  });

  it("rechaza un valor distinto de 1 y -1", async () => {
    await expect(castGenreVote(USER, RG, "shoegaze", 2)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    expect(state.inserts).toEqual([]);
  });

  it("rechaza un slug con formato inválido", async () => {
    await expect(castGenreVote(USER, RG, "No Valido!", 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("álbum inexistente → ALBUM_NOT_FOUND", async () => {
    queue(releaseGroup, []);
    await expect(castGenreVote(USER, RG, "shoegaze", 1)).rejects.toMatchObject({ code: "ALBUM_NOT_FOUND", status: 404 });
  });

  it("género inexistente → GENRE_NOT_FOUND", async () => {
    queue(releaseGroup, [{ id: RG }]);
    queue(genre, []);
    await expect(castGenreVote(USER, RG, "shoegaze", 1)).rejects.toMatchObject({ code: "GENRE_NOT_FOUND", status: 404 });
  });

  it("un descriptor no se vota", async () => {
    happyPath("descriptor");
    await expect(castGenreVote(USER, RG, "instrumental", 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    expect(state.inserts).toEqual([]);
  });

  it("un género oculto no se vota", async () => {
    happyPath("hidden");
    await expect(castGenreVote(USER, RG, "asmr", 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("sin interacción con el álbum → GENRE_VOTE_NO_INTERACTION", async () => {
    happyPath();
    state.exec = [[{ found: false }]];
    await expect(castGenreVote(USER, RG, "shoegaze", 1)).rejects.toMatchObject({
      code: "GENRE_VOTE_NO_INTERACTION",
      status: 403,
    });
    expect(state.inserts).toEqual([]);
  });

  it("con una suspensión social vigente → SOCIAL_SUSPENSION_ACTIVE", async () => {
    happyPath();
    state.restricted = true;
    await expect(castGenreVote(USER, RG, "shoegaze", 1)).rejects.toMatchObject({
      code: "SOCIAL_SUSPENSION_ACTIVE",
      status: 403,
    });
  });

  it("una cuenta desactivada no vota", async () => {
    happyPath();
    state.byTable.set(appUser, [[{ deactivatedAt: new Date() }]]);
    await expect(castGenreVote(USER, RG, "shoegaze", 1)).rejects.toMatchObject({ code: "PERMISSION_DENIED", status: 403 });
  });

  it("el voto número 9 se rechaza sin modificar nada", async () => {
    happyPath();
    queue(releaseGroupGenreVote, Array.from({ length: MAX_VOTES_PER_ALBUM }, (_, i) => ({ id: `v${i}` })));
    await expect(castGenreVote(USER, RG, "shoegaze", 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    expect(state.inserts).toEqual([]);
  });

  it("cambiar un voto existente con 8 géneros votados no cuenta como uno nuevo", async () => {
    happyPath();
    // Los otros géneros votados (sin contar este) son 7: aún cabe.
    queue(releaseGroupGenreVote, Array.from({ length: MAX_VOTES_PER_ALBUM - 1 }, (_, i) => ({ id: `v${i}` })));
    await castGenreVote(USER, RG, "shoegaze", -1);
    expect(state.inserts).toHaveLength(1);
  });
});

describe("removeGenreVote", () => {
  it("retira el voto sin exigir interacción", async () => {
    queue(releaseGroup, [{ id: RG }]);
    queue(genre, [{ id: "g1", kind: "style" }]);
    await removeGenreVote(USER, RG, "shoegaze");
    expect(state.deletes).toBe(1);
  });

  it("género inexistente → GENRE_NOT_FOUND", async () => {
    queue(releaseGroup, [{ id: RG }]);
    queue(genre, []);
    await expect(removeGenreVote(USER, RG, "shoegaze")).rejects.toMatchObject({ code: "GENRE_NOT_FOUND" });
  });
});

describe("getVoteAccess", () => {
  it("sin sesión no puede votar", async () => {
    await expect(getVoteAccess(null, RG)).resolves.toEqual({ canVote: false, reason: "signed_out" });
  });

  it("con interacción puede votar", async () => {
    queue(appUser, [{ deactivatedAt: null }]);
    state.exec = [[{ found: true }]];
    await expect(getVoteAccess(USER, RG)).resolves.toEqual({ canVote: true });
  });

  it("la suspensión va antes que la interacción", async () => {
    queue(appUser, [{ deactivatedAt: null }]);
    state.restricted = true;
    await expect(getVoteAccess(USER, RG)).resolves.toEqual({ canVote: false, reason: "suspended" });
  });
});

describe("getAlbumGenreVotes", () => {
  const effective = [
    { genreId: "g1", slug: "shoegaze", name: "shoegaze", nameEs: null, inherited: false, score: 4 },
    { genreId: "g2", slug: "dream-pop", name: "dream pop", nameEs: null, inherited: false, score: 2 },
    { genreId: "g3", slug: "noise-pop", name: "noise pop", nameEs: null, inherited: false, score: 1 },
  ];

  it("clasifica por puntaje, oculta las cifras con pocos votantes y no expone votos ajenos", async () => {
    queue(releaseGroupEffectiveGenre, effective);
    state.exec = [[{ voters: 3 }]];
    const result = await getAlbumGenreVotes(RG, null);
    expect(result.showCounts).toBe(false);
    expect(result.access).toEqual({ canVote: false, reason: "signed_out" });
    expect(result.genres.map((g) => [g.slug, g.rank, g.up, g.down, g.mine])).toEqual([
      ["shoegaze", "primary", null, null, null],
      ["dream-pop", "secondary", null, null, null],
      ["noise-pop", "other", null, null, null],
    ]);
  });

  it("con 5 votantes publica las cifras", async () => {
    queue(releaseGroupEffectiveGenre, effective);
    queue(releaseGroupGenreScore, [
      { genreId: "g1", up: 4, down: 0 },
      { genreId: "g2", up: 3, down: 1 },
    ]);
    state.exec = [[{ voters: 5 }]];
    const result = await getAlbumGenreVotes(RG, null);
    expect(result.showCounts).toBe(true);
    expect(result.genres[0]).toMatchObject({ slug: "shoegaze", up: 4, down: 0 });
    expect(result.genres[1]).toMatchObject({ slug: "dream-pop", up: 3, down: 1 });
  });

  it("con sesión incluye el voto propio, también el de un género que ya no es efectivo", async () => {
    queue(releaseGroupEffectiveGenre, effective);
    queue(releaseGroupGenreVote, [
      { genreId: "g1", value: 1, slug: "shoegaze", name: "shoegaze", nameEs: null },
      { genreId: "g9", value: -1, slug: "post-punk", name: "post-punk", nameEs: null },
    ]);
    queue(appUser, [{ deactivatedAt: null }]);
    state.exec = [[{ voters: 1 }], [{ found: true }]];
    const result = await getAlbumGenreVotes(RG, USER);
    expect(result.access).toEqual({ canVote: true });
    expect(result.genres.find((g) => g.slug === "shoegaze")?.mine).toBe(1);
    expect(result.genres.find((g) => g.slug === "post-punk")).toMatchObject({ mine: -1, score: 0, rank: "other" });
  });
});
