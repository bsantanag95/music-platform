// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

const mocks = vi.hoisted(() => ({
  ownerRows: [] as unknown[],
  review: vi.fn(),
  permalink: vi.fn(),
  list: vi.fn(),
  generated: vi.fn(),
  camino: vi.fn(),
  profile: vi.fn(),
  collection: vi.fn(),
  fingerprint: vi.fn(),
  album: vi.fn(),
  artist: vi.fn(),
  song: vi.fn(),
  profileTarget: vi.fn(),
  username: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => mocks.ownerRows }) }) }) }) },
}));
vi.mock("@/services/reviews", () => ({ getReviewDetail: mocks.review }));
vi.mock("@/services/social", () => ({ getCommentPermalink: mocks.permalink }));
vi.mock("@/services/lists/lists", () => ({ getUserListDetail: mocks.list }));
vi.mock("@/services/discovery/collections/generated", () => ({ generatedRefsFor: mocks.generated }));
vi.mock("@/services/camino/camino", () => ({ getUserCaminoDetail: mocks.camino }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.profile }));
vi.mock("@/services/collection/collection", () => ({ listProfileCollection: mocks.collection }));
vi.mock("@/services/profiles/stats", () => ({ getTasteFingerprint: mocks.fingerprint }));
vi.mock("./catalog", () => ({ loadAlbumTarget: mocks.album, loadArtistTarget: mocks.artist, loadSongTarget: mocks.song }));
vi.mock("./collections", () => ({ mosaicCredits: () => ["Carátulas: Cover Art Archive"] }));
vi.mock("./profile", () => ({ loadProfileTargetByUsername: mocks.profileTarget, usernameOfAccount: mocks.username }));

import {
  loadCaminoTarget,
  loadCommentTarget,
  loadFingerprintTarget,
  loadListTarget,
  loadReviewTarget,
  loadUserCollectionTarget,
} from "./user-content";

const media = { type: "cover", cover: { url: "https://coverartarchive.org/a", fallbackTitle: "Disco", fallbackSubtitle: null } };
const base = { card: { title: "Disco", subtitle: "Banda", media, credits: ["Datos: MusicBrainz"] } };
const reviewDetail = {
  review: { id: ID, user: { username: "ana", deactivated: false }, body: "Un disco enorme.", rating: { stars: 4.5, detailedScore: 86 } },
  album: { id: "rg1", title: "Disco" },
};
const item = (title: string, coverThumbUrl: string | null) => ({ target: { title, artistName: "Banda", coverThumbUrl } });
const listDetail = {
  id: ID,
  title: "Mis discos",
  description: null,
  entityType: "release-group",
  itemCount: 2,
  items: [item("Uno", "https://coverartarchive.org/1"), item("Dos", null)],
};
const profileBase = { card: { title: "Ana", subtitle: "@ana", media: { type: "identity" }, credits: [] } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ownerRows = [{ kind: "standard", username: "ana" }];
  mocks.review.mockResolvedValue(reviewDetail);
  mocks.album.mockResolvedValue(base);
  mocks.artist.mockResolvedValue(base);
  mocks.song.mockResolvedValue(base);
  mocks.permalink.mockResolvedValue({
    comment: { id: ID, body: "Qué bueno", createdAt: "2026-11-01T00:00:00.000Z" },
    author: { id: "u1", username: "ana", displayName: null },
    object: { type: "release-group", id: "rg1", title: "Disco", href: "/album/x" },
  });
  mocks.list.mockResolvedValue(listDetail);
  mocks.generated.mockResolvedValue(new Map());
  mocks.profile.mockResolvedValue({ id: "u1" });
  mocks.username.mockResolvedValue("ana");
  mocks.profileTarget.mockResolvedValue(profileBase);
});

