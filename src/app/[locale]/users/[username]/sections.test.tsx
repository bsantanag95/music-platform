import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AffinitySection,
  AnchorsSection,
  EditablePlaca,
  FavoritesRail,
  HeaderBackdropSection,
  IdentityCardSection,
  IdentityStripSection,
  InRotationSection,
  ListsCollectionRow,
  PinnedSection,
  ReviewsDiaryRow,
  SettingsCardSection,
  StartRow,
  DIARY_PROFILE_PREVIEW,
} from "./sections";
import { ProfileRail } from "@/components/profiles/ProfileRail";
import { ProfileRow } from "@/components/profiles/ProfileRow";
import { DiaryPreviewTable } from "@/components/diary/DiaryPreviewTable";
import { ListsAndCaminosPreview, LISTS_AND_CAMINOS_PREVIEW } from "@/components/profiles/ListsAndCaminosPreview";
import { CollectionPreview } from "@/components/collection/CollectionPreview";
import { PinnedShowcase } from "@/components/profiles/PinnedShowcase";
import { InRotation } from "@/components/profiles/InRotation";
import { ProfileReviews } from "@/components/profiles/ProfileReviews";
import { RatingHighlights } from "@/components/profiles/RatingHighlights";
import { IdentityStrip } from "@/components/profiles/IdentityStrip";
import { ProfileAnchors } from "@/components/profiles/ProfileAnchors";
import { IdentityCard } from "@/components/profiles/IdentityCard";
import { ProfileAffinity } from "@/components/profiles/ProfileAffinity";
import { EditableBlock } from "@/components/profiles/EditableBlock";
import { OwnerSettingsCard } from "@/components/profiles/OwnerSettingsCard";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { OwnerAvatarEditor } from "@/components/profiles/OwnerAvatarEditor";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerMusicIdentityEditor } from "@/components/profiles/OwnerMusicIdentityEditor";
import { OwnerPromptsEditor } from "@/components/profiles/OwnerPromptsEditor";
import { OwnerShowcaseEditor } from "@/components/profiles/OwnerShowcaseEditor";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getFormatter: vi.fn().mockResolvedValue({ relativeTime: () => "hace 2 días", dateTime: () => "" }),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

// Nombres de géneros de la taxonomía (openspec: add-genre-taxonomy): sin base en este test.
vi.mock("@/services/genres/read", () => ({
  identityGenreLabels: async (slugs: string[]) => Object.fromEntries(slugs.map((slug) => [slug, slug])),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => null }));

