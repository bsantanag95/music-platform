import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AffinitySection,
  CollectionRail,
  DiaryRail,
  EditablePlaca,
  ExplorationSection,
  FavoritesRail,
  FeaturedReviewsSection,
  FingerprintSummarySection,
  IdentityCardSection,
  InRotationSection,
  ListsRail,
  PinnedSection,
  RatingHighlightsSection,
  SettingsCardSection,
} from "./sections";
import { ProfileRail } from "@/components/profiles/ProfileRail";
import { ListsCarousel } from "@/components/lists/ListsCarousel";
import { CollectionPreview } from "@/components/collection/CollectionPreview";
import { PinnedShowcase } from "@/components/profiles/PinnedShowcase";
import { InRotation } from "@/components/profiles/InRotation";
import { ProfileReviews } from "@/components/profiles/ProfileReviews";
import { RatingHighlights } from "@/components/profiles/RatingHighlights";
import { ExploreSection } from "@/components/profiles/ExploreSection";
import { IdentityCard } from "@/components/profiles/IdentityCard";
import { FingerprintSummary } from "@/components/profiles/FingerprintSummary";
import { ProfileAffinity } from "@/components/profiles/ProfileAffinity";
import { EditableBlock } from "@/components/profiles/EditableBlock";
import { OwnerSettingsCard } from "@/components/profiles/OwnerSettingsCard";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerShowcaseEditor } from "@/components/profiles/OwnerShowcaseEditor";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getFormatter: vi.fn().mockResolvedValue({ relativeTime: () => "hace 2 días", dateTime: () => "" }),
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
  listProfileCollection: vi.fn(),
  getCollectionPreview: vi.fn(),
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
vi.mock("@/services/collection/collection", () => ({
  listProfileCollection: svc.listProfileCollection,
  getCollectionPreview: svc.getCollectionPreview,
}));
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
vi.mock("@/components/diary/DiaryReadList", () => ({ DiaryReadList: () => null }));
vi.mock("@/components/favorites/FavoritesPreview", () => ({ FavoritesPreview: () => null }));
vi.mock("@/components/lists/ListsCarousel", () => ({ ListsCarousel: () => null }));
vi.mock("@/components/collection/CollectionPreview", () => ({ CollectionPreview: () => null }));
vi.mock("@/components/profiles/OwnerIdentityCardEditor", () => ({ OwnerIdentityCardEditor: () => null }));
vi.mock("@/components/profiles/OwnerIdentityEditor", () => ({ OwnerIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerLinksEditor", () => ({ OwnerLinksEditor: () => null }));
vi.mock("@/components/profiles/OwnerShowcaseEditor", () => ({ OwnerShowcaseEditor: () => null }));
vi.mock("@/components/profiles/ProfileRecency", () => ({ ProfileRecency: () => null }));

const section = { username: "ana", viewerId: null, isOwn: false };

beforeEach(() => vi.clearAllMocks());

describe("estantes vacíos", () => {
  it("DiaryRail colapsa (null) cuando no hay entradas y el visitante no es el dueño", async () => {
    svc.listUserDiary.mockResolvedValue({ entries: [], page: 1, hasNext: false });
    expect(await DiaryRail(section)).toBeNull();
  });

  it("DiaryRail muestra algo para el dueño aunque el diario esté vacío", async () => {
    svc.listUserDiary.mockResolvedValue({ entries: [], page: 1, hasNext: false });
    const tree = await DiaryRail({ ...section, isOwn: true });
    expect(tree).not.toBeNull();
  });

  it("DiaryRail renderiza el estante con el conteo cuando hay entradas", async () => {
    // El conteo del encabezado es el total real (57), no lo traído en la
    // primera página (2) — con tope de scroll + "Cargar más" ya no son lo mismo.
    svc.listUserDiary.mockResolvedValue({
      entries: [{ id: "e1" }, { id: "e2" }],
      page: 1,
      hasNext: true,
      totalCount: 57,
    });
    const tree = (await DiaryRail(section)) as { type?: unknown; props?: Record<string, unknown> };
    expect(tree?.type).toBe(ProfileRail);
    expect(tree?.props?.count).toBe(57);
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

  it("FavoritesRail renderiza el estante con el total real entre los 3 tipos", async () => {
    svc.getFavoritesPreview.mockResolvedValue({
      artists: [{ id: "f1" }],
      albums: [{ id: "f2" }, { id: "f3" }],
      songs: [],
      counts: { artist: 1, "release-group": 2, recording: 0 },
    });
    const tree = (await FavoritesRail(section)) as { type?: unknown; props?: Record<string, unknown> };
    expect(tree?.type).toBe(ProfileRail);
    expect(tree?.props?.count).toBe(3);
  });

  it("ListsRail colapsa (null) sin listas visibles para un visitante, pero no para el dueño", async () => {
    svc.listUserLists.mockResolvedValue({ lists: [], page: 1, pageSize: 10, hasNext: false, totalCount: 0 });
    expect(await ListsRail(section)).toBeNull();
    expect(await ListsRail({ ...section, isOwn: true })).not.toBeNull();
  });

  it("ListsRail pide solo las primeras 10 y usa el total real en el encabezado", async () => {
    // 23 listas visibles pero el riel trae 10: el "23" del encabezado y el
    // "+13" de la tarjeta-puerta salen de `totalCount`, no de `lists.length`.
    const lists = Array.from({ length: 10 }, (_, i) => ({ id: `l${i}` }));
    svc.listUserLists.mockResolvedValue({ lists, page: 1, pageSize: 10, hasNext: true, totalCount: 23 });

    const tree = (await ListsRail(section)) as {
      type?: unknown;
      props?: { count?: number; children?: { type?: unknown; props?: Record<string, unknown> } };
    };

    expect(svc.listUserLists).toHaveBeenCalledWith("ana", null, 1, 10);
    expect(tree?.type).toBe(ProfileRail);
    expect(tree?.props?.count).toBe(23);
    const carousel = tree?.props?.children;
    expect(carousel?.type).toBe(ListsCarousel);
    expect(carousel?.props).toMatchObject({ username: "ana", totalCount: 23 });
    expect(carousel?.props?.lists).toHaveLength(10);
  });

  it("CollectionRail colapsa (null) sin copias visibles para un visitante, pero no para el dueño", async () => {
    svc.getCollectionPreview.mockResolvedValue({ artists: [], totalEntries: 0, totalArtists: 0 });
    expect(await CollectionRail(section)).toBeNull();
    expect(await CollectionRail({ ...section, isOwn: true })).not.toBeNull();
  });

  it("CollectionRail usa el total real de copias en el encabezado y le pasa la previsualización", async () => {
    // 87 copias visibles pero el estante trae solo 5 artistas x 4: el "87" sale
    // de `totalEntries`, no de lo traído.
    const artists = [{ name: "Queen", total: 12, entries: [{ id: "e1" }] }];
    svc.getCollectionPreview.mockResolvedValue({ artists, totalEntries: 87, totalArtists: 31 });

    const tree = (await CollectionRail(section)) as {
      type?: unknown;
      props?: { id?: string; count?: number; children?: { type?: unknown; props?: Record<string, unknown> } };
    };

    expect(svc.getCollectionPreview).toHaveBeenCalledWith("ana", null);
    expect(tree?.type).toBe(ProfileRail);
    expect(tree?.props?.id).toBe("coleccion");
    expect(tree?.props?.count).toBe(87);
    const preview = tree?.props?.children;
    expect(preview?.type).toBe(CollectionPreview);
    expect(preview?.props).toMatchObject({ username: "ana", totalEntries: 87, artists });
  });
});

describe("IdentityCardSection / FingerprintSummarySection", () => {
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

  it("RatingHighlightsSection pasa las valoraciones destacadas a RatingHighlights", async () => {
    svc.getProfileRatingHighlights.mockResolvedValue([
      { id: "rt1", stars: "5.0", detailedScore: null, entity: { type: "release-group", id: "rg1", title: "A", artistName: null, coverThumbUrl: null } },
    ]);
    const tree = (await RatingHighlightsSection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
      props?: { highlights?: unknown[] };
    };
    expect(svc.getProfileRatingHighlights).toHaveBeenCalledWith("ana", "v");
    expect(tree?.type).toBe(RatingHighlights);
    expect(tree?.props?.highlights).toHaveLength(1);
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

  it("FeaturedReviewsSection pasa las reseñas resueltas a ProfileReviews", async () => {
    svc.getProfileReviews.mockResolvedValue({
      reviews: [
        {
          id: "rv1",
          title: null,
          body: "x",
          stars: "4.0",
          detailedScore: null,
          updatedAt: "2026-09-08T00:00:00.000Z",
          album: { id: "rg1", title: "A", artistName: null, coverThumbUrl: null },
        },
      ],
      total: 1,
    });
    const tree = (await FeaturedReviewsSection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
      props?: { data?: { total?: number } };
    };
    expect(svc.getProfileReviews).toHaveBeenCalledWith("ana", "v");
    expect(tree?.type).toBe(ProfileReviews);
    expect(tree?.props?.data?.total).toBe(1);
  });

  it("FeaturedReviewsSection pasa null cuando no hay reseñas", async () => {
    svc.getProfileReviews.mockResolvedValue(null);
    const tree = (await FeaturedReviewsSection({ username: "ana", viewerId: null })) as {
      props?: { data?: unknown };
    };
    expect(tree?.props?.data).toBeNull();
  });

  it("ExplorationSection pasa los artistas seguidos y el total a ExploreSection", async () => {
    svc.listProfileFollowedArtists.mockResolvedValue({
      artists: [{ id: "a1", name: "Radiohead", type: "group", photoUrl: null }],
      totalCount: 1,
      page: 1,
      pageSize: 8,
      hasNext: false,
    });
    svc.getProfileAffinity.mockResolvedValue(null);
    const tree = (await ExplorationSection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
      props?: { username?: string; artists?: unknown[]; totalCount?: number; sharedArtistIds?: Set<string> };
    };
    expect(svc.listProfileFollowedArtists).toHaveBeenCalledWith("ana", "v");
    expect(tree?.type).toBe(ExploreSection);
    expect(tree?.props?.username).toBe("ana");
    expect(tree?.props?.artists).toHaveLength(1);
    expect(tree?.props?.totalCount).toBe(1);
    expect(tree?.props?.sharedArtistIds).toBeUndefined();
  });

  it("ExplorationSection marca los artistas seguidos en común vía la afinidad", async () => {
    svc.listProfileFollowedArtists.mockResolvedValue({
      artists: [{ id: "a1", name: "Radiohead", type: "group", photoUrl: null }],
      totalCount: 1,
      page: 1,
      pageSize: 8,
      hasNext: false,
    });
    svc.getProfileAffinity.mockResolvedValue({
      sharedFavorites: [],
      sharedHighRatings: [],
      sharedFollowedArtists: [{ type: "artist", id: "a1", title: "Radiohead", artistName: null, coverThumbUrl: null }],
      mutualFollowers: 0,
    });
    const tree = (await ExplorationSection({ username: "ana", viewerId: "v" })) as {
      props?: { sharedArtistIds?: Set<string> };
    };
    expect(tree?.props?.sharedArtistIds?.has("a1")).toBe(true);
  });

  it("FingerprintSummarySection es null cuando getTasteFingerprint devuelve null", async () => {
    svc.getTasteFingerprint.mockResolvedValue(null);
    expect(await FingerprintSummarySection({ username: "ana", viewerId: null })).toBeNull();
  });

  it("FingerprintSummarySection renderiza FingerprintSummary con el resumen", async () => {
    svc.getTasteFingerprint.mockResolvedValue({ ratingsVisible: true, summary: ["Escucha sobre todo música de los 90s"] });
    const tree = (await FingerprintSummarySection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
      props?: { summary?: string[] };
    };
    expect(tree?.type).toBe(FingerprintSummary);
    expect(tree?.props?.summary).toHaveLength(1);
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

  it("EditablePlaca: aloja identidad y enlaces en un mismo editor, con los valores del perfil", async () => {
    const profile = {
      bio: "Colecciono casetes",
      pronouns: "él",
      location: "Quilpué",
      timezone: "America/Santiago",
      links: [{ id: "l1", kind: "other", url: "https://ana.example", position: 0 }],
    } as unknown as ProfileView;

    const tree = (await EditablePlaca({ profile, children: "placa" })) as Wrapped;

    expect(tree.type).toBe(EditableBlock);
    expect(tree.props?.label).toBe("editMode.placa");
    const inner = (tree.props?.editor?.props as { children?: { type?: unknown; props?: Record<string, unknown> }[] }).children;
    expect(inner?.[0]?.type).toBe(OwnerIdentityEditor);
    expect(inner?.[0]?.props?.initial).toEqual({
      bio: "Colecciono casetes",
      pronouns: "él",
      location: "Quilpué",
      timezone: "America/Santiago",
    });
    expect(inner?.[1]?.type).toBe(OwnerLinksEditor);
    expect(inner?.[1]?.props?.initialLinks).toBe(profile.links);
  });

  it("SettingsCardSection: cuenta las solicitudes pendientes del dueño y las pasa a la tarjeta", async () => {
    svc.countPendingFollowRequests.mockResolvedValue(3);

    const tree = (await SettingsCardSection({ ownerId: "owner" })) as { type?: unknown; props?: { pendingRequests?: number } };

    expect(svc.countPendingFollowRequests).toHaveBeenCalledWith("owner");
    expect(tree.type).toBe(OwnerSettingsCard);
    expect(tree.props?.pendingRequests).toBe(3);
  });
});