describe("reseña", () => {
  it("lleva la cita, la firma de quien escribió y solo las estrellas", async () => {
    const target = await loadReviewTarget(ID, "es");
    expect(target?.card).toMatchObject({ quote: "Un disco enorme.", stars: 4.5, byline: "@ana", title: "Disco" });
    expect(JSON.stringify(target)).not.toContain("86");
  });

  it("sin valoración vigente no lleva nota", async () => {
    mocks.review.mockResolvedValue({ ...reviewDetail, review: { ...reviewDetail.review, rating: null } });
    expect((await loadReviewTarget(ID, "es"))?.card.stars).toBeNull();
  });

  it("oculta o de una cuenta desactivada: sin objetivo", async () => {
    mocks.review.mockResolvedValue(null);
    expect(await loadReviewTarget(ID, "es")).toBeNull();
    mocks.review.mockResolvedValue({ ...reviewDetail, review: { ...reviewDetail.review, user: { username: null, deactivated: true } } });
    expect(await loadReviewTarget(ID, "es")).toBeNull();
  });
});

describe("comentario", () => {
  it("se calcula como anónimo y apunta a su dirección propia", async () => {
    const target = await loadCommentTarget(ID, "en");
    expect(mocks.permalink).toHaveBeenCalledWith(ID, null);
    expect(target?.canonicalPath).toBe(`/en/comment/${ID}`);
    expect(target?.card).toMatchObject({ quote: "Qué bueno", byline: "@ana", media });
  });

  it.each([
    ["artist", "artist"],
    ["recording", "song"],
  ] as const)("el objeto %s usa su propio objetivo", async (type, loader) => {
    mocks.permalink.mockResolvedValue({ ...(await mocks.permalink()), object: { type, id: "x", title: "X", href: "/x" } });
    await loadCommentTarget(ID, "es");
    expect(mocks[loader]).toHaveBeenCalledWith("x", "es");
  });

  it("que no se puede ver: sin objetivo", async () => {
    mocks.permalink.mockResolvedValue(null);
    expect(await loadCommentTarget(ID, "es")).toBeNull();
  });
});

describe("lista", () => {
  it("mosaico sin el disco sin carátula, dueño y cantidad", async () => {
    const target = await loadListTarget(ID, "es");
    expect(mocks.list).toHaveBeenCalledWith("ana", ID, null);
    expect(target?.card.media).toMatchObject({ type: "mosaic", covers: [{ fallbackTitle: "Uno" }] });
    expect(target?.card).toMatchObject({ subtitle: "@ana", meta: ["2 discos"] });
  });

  it("no repite carátulas", async () => {
    mocks.list.mockResolvedValue({ ...listDetail, items: [item("Uno", "https://x/1"), item("Dos", "https://x/1"), item("Tres", "https://x/2")] });
    const target = await loadListTarget(ID, "es");
    expect(target?.card.media).toMatchObject({ covers: [{ fallbackTitle: "Uno" }, { fallbackTitle: "Tres" }] });
  });

  it("sin carátulas tampoco repite el disco en el mosaico", async () => {
    mocks.list.mockResolvedValue({ ...listDetail, items: [item("Uno", null), item("Uno", null), item("Dos", null)] });
    const target = await loadListTarget(ID, "es");
    expect(target?.card.media).toMatchObject({ covers: [{ fallbackTitle: "Uno" }, { fallbackTitle: "Dos" }] });
  });

  it("una lista de artistas es tipográfica", async () => {
    mocks.list.mockResolvedValue({ ...listDetail, entityType: "artist" });
    expect((await loadListTarget(ID, "es"))?.card.media).toEqual({ type: "typographic" });
  });

  it("que un anónimo no puede leer: sin objetivo", async () => {
    mocks.list.mockRejectedValue(new ApiError("LIST_NOT_FOUND", 404, "x"));
    expect(await loadListTarget(ID, "es")).toBeNull();
  });

  it("un fallo de la base no se confunde con 'no visible'", async () => {
    mocks.list.mockRejectedValue(new Error("conexión perdida"));
    await expect(loadListTarget(ID, "es")).rejects.toThrow("conexión perdida");
  });

  it("generada por plantilla, Camino o sin dueño activo: sin objetivo", async () => {
    mocks.generated.mockResolvedValue(new Map([[ID, {}]]));
    expect(await loadListTarget(ID, "es")).toBeNull();
    mocks.ownerRows = [{ kind: "custom_journey", username: "ana" }];
    expect(await loadListTarget(ID, "es")).toBeNull();
    mocks.ownerRows = [];
    expect(await loadListTarget(ID, "es")).toBeNull();
  });
});