const svc = vi.hoisted(() => ({
  listUserDiary: vi.fn(),
  listUserFavorites: vi.fn(),
  getFavoritesPreview: vi.fn(),
  listUserLists: vi.fn(),
  listVisibleCaminos: vi.fn(),
  listProfileCollection: vi.fn(),
  getCollectionPreview: vi.fn(),
  getConcertPreview: vi.fn(),
  getTasteFingerprint: vi.fn(),
  getShowcase: vi.fn(),
  getProfileInRotation: vi.fn(),
  getProfileReviews: vi.fn(),
  listProfileFollowedArtists: vi.fn(),
  getProfileRecency: vi.fn(),
  getProfileAffinity: vi.fn(),
  getProfileRatingHighlights: vi.fn(),
  countPendingFollowRequests: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({ listUserDiary: svc.listUserDiary }));
vi.mock("@/services/favorites/favorites", () => ({
  listUserFavorites: svc.listUserFavorites,
  getFavoritesPreview: svc.getFavoritesPreview,
}));
vi.mock("@/services/lists/lists", () => ({ listUserLists: svc.listUserLists }));
vi.mock("@/services/camino/camino", () => ({ listVisibleCaminos: svc.listVisibleCaminos }));
vi.mock("@/services/camino/types", () => ({ CAMINOS_PREVIEW_LIMIT: 10 }));
vi.mock("@/services/collection/collection", () => ({
  listProfileCollection: svc.listProfileCollection,
  getCollectionPreview: svc.getCollectionPreview,
}));
vi.mock("@/services/concerts/concerts", () => ({ getConcertPreview: svc.getConcertPreview }));
vi.mock("@/services/profiles/stats", () => ({ getTasteFingerprint: svc.getTasteFingerprint }));
vi.mock("@/services/profiles/showcase", () => ({ getShowcase: svc.getShowcase }));
vi.mock("@/services/profiles/in-rotation", () => ({
  getProfileInRotation: svc.getProfileInRotation,
}));
vi.mock("@/services/profiles/reviews", () => ({
  getProfileReviews: svc.getProfileReviews,
}));
vi.mock("@/services/profiles/exploration", () => ({
  listProfileFollowedArtists: svc.listProfileFollowedArtists,
}));
vi.mock("@/services/profiles/recency", () => ({ getProfileRecency: svc.getProfileRecency }));
vi.mock("@/services/profiles/affinity", () => ({ getProfileAffinity: svc.getProfileAffinity }));
vi.mock("@/services/rating-highlights/rating-highlights", () => ({
  getProfileRatingHighlights: svc.getProfileRatingHighlights,
}));
vi.mock("@/services/social/following", () => ({ countPendingFollowRequests: svc.countPendingFollowRequests }));

// Stubs de los componentes de lectura para no arrastrar sus imports cliente.
vi.mock("@/components/diary/DiaryPreviewTable", () => ({ DiaryPreviewTable: () => null }));
vi.mock("@/components/favorites/FavoritesPreview", () => ({ FavoritesPreview: () => null }));
vi.mock("@/components/lists/ListsCarousel", () => ({ ListsCarousel: () => null }));
vi.mock("@/components/camino/CaminosCarousel", () => ({ CaminosCarousel: () => null }));
vi.mock("@/components/collection/CollectionPreview", () => ({ CollectionPreview: () => null }));
vi.mock("@/components/profiles/OwnerIdentityCardEditor", () => ({ OwnerIdentityCardEditor: () => null }));
vi.mock("@/components/profiles/OwnerIdentityEditor", () => ({ OwnerIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerLinksEditor", () => ({ OwnerLinksEditor: () => null }));
vi.mock("@/components/profiles/OwnerMusicIdentityEditor", () => ({ OwnerMusicIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerPromptsEditor", () => ({ OwnerPromptsEditor: () => null }));
vi.mock("@/components/profiles/OwnerShowcaseEditor", () => ({ OwnerShowcaseEditor: () => null }));
vi.mock("@/components/profiles/ProfileRecency", () => ({ ProfileRecency: () => null }));

const section = { username: "ana", viewerId: null, isOwn: false };

beforeEach(() => vi.clearAllMocks());

type Node = { type?: unknown; props?: Record<string, unknown> } | null;
const rowOf = (tree: unknown) => tree as { type?: unknown; props: { start: Node; end: Node } };

describe("filas del cuerpo (openspec: redesign-user-profile-phase2)", () => {
  it("StartRow: Empieza por aquí junto a Valoraciones destacadas", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [{ id: "p1" }], identityCard: { artist: null, album: null, anthem: null } });
    svc.getProfileRatingHighlights.mockResolvedValue([{ id: "h1" }]);
    const row = rowOf(await StartRow({ ownerId: "owner", ...section }));
    expect(row.type).toBe(ProfileRow);
    expect(row.props.start?.type).toBe(PinnedSection);
    expect(row.props.end?.type).toBe(RatingHighlights);
    expect(svc.getProfileRatingHighlights).toHaveBeenCalledWith("ana", null);
  });

  it("StartRow: sin valoraciones destacadas, Empieza por aquí ocupa la fila", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [{ id: "p1" }], identityCard: { artist: null, album: null, anthem: null } });
    svc.getProfileRatingHighlights.mockResolvedValue([]);
    const row = rowOf(await StartRow({ ownerId: "owner", ...section }));
    expect(row.props.start?.type).toBe(PinnedSection);
    expect(row.props.end).toBeNull();
  });

  it("StartRow: sin ítems fijados, el bloque vacío del dueño va solo y las valoraciones ocupan la fila", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [], identityCard: { artist: null, album: null, anthem: null } });
    svc.getProfileRatingHighlights.mockResolvedValue([{ id: "h1" }]);
    const visitor = (await StartRow({ ownerId: "owner", ...section })) as { props: { children: unknown[] } };
    expect(visitor.props.children[0]).toBe(false);
    const own = (await StartRow({ ownerId: "owner", ...section, isOwn: true })) as { props: { children: Node[] } };
    expect(own.props.children[0]?.type).toBe(PinnedSection);
    expect(rowOf(own.props.children[1]).props.start).toBeNull();
    expect(rowOf(own.props.children[1]).props.end?.type).toBe(RatingHighlights);
  });

  it("ReviewsDiaryRow: reseñas junto al diario, que pide sus 5 entradas recientes", async () => {
    const reviews = { reviews: [{ id: "r1" }], total: 13 };
    svc.getProfileReviews.mockResolvedValue(reviews);
    svc.listUserDiary.mockResolvedValue({ entries: [{ id: "e1" }], page: 1, hasNext: true, totalCount: 57 });
    const row = rowOf(await ReviewsDiaryRow(section));
    expect(svc.listUserDiary).toHaveBeenCalledWith("ana", null, 1, DIARY_PROFILE_PREVIEW);
    expect(row.props.start?.type).toBe(ProfileReviews);
    expect(row.props.start?.props?.data).toBe(reviews);
    const diary = row.props.end as { type?: unknown; props: Record<string, unknown> & { children: Node } };
    expect(diary.type).toBe(ProfileRail);
    expect(diary.props).toMatchObject({ id: "diario", count: 57, more: { href: "/users/ana/diary", label: "seeAll" } });
    expect(diary.props.children?.type).toBe(DiaryPreviewTable);
  });

  it("ReviewsDiaryRow: sin reseñas ni diario no dibuja nada para un visitante; el dueño ve su diario vacío", async () => {
    svc.getProfileReviews.mockResolvedValue(null);
    svc.listUserDiary.mockResolvedValue({ entries: [], page: 1, hasNext: false, totalCount: 0 });
    const visitor = rowOf(await ReviewsDiaryRow(section));
    expect(visitor.props.start).toBeNull();
    expect(visitor.props.end).toBeNull();
    const own = rowOf(await ReviewsDiaryRow({ ...section, isOwn: true }));
    expect(own.props.end).not.toBeNull();
  });

  it("FavoritesRail colapsa sin favoritos visibles para un visitante", async () => {
    svc.getFavoritesPreview.mockResolvedValue({
      artists: [],
      albums: [],
      songs: [],
      counts: { artist: 0, "release-group": 0, recording: 0 },
    });
    expect(await FavoritesRail(section)).toBeNull();
  });

  it("FavoritesRail usa el total real entre los 3 tipos y enlaza la vista completa", async () => {
    svc.getFavoritesPreview.mockResolvedValue({
      artists: [{ id: "f1" }],
      albums: [{ id: "f2" }, { id: "f3" }],
      songs: [],
      counts: { artist: 1, "release-group": 2, recording: 0 },
    });
    const tree = (await FavoritesRail(section)) as { type?: unknown; props?: Record<string, unknown> };
    expect(tree?.type).toBe(ProfileRail);
    expect(tree?.props).toMatchObject({ count: 3, more: { href: "/users/ana/favorites" } });
  });

  const lists = (n: number, total: number) => ({
    lists: Array.from({ length: n }, (_, i) => ({ id: `l${i}` })),
    page: 1,
    pageSize: 4,
    hasNext: total > n,
    totalCount: total,
  });
  const caminos = (n: number, total: number) => ({
    caminos: Array.from({ length: n }, (_, i) => ({ id: `c${i}` })),
    page: 1,
    pageSize: 4,
    totalCount: total,
  });

  it("ListsCollectionRow: Listas (listas y listas para completar) junto a la colección", async () => {
    svc.listUserLists.mockResolvedValue(lists(4, 6));
    svc.listVisibleCaminos.mockResolvedValue(caminos(1, 3));
    const artists = [{ name: "Queen", total: 12, entries: [{ id: "e1" }] }];
    svc.getCollectionPreview.mockResolvedValue({ artists, totalEntries: 87, totalArtists: 31 });

    const row = rowOf(await ListsCollectionRow({ ...section, canAct: true }));
    expect(svc.listUserLists).toHaveBeenCalledWith("ana", null, 1, LISTS_AND_CAMINOS_PREVIEW);
    const listsRail = row.props.start as { props: Record<string, unknown> & { children: Node } };
    expect(listsRail.props).toMatchObject({ id: "listas", label: "listsTitle", count: 9 });
    expect(listsRail.props.children?.type).toBe(ListsAndCaminosPreview);
    expect(listsRail.props.children?.props).toMatchObject({ listsTotal: 6, caminosTotal: 3, canAct: true });
    const collection = row.props.end as { props: Record<string, unknown> & { children: Node } };
    expect(collection.props).toMatchObject({ id: "coleccion", count: 87, more: { href: "/users/ana/collection" } });
    expect(collection.props.children?.type).toBe(CollectionPreview);
    expect(collection.props.children?.props).toMatchObject({ artists });
  });

  it("ListsCollectionRow: sin acciones con sesión cuando canAct es falso", async () => {
    svc.listUserLists.mockResolvedValue(lists(1, 1));
    svc.listVisibleCaminos.mockResolvedValue(caminos(0, 0));
    svc.getCollectionPreview.mockResolvedValue({ artists: [], totalEntries: 0, totalArtists: 0 });
    const row = rowOf(await ListsCollectionRow({ ...section, canAct: false }));
    const listsRail = row.props.start as { props: { children: Node } };
    expect(listsRail.props.children?.props).toMatchObject({ canAct: false });
    expect(row.props.end).toBeNull();
  });

  it("ListsCollectionRow: vacía para un visitante, con estantes vacíos para el dueño", async () => {
    svc.listUserLists.mockResolvedValue(lists(0, 0));
    svc.listVisibleCaminos.mockResolvedValue(caminos(0, 0));
    svc.getCollectionPreview.mockResolvedValue({ artists: [], totalEntries: 0, totalArtists: 0 });
    const visitor = rowOf(await ListsCollectionRow({ ...section, canAct: false }));
    expect(visitor.props.start).toBeNull();
    expect(visitor.props.end).toBeNull();
    const own = rowOf(await ListsCollectionRow({ ...section, isOwn: true, canAct: false }));
    expect(own.props.start).not.toBeNull();
    expect(own.props.end).not.toBeNull();
  });
});

