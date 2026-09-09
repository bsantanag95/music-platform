import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AffinitySection,
  AlbumFavoritesSection,
  AnthemSection,
  DiaryRail,
  ExplorationSection,
  FavoritesRail,
  FeaturedReviewsSection,
  FingerprintSection,
  InRotationSection,
  PinnedSection,
  ShowcaseSection,
} from "./sections";
import { ProfileRail } from "@/components/profiles/ProfileRail";
import { PinnedShowcase } from "@/components/profiles/PinnedShowcase";
import { AlbumFavorites } from "@/components/profiles/AlbumFavorites";
import { InRotation } from "@/components/profiles/InRotation";
import { ProfileReviews } from "@/components/profiles/ProfileReviews";
import { ExploreSection } from "@/components/profiles/ExploreSection";
import { AnthemStrip } from "@/components/profiles/AnthemStrip";
import { TasteFingerprint } from "@/components/profiles/TasteFingerprint";
import { ProfileAffinity } from "@/components/profiles/ProfileAffinity";

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
  listUserLists: vi.fn(),
  listProfileCollection: vi.fn(),
  getTasteFingerprint: vi.fn(),
  getShowcase: vi.fn(),
  getAlbumFavorites: vi.fn(),
  getProfileAlbumFavorites: vi.fn(),
  getProfileInRotation: vi.fn(),
  getProfileReviews: vi.fn(),
  listProfileFollowedArtists: vi.fn(),
  getProfileRecency: vi.fn(),
  getProfileAffinity: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({ listUserDiary: svc.listUserDiary }));
vi.mock("@/services/favorites/favorites", () => ({ listUserFavorites: svc.listUserFavorites }));
vi.mock("@/services/lists/lists", () => ({ listUserLists: svc.listUserLists }));
vi.mock("@/services/collection/collection", () => ({ listProfileCollection: svc.listProfileCollection }));
vi.mock("@/services/profiles/stats", () => ({ getTasteFingerprint: svc.getTasteFingerprint }));
vi.mock("@/services/profiles/showcase", () => ({ getShowcase: svc.getShowcase }));
vi.mock("@/services/profiles/album-favorites", () => ({
  getAlbumFavorites: svc.getAlbumFavorites,
  getProfileAlbumFavorites: svc.getProfileAlbumFavorites,
}));
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
vi.mock("@/services/social/following", () => ({ countPendingFollowRequests: vi.fn().mockResolvedValue(0) }));

// Stubs de los componentes de lectura para no arrastrar sus imports cliente.
vi.mock("@/components/diary/DiaryList", () => ({ DiaryList: () => null }));
vi.mock("@/components/favorites/FavoritesWall", () => ({ FavoritesWall: () => null }));
vi.mock("@/components/lists/ListsList", () => ({ ListsList: () => null }));
vi.mock("@/components/collection/CollectionShelf", () => ({ CollectionShelf: () => null }));
vi.mock("@/components/profiles/OwnerIdentityEditor", () => ({ OwnerIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerLinksEditor", () => ({ OwnerLinksEditor: () => null }));
vi.mock("@/components/profiles/OwnerShowcaseEditor", () => ({ OwnerShowcaseEditor: () => null }));
vi.mock("@/components/profiles/OwnerAlbumFavoritesEditor", () => ({
  OwnerAlbumFavoritesEditor: () => null,
}));
vi.mock("@/components/profiles/AnthemStrip", () => ({ AnthemStrip: () => null }));
vi.mock("@/components/profiles/ProfileRecency", () => ({ ProfileRecency: () => null }));

function findType(node: unknown, type: unknown): boolean {
  if (node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((child) => findType(child, type));
  const el = node as { type?: unknown; props?: { children?: unknown } };
  if (el.type === type) return true;
  return findType(el.props?.children, type);
}

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
    svc.listUserDiary.mockResolvedValue({
      entries: [{ id: "e1" }, { id: "e2" }],
      page: 1,
      hasNext: false,
    });
    const tree = (await DiaryRail(section)) as { type?: unknown; props?: Record<string, unknown> };
    expect(tree?.type).toBe(ProfileRail);
    expect(tree?.props?.count).toBe(2);
  });

  it("FavoritesRail colapsa sin favoritos visibles para un visitante", async () => {
    svc.listUserFavorites.mockResolvedValue({ favorites: [], counts: {}, page: 1, hasNext: false });
    expect(await FavoritesRail(section)).toBeNull();
  });
});