describe("Camino", () => {
  beforeEach(() => {
    mocks.ownerRows = [{ kind: "custom_journey", username: "ana" }];
    mocks.profile.mockResolvedValue({ id: "u1", profileVisibility: "public", relation: "none", blockedByMe: false });
    mocks.camino.mockResolvedValue({
      title: "Un camino",
      description: null,
      progress: { selectedCount: 2, listenedCount: 1 },
      albums: [{ title: "Uno", artistName: null, coverThumbUrl: "https://x/1" }, { title: "Dos", artistName: null, coverThumbUrl: "https://x/2" }],
    });
  });

  it("muestra la cantidad y nunca el progreso del dueño", async () => {
    const target = await loadCaminoTarget(ID, "es");
    expect(mocks.camino).toHaveBeenCalledWith(ID, "u1", ["public"]);
    expect(target?.card.meta).toEqual(["2 discos"]);
    expect(JSON.stringify(target)).not.toContain("listened");
  });

  it("una lista común no se comparte como Camino", async () => {
    mocks.ownerRows = [{ kind: "standard", username: "ana" }];
    expect(await loadCaminoTarget(ID, "es")).toBeNull();
  });
});

describe("colección del perfil", () => {
  const entry = { album: { title: "Uno", artistName: "Banda", coverThumbUrl: "https://x/1" } };

  it("conteos solo de los formatos presentes, como anónimo", async () => {
    mocks.collection.mockResolvedValue({ entries: [entry], counts: { vinyl: 3, cd: 0, cassette: 1, other: 0 } });
    const target = await loadUserCollectionTarget(ID, "es");
    expect(mocks.collection).toHaveBeenCalledWith("ana", null, 1, 4);
    expect(target?.card.meta).toEqual(["3 vinilos", "1 casete"]);
    expect(target?.canonicalPath).toBe("/es/users/ana/collection");
  });

  it("sin entradas públicas: sin objetivo", async () => {
    mocks.collection.mockResolvedValue({ entries: [], counts: { vinyl: 0, cd: 0, cassette: 0, other: 0 } });
    expect(await loadUserCollectionTarget(ID, "es")).toBeNull();
  });

  it("cuenta inexistente o desactivada: sin objetivo", async () => {
    mocks.username.mockResolvedValue(null);
    expect(await loadUserCollectionTarget(ID, "es")).toBeNull();
  });
});

describe("huella", () => {
  const fingerprint = {
    decades: [{ label: "1980s", count: 2 }, { label: "1990s", count: 9 }],
    genres: [{ family: "rock", count: 5, topGenres: [] }],
    summary: ["Escucha sobre todo música de los 1990s"],
  };

  it("usa frases propias en el idioma de la ruta, no el resumen en español", async () => {
    mocks.fingerprint.mockResolvedValue(fingerprint);
    const target = await loadFingerprintTarget(ID, "en");
    expect(mocks.fingerprint).toHaveBeenCalledWith("ana", null);
    expect(target?.card.meta[0]).toBe("Mostly music from the 1990s");
    expect(target?.card.meta[1]).toContain("Rock");
  });

  it("privada o sin datos: sin objetivo", async () => {
    mocks.fingerprint.mockResolvedValue(null);
    expect(await loadFingerprintTarget(ID, "es")).toBeNull();
    mocks.fingerprint.mockResolvedValue({ ...fingerprint, decades: [], genres: [] });
    expect(await loadFingerprintTarget(ID, "es")).toBeNull();
  });
});