describe("secciones del Nivel 1 y 2", () => {
  it("PinnedSection renderiza solo los ítems de Empieza por aquí (null sin ellos)", async () => {
    svc.getShowcase.mockResolvedValue({
      pinned: [],
      identityCard: { artist: null, album: null, anthem: { id: "r1" } },
    });
    expect(await PinnedSection({ ownerId: "owner" })).toBeNull();
    const pinned = [{ id: "p1" }];
    svc.getShowcase.mockResolvedValue({
      pinned,
      identityCard: { artist: null, album: null, anthem: null },
    });
    const tree = (await PinnedSection({ ownerId: "owner" })) as {
      type?: unknown;
      props?: Record<string, unknown>;
    };
    expect(tree?.type).toBe(PinnedShowcase);
    expect(tree?.props?.pinned).toBe(pinned);
    expect(tree?.props).not.toHaveProperty("identityCard");
  });

  it("IdentityCardSection pasa la identityCard resuelta a IdentityCard (vacía o no la resuelve el componente)", async () => {
    svc.getShowcase.mockResolvedValue({
      pinned: [],
      identityCard: { artist: null, album: null, anthem: null },
    });
    const tree = (await IdentityCardSection({ ownerId: "owner" })) as {
      type?: unknown;
      props?: { identityCard?: { artist: unknown; album: unknown; anthem: unknown } };
    };
    expect(tree?.type).toBe(IdentityCard);
    expect(tree?.props?.identityCard).toEqual({ artist: null, album: null, anthem: null });
  });

  it("IdentityCardSection renderiza IdentityCard cuando hay al menos un elemento", async () => {
    svc.getShowcase.mockResolvedValue({
      pinned: [],
      identityCard: {
        artist: null,
        album: null,
        anthem: { id: "r1", type: "recording", title: "x", artistName: null, coverThumbUrl: null },
      },
    });
    const tree = (await IdentityCardSection({ ownerId: "owner" })) as { type?: unknown };
    expect(tree?.type).toBe(IdentityCard);
  });

  it("InRotationSection renderiza InRotation con los datos resueltos", async () => {
    svc.getProfileInRotation.mockResolvedValue({
      songs: [{ id: "s1", title: "S1", artistName: "A" }],
      albums: [],
    });
    const tree = (await InRotationSection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
      props?: { data?: { songs?: unknown[] } };
    };
    expect(svc.getProfileInRotation).toHaveBeenCalledWith("ana", "v");
    expect(tree?.type).toBe(InRotation);
    expect(tree?.props?.data?.songs).toHaveLength(1);
  });

  it("InRotationSection es null cuando getProfileInRotation devuelve null", async () => {
    svc.getProfileInRotation.mockResolvedValue(null);
    expect(await InRotationSection({ username: "ana", viewerId: null })).toBeNull();
  });

  const stripProfile = {
    id: "owner",
    username: "ana",
    selfRoles: ["collector"],
    genres: ["jazz"],
    listeningFormats: [],
    prompts: [],
  } as unknown as ProfileView;
  const followed = {
    artists: [{ id: "a1", name: "Radiohead", type: "group", photoUrl: null }],
    totalCount: 12,
    page: 1,
    pageSize: 8,
    hasNext: true,
  };

  it("IdentityStripSection pasa ficha, artistas seguidos y total a IdentityStrip", async () => {
    svc.listProfileFollowedArtists.mockResolvedValue(followed);
    svc.getProfileAffinity.mockResolvedValue(null);
    svc.getTasteFingerprint.mockResolvedValue(null);
    const tree = (await IdentityStripSection({ profile: stripProfile, viewerId: "v" })) as {
      type?: unknown;
      props?: Record<string, unknown>;
    };
    expect(svc.listProfileFollowedArtists).toHaveBeenCalledWith("ana", "v");
    expect(tree?.type).toBe(IdentityStrip);
    expect(tree?.props?.artists).toHaveLength(1);
    expect(tree?.props?.artistsTotal).toBe(12);
    expect(tree?.props?.identity).toEqual({ selfRoles: ["collector"], genres: ["jazz"], listeningFormats: [], prompts: [] });
    expect(tree?.props?.genreLabels).toEqual({ jazz: "jazz" });
    expect(tree?.props?.fingerprint).toBeNull();
    expect(tree?.props?.sharedArtistIds).toBeUndefined();
  });

  it("IdentityStripSection marca los artistas seguidos en común vía la afinidad", async () => {
    svc.listProfileFollowedArtists.mockResolvedValue(followed);
    svc.getTasteFingerprint.mockResolvedValue(null);
    svc.getProfileAffinity.mockResolvedValue({
      sharedFavorites: [],
      sharedHighRatings: [],
      sharedFollowedArtists: [{ type: "artist", id: "a1", title: "Radiohead", artistName: null, coverThumbUrl: null }],
      mutualFollowers: 0,
    });
    const tree = (await IdentityStripSection({ profile: stripProfile, viewerId: "v" })) as {
      props?: { sharedArtistIds?: Set<string> };
    };
    expect(tree?.props?.sharedArtistIds?.has("a1")).toBe(true);
  });

  it("IdentityStripSection destaca la década predominante y quita su frase del resumen", async () => {
    svc.listProfileFollowedArtists.mockResolvedValue({ ...followed, artists: [], totalCount: 0 });
    svc.getProfileAffinity.mockResolvedValue(null);
    svc.getTasteFingerprint.mockResolvedValue({
      decades: [
        { label: "1990s", count: 2 },
        { label: "1980s", count: 7 },
      ],
      summary: ["Escucha sobre todo música de los 1980s", "Es un calificador exigente"],
    });
    const tree = (await IdentityStripSection({ profile: stripProfile, viewerId: null })) as {
      props?: { fingerprint?: { topDecade: string | null; phrases: string[] } };
    };
    expect(tree?.props?.fingerprint).toEqual({ topDecade: "1980s", phrases: ["Es un calificador exigente"] });
  });

  it("HeaderBackdropSection usa la carátula del álbum definitorio y no dibuja nada sin él", async () => {
    svc.getShowcase.mockResolvedValueOnce({
      pinned: [],
      identityCard: {
        artist: null,
        album: { type: "release-group", id: "rg1", title: "Souvlaki", artistName: "Slowdive", coverThumbUrl: "/covers/rg1.webp" },
        anthem: null,
      },
    });
    const withCover = await HeaderBackdropSection({ ownerId: "owner" });
    expect(JSON.stringify(withCover)).toContain("/covers/rg1.webp");

    svc.getShowcase.mockResolvedValueOnce({ pinned: [], identityCard: { artist: null, album: null, anthem: null } });
    expect(await HeaderBackdropSection({ ownerId: "owner" })).toBeNull();
  });

  it("AnchorsSection ofrece solo las secciones con contenido, con su recuento", async () => {
    svc.listUserDiary.mockResolvedValue({ entries: [{ id: "d1" }], totalCount: 5 });
    svc.getProfileReviews.mockResolvedValue({ reviews: [{ id: "r1" }], total: 13 });
    svc.getFavoritesPreview.mockResolvedValue({
      artists: [],
      albums: [],
      songs: [],
      counts: { artist: 0, "release-group": 0, recording: 0 },
    });
    svc.listUserLists.mockResolvedValue({ lists: [{ id: "l1" }], totalCount: 6 });
    svc.listVisibleCaminos.mockResolvedValue({ caminos: [{ id: "c1" }], totalCount: 2 });
    svc.getCollectionPreview.mockResolvedValue({ artists: [], totalEntries: 0 });
    const tree = (await AnchorsSection({ username: "ana", viewerId: null })) as {
      type?: unknown;
      props?: { items?: { id: string; count?: number }[] };
    };
    expect(tree?.type).toBe(ProfileAnchors);
    expect(tree?.props?.items).toEqual([
      { id: "perfil", label: "anchors.summary" },
      { id: "diario", label: "anchors.diary", count: 5 },
      { id: "resenas", label: "anchors.reviews", count: 13 },
      { id: "listas", label: "anchors.lists", count: 8 },
    ]);
  });

  it("AffinitySection es null cuando no hay afinidad", async () => {
    svc.getProfileAffinity.mockResolvedValue(null);
    expect(await AffinitySection({ username: "ana", viewerId: "v" })).toBeNull();
  });

  it("AffinitySection renderiza ProfileAffinity cuando hay coincidencias", async () => {
    svc.getProfileAffinity.mockResolvedValue({
      sharedFavorites: [],
      sharedHighRatings: [],
      mutualFollowers: 3,
    });
    const tree = (await AffinitySection({ username: "ana", viewerId: "v" })) as { type?: unknown };
    expect(tree?.type).toBe(ProfileAffinity);
  });
});