describe("ShowcaseSection / FingerprintSection", () => {
  it("ShowcaseSection es null sin destacados ni himno", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [], anthem: null });
    expect(await ShowcaseSection({ ownerId: "owner" })).toBeNull();
  });

  it("ShowcaseSection renderiza PinnedShowcase cuando hay destacados", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [{ id: "p1" }], anthem: null });
    expect(findType(await ShowcaseSection({ ownerId: "owner" }), PinnedShowcase)).toBe(true);
  });

  it("PinnedSection renderiza solo los destacados (null sin ellos)", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [], anthem: { id: "r1" } });
    expect(await PinnedSection({ ownerId: "owner" })).toBeNull();
    svc.getShowcase.mockResolvedValue({ pinned: [{ id: "p1" }], anthem: null });
    const tree = (await PinnedSection({ ownerId: "owner" })) as { type?: unknown };
    expect(tree?.type).toBe(PinnedShowcase);
  });

  it("AnthemSection renderiza solo el himno (null sin él)", async () => {
    svc.getShowcase.mockResolvedValue({ pinned: [{ id: "p1" }], anthem: null });
    expect(await AnthemSection({ ownerId: "owner" })).toBeNull();
    svc.getShowcase.mockResolvedValue({ pinned: [], anthem: { id: "r1", title: "x" } });
    const tree = (await AnthemSection({ ownerId: "owner" })) as { type?: unknown };
    expect(tree?.type).toBe(AnthemStrip);
  });

  it("AlbumFavoritesSection pasa los álbumes resueltos a AlbumFavorites", async () => {
    svc.getProfileAlbumFavorites.mockResolvedValue([
      { id: "pin1", favoriteId: "f1", position: 1, target: { id: "rg1", title: "A", artistName: null, coverThumbUrl: null } },
    ]);
    const tree = (await AlbumFavoritesSection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
      props?: { albums?: unknown[] };
    };
    expect(svc.getProfileAlbumFavorites).toHaveBeenCalledWith("ana", "v");
    expect(tree?.type).toBe(AlbumFavorites);
    expect(tree?.props?.albums).toHaveLength(1);
  });

  it("AlbumFavoritesSection pasa una lista vacía cuando no hay nada visible", async () => {
    svc.getProfileAlbumFavorites.mockResolvedValue([]);
    const tree = (await AlbumFavoritesSection({ username: "ana", viewerId: null })) as {
      props?: { albums?: unknown[] };
    };
    expect(tree?.props?.albums).toEqual([]);
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

  it("ExplorationSection pasa los artistas seguidos a ExploreSection", async () => {
    svc.listProfileFollowedArtists.mockResolvedValue([
      { id: "a1", name: "Radiohead", type: "group", photoUrl: null },
    ]);
    const tree = (await ExplorationSection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
      props?: { artists?: unknown[] };
    };
    expect(svc.listProfileFollowedArtists).toHaveBeenCalledWith("ana", "v");
    expect(tree?.type).toBe(ExploreSection);
    expect(tree?.props?.artists).toHaveLength(1);
  });

  it("FingerprintSection es null cuando getTasteFingerprint devuelve null", async () => {
    svc.getTasteFingerprint.mockResolvedValue(null);
    expect(await FingerprintSection({ username: "ana", viewerId: null })).toBeNull();
  });

  it("FingerprintSection renderiza TasteFingerprint con la huella", async () => {
    svc.getTasteFingerprint.mockResolvedValue({ ratingsVisible: true });
    const tree = (await FingerprintSection({ username: "ana", viewerId: "v" })) as {
      type?: unknown;
    };
    expect(tree?.type).toBe(TasteFingerprint);
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
