import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiaryRail, FavoritesRail, FingerprintSection, ShowcaseSection } from "./sections";
import { ProfileRail } from "@/components/profiles/ProfileRail";
import { PinnedShowcase } from "@/components/profiles/PinnedShowcase";
import { TasteFingerprint } from "@/components/profiles/TasteFingerprint";

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
  getProfileRecency: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({ listUserDiary: svc.listUserDiary }));
vi.mock("@/services/favorites/favorites", () => ({ listUserFavorites: svc.listUserFavorites }));
vi.mock("@/services/lists/lists", () => ({ listUserLists: svc.listUserLists }));
vi.mock("@/services/collection/collection", () => ({ listProfileCollection: svc.listProfileCollection }));
vi.mock("@/services/profiles/stats", () => ({ getTasteFingerprint: svc.getTasteFingerprint }));
vi.mock("@/services/profiles/showcase", () => ({ getShowcase: svc.getShowcase }));
vi.mock("@/services/profiles/recency", () => ({ getProfileRecency: svc.getProfileRecency }));

// Stubs de los componentes de lectura para no arrastrar sus imports cliente.
vi.mock("@/components/diary/DiaryList", () => ({ DiaryList: () => null }));
vi.mock("@/components/favorites/FavoritesWall", () => ({ FavoritesWall: () => null }));
vi.mock("@/components/lists/ListsList", () => ({ ListsList: () => null }));
vi.mock("@/components/collection/CollectionShelf", () => ({ CollectionShelf: () => null }));
vi.mock("@/components/profiles/OwnerIdentityEditor", () => ({ OwnerIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerLinksEditor", () => ({ OwnerLinksEditor: () => null }));
vi.mock("@/components/profiles/OwnerShowcaseEditor", () => ({ OwnerShowcaseEditor: () => null }));
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
});