// Bloques que el dueño edita sobre su propio perfil (spec profile-edit-mode,
// "Controles de edición por bloque"): con `isOwn` la sección se envuelve en
// `EditableBlock` con su editor ya construido; sin `isOwn` es la de siempre.
type Wrapped = {
  type?: unknown;
  props?: {
    label?: string;
    empty?: boolean;
    editor?: { type?: unknown; props?: Record<string, unknown> };
    children?: { type?: unknown } | null;
  };
};

const emptyCard = { artist: null, album: null, anthem: null };
const artist = { type: "artist", id: "ar1", title: "Radiohead", artistName: null, coverThumbUrl: null };
const album = { type: "release-group", id: "rg1", title: "Souvlaki", artistName: "Slowdive", coverThumbUrl: null };

describe("secciones editables del dueño", () => {
  it("IdentityCardSection: el dueño recibe EditableBlock con el editor de la tarjeta y la vista dentro", async () => {
    const identityCard = { ...emptyCard, artist };
    svc.getShowcase.mockResolvedValue({ pinned: [], identityCard });

    const tree = (await IdentityCardSection({ ownerId: "owner", isOwn: true })) as Wrapped;

    expect(tree.type).toBe(EditableBlock);
    expect(tree.props?.label).toBe("identityCard.editor.heading");
    expect(tree.props?.empty).toBe(false);
    expect(tree.props?.editor?.type).toBe(OwnerIdentityCardEditor);
    expect(tree.props?.editor?.props?.initial).toBe(identityCard);
    expect(tree.props?.children?.type).toBe(IdentityCard);
  });

  it("IdentityCardSection: una tarjeta sin ningún elemento es un bloque vacío", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [], identityCard: emptyCard });
    const tree = (await IdentityCardSection({ ownerId: "owner", isOwn: true })) as Wrapped;
    expect(tree.props?.empty).toBe(true);
  });

  it("PinnedSection: el dueño recibe EditableBlock con el editor de destacados", async () => {
    const showcase = {
      pinned: [{ id: "p1", note: null, position: 0, entity: album }],
      identityCard: emptyCard,
    };
    svc.getShowcase.mockResolvedValue(showcase);

    const tree = (await PinnedSection({ ownerId: "owner", isOwn: true })) as Wrapped;

    expect(tree.type).toBe(EditableBlock);
    expect(tree.props?.label).toBe("showcase.edit.heading");
    expect(tree.props?.empty).toBe(false);
    expect(tree.props?.editor?.type).toBe(OwnerShowcaseEditor);
    expect(tree.props?.editor?.props?.initial).toBe(showcase);
    expect(tree.props?.children?.type).toBe(PinnedShowcase);
  });

  it("PinnedSection: sin ítems el bloque está vacío; con ítems que coinciden con la Tarjeta, no lo está", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [], identityCard: emptyCard });
    expect(((await PinnedSection({ ownerId: "owner", isOwn: true })) as Wrapped).props?.empty).toBe(true);

    // Fijar un ítem y definir la identidad son decisiones independientes: nada se oculta.
    svc.getShowcase.mockResolvedValue({
      pinned: [{ id: "p1", note: null, position: 0, entity: album }],
      identityCard: { ...emptyCard, album },
    });
    expect(((await PinnedSection({ ownerId: "owner", isOwn: true })) as Wrapped).props?.empty).toBe(false);
  });

  it("un visitante no recibe envoltorio de edición", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [{ id: "p1" }], identityCard: emptyCard });

    const pinned = (await PinnedSection({ ownerId: "owner" })) as Wrapped;
    const card = (await IdentityCardSection({ ownerId: "owner" })) as Wrapped;

    expect(pinned.type).toBe(PinnedShowcase);
    expect(card.type).toBe(IdentityCard);
  });

  it("EditablePlaca: aloja identidad, identidad musical, preguntas y enlaces en un mismo editor, con los valores del perfil", async () => {
    const prompts = [{ promptKey: "first-record", answer: "Un casete", position: 0 }];
    const profile = {
      username: "ana",
      displayName: null,
      bio: "Colecciono casetes",
      pronouns: "él",
      pronounSet: null,
      country: "CL",
      location: "Quilpué",
      timezone: "America/Santiago",
      showLocalTime: true,
      selfRoles: ["collector"],
      genres: ["jazz"],
      listeningFormats: ["vinyl"],
      prompts,
      links: [{ id: "l1", kind: "other", url: "https://ana.example", position: 0 }],
    } as unknown as ProfileView;

    const tree = (await EditablePlaca({ profile, children: "placa" })) as Wrapped;

    expect(tree.type).toBe(EditableBlock);
    expect(tree.props?.label).toBe("editMode.placa");
    const inner = (tree.props?.editor?.props as { children?: { type?: unknown; props?: Record<string, unknown> }[] }).children;
    // El editor de foto de perfil abre la Placa (spec avatar-upload).
    expect(inner?.[0]?.type).toBe(OwnerAvatarEditor);
    expect(inner?.[0]?.props?.username).toBe("ana");
    expect(inner?.[1]?.type).toBe(OwnerIdentityEditor);
    expect(inner?.[1]?.props?.initial).toEqual({
      bio: "Colecciono casetes",
      pronouns: "él",
      pronounSet: null,
      country: "CL",
      location: "Quilpué",
      timezone: "America/Santiago",
      showLocalTime: true,
    });
    // Sin nombre visible, el ejemplo de los pronombres usa el usuario.
    expect(inner?.[1]?.props?.name).toBe("ana");
    expect(inner?.[2]?.type).toBe(OwnerMusicIdentityEditor);
    expect(inner?.[2]?.props?.initial).toEqual({
      selfRoles: ["collector"],
      genres: ["jazz"],
      listeningFormats: ["vinyl"],
    });
    expect(inner?.[3]?.type).toBe(OwnerPromptsEditor);
    expect(inner?.[3]?.props?.initial).toBe(prompts);
    expect(inner?.[4]?.type).toBe(OwnerLinksEditor);
    expect(inner?.[4]?.props?.initialLinks).toBe(profile.links);
  });

  it("SettingsCardSection: cuenta las solicitudes pendientes del dueño y las pasa a la tarjeta", async () => {
    svc.countPendingFollowRequests.mockResolvedValue(3);

    const tree = (await SettingsCardSection({ ownerId: "owner" })) as { type?: unknown; props?: { pendingRequests?: number } };

    expect(svc.countPendingFollowRequests).toHaveBeenCalledWith("owner");
    expect(tree.type).toBe(OwnerSettingsCard);
    expect(tree.props?.pendingRequests).toBe(3);
  });
});
