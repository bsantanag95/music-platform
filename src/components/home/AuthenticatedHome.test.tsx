import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import * as following from "@/services/social/following";
import * as home from "@/services/home/home";
import * as feed from "@/services/feed/feed";
import { AuthenticatedHome } from "./AuthenticatedHome";
import { FeedPreview } from "./FeedPreview";
import { RecentListensShelf } from "./RecentListensShelf";
import { CommunityActivity } from "./CommunityActivity";
import { CollectionMosaic } from "./CollectionMosaic";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import * as discovery from "@/services/discovery/discovery";
import * as config from "@/lib/config/discovery";
import * as communityActivity from "@/services/activity/community-activity";
import { ResumeList } from "./ResumeList";
import { SignedInHero } from "./SignedInHero";
import * as social from "@/services/social";
import { HomeReleases } from "./HomeReleases";

vi.mock("@/lib/year-invitation-request", () => ({ yearInvitationForRequest: vi.fn(async () => null) }));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/services/social/following", () => ({ listFollowing: vi.fn() }));
vi.mock("@/services/feed/feed", () => ({
  listFeed: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
}));
vi.mock("@/services/home/home", () => ({
  listMyRecentActivity: vi
    .fn()
    .mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
  listMyRecentListens: vi.fn().mockResolvedValue([]),
  listMyBackdropAlbums: vi.fn().mockResolvedValue([]),
  getMostRecentEditedList: vi.fn().mockResolvedValue(null),
  listPublicLists: vi.fn().mockResolvedValue([]),
  listPopularComments: vi
    .fn()
    .mockResolvedValue({ artist: [], "release-group": [], recording: [] }),
  listHomeReleases: vi.fn().mockResolvedValue([]),
  listPersonalHomeReleases: vi.fn().mockResolvedValue([]),
  ensureReleaseCalendarFresh: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/services/social", () => ({
  getOwnRatingRow: vi.fn().mockResolvedValue(null),
  knownSocialTarget: (type: string, id: string) => ({ type, id, column: "releaseGroupId" }),
}));
vi.mock("@/services/discovery/discovery", () => ({
  listTopRated: vi.fn().mockResolvedValue([]),
  listFeaturedCollections: vi.fn().mockResolvedValue([]),
  albumArtistNames: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: vi.fn(() => true) }));
vi.mock("@/services/activity/community-activity", () => ({
  listCommunityActivity: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 6, hasNext: false }),
}));

const user = { id: "u1", username: "yo", displayName: null };

// Los hijos son Server Components async: no se ejecutan al invocar
// AuthenticatedHome, solo quedan como descriptores. Se inspecciona el árbol.
function findElement(node: unknown, type: unknown): { props?: Record<string, unknown> } | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return element as { props?: Record<string, unknown> };
  return findElement(element.props?.children, type);
}

function findAll(node: unknown, type: unknown, out: { props?: Record<string, unknown> }[] = []) {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, type, out);
    return out;
  }
  const element = node as { type?: unknown; props?: { children?: unknown; footer?: unknown } };
  if (element.type === type) out.push(element as { props?: Record<string, unknown> });
  findAll(element.props?.children, type, out);
  findAll(element.props?.footer, type, out);
  return out;
}

const withFollows = () =>
  vi.mocked(following.listFollowing).mockResolvedValue({
    users: [{ id: "u2", username: "seguido", displayName: null, profileVisibility: "public", avatarUrl: null }],
    page: 1,
    pageSize: 1,
    hasNext: false,
  });
const withoutFollows = () =>
  vi.mocked(following.listFollowing).mockResolvedValue({ users: [], page: 1, pageSize: 1, hasNext: false });

describe("AuthenticatedHome", () => {
  beforeEach(() => vi.clearAllMocks());

  it("con al menos un seguido: muestra el preview de feed, no el onboarding", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [{ id: "u2", username: "seguido", displayName: null, profileVisibility: "public", avatarUrl: null }],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });

    vi.mocked(communityActivity.listCommunityActivity).mockResolvedValueOnce({
      entries: [{ kind: "rating", id: "r1" }],
      page: 1,
      pageSize: 7,
      hasNext: false,
    } as never);
    const element = await AuthenticatedHome({ user });

    expect(feed.listFeed).toHaveBeenCalledWith("u1", 1, 30);
    expect(findElement(element, FeedPreview)?.props?.selection).toEqual({ cards: [], summary: [] });
    // La comunidad va más abajo, en tarjetas junto a los paneles (redesign-signed-in-home-phase3).
    const communities = findAll(element, CommunityActivity);
    expect(communities).toHaveLength(1);
    expect(communities[0]!.props?.layout).toBe("cards");
  });

  it("los lanzamientos llevan la selección personal (horario con selector)", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({ users: [], page: 1, pageSize: 1, hasNext: false });

    const element = await AuthenticatedHome({ user });

    const releases = findElement(element, HomeReleases);
    expect(releases).not.toBeNull();
    expect(releases!.props?.personalReleases).toBeDefined();
  });

  it("sin seguidos: la comunidad en tarjetas ocupa el lugar del feed y no se repite abajo", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });

    const element = await AuthenticatedHome({ user });

    expect(feed.listFeed).not.toHaveBeenCalled();
    expect(findElement(element, FeedPreview)).toBeNull();
    const communities: unknown[] = [];
    (function collect(node: unknown) {
      if (node == null || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(collect);
      const el = node as { type?: unknown; props?: { children?: unknown } };
      if (el.type === CommunityActivity) communities.push(el);
      collect(el.props?.children);
    })(element);
    expect(communities).toHaveLength(1);
    expect((communities[0] as { props: { layout: string } }).props.layout).toBe("cards");
  });

  // openspec: redesign-signed-in-home-phase1
  it("la cabecera recibe el estado del email y del onboarding; ya no hay enlace suelto a /welcome", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [], page: 1, pageSize: 1, hasNext: false,
    });
    const element = await AuthenticatedHome({ user, emailVerified: false, onboardingPending: true });
    const hero = findElement(element, SignedInHero);
    expect(hero?.props?.emailVerified).toBe(false);
    expect(hero?.props?.onboardingPending).toBe(true);
    expect(hero?.props?.lastTouch).toBeNull();
    expect(readFileSync(join(__dirname, "AuthenticatedHome.tsx"), "utf8")).not.toMatch(/WelcomeLink|EmailVerificationNotice/);
  });

  it("pasa la actividad propia y la lista reciente a sus bloques", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });
    const activity = [{ kind: "listen", id: "l1", target: { type: "release-group", id: "a1", title: "Álbum" } }];
    const resumeList = {
      id: "list1",
      title: "Para el auto",
      entityType: "release-group" as const,
      itemCount: 2,
      coverThumbUrls: [],
    };
    vi.mocked(home.listMyRecentActivity).mockResolvedValue({
      entries: activity,
      page: 1,
      pageSize: 10,
      hasNext: false,
    } as Awaited<ReturnType<typeof home.listMyRecentActivity>>);
    vi.mocked(home.getMostRecentEditedList).mockResolvedValue(resumeList);
    vi.mocked(home.listMyRecentListens).mockResolvedValueOnce([{ id: "l1" }] as never);

    const element = await AuthenticatedHome({ user });

    expect(findElement(element, RecentListensShelf)).not.toBeNull();
    expect(findAll(element, ResumeList)[0]?.props?.list).toEqual(resumeList);
  });

  it("la última vez salta las entradas sin objetivo de catálogo (Camino, lista, favorito)", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [], page: 1, pageSize: 1, hasNext: false,
    });
    const rating = { kind: "rating", id: "r1", target: { type: "release-group", id: "a1", title: "Álbum" } };
    vi.mocked(home.listMyRecentActivity).mockResolvedValue({
      entries: [
        { kind: "camino", id: "c1", event: "created", camino: { id: "c1", title: "Camino", albumCount: 3 } },
        { kind: "list", id: "li1", event: "created", list: { id: "li1", title: "Lista" } },
        rating,
      ],
      page: 1,
      pageSize: 10,
      hasNext: false,
    } as unknown as Awaited<ReturnType<typeof home.listMyRecentActivity>>);

    const element = await AuthenticatedHome({ user });

    expect(findElement(element, SignedInHero)?.props?.lastTouch).toEqual(rating);
  });

  it("la valoración de «Última vez» sale de la entrada si es una valoración, sin consultar", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({ users: [], page: 1, pageSize: 1, hasNext: false });
    const rating = { kind: "rating", id: "r1", stars: "4.0", detailedScore: 77, target: { type: "release-group", id: "a1", title: "Álbum" } };
    vi.mocked(home.listMyRecentActivity).mockResolvedValue({
      entries: [rating], page: 1, pageSize: 10, hasNext: false,
    } as unknown as Awaited<ReturnType<typeof home.listMyRecentActivity>>);

    const element = await AuthenticatedHome({ user });

    expect(findElement(element, SignedInHero)?.props?.ownRating).toEqual({ stars: "4.0", detailedScore: 77 });
    expect(social.getOwnRatingRow).not.toHaveBeenCalled();
  });

  it("para una escucha consulta tu valoración del objetivo", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({ users: [], page: 1, pageSize: 1, hasNext: false });
    const listen = { kind: "listen", id: "l1", target: { type: "release-group", id: "a1", title: "Álbum" } };
    vi.mocked(home.listMyRecentActivity).mockResolvedValue({
      entries: [listen], page: 1, pageSize: 10, hasNext: false,
    } as unknown as Awaited<ReturnType<typeof home.listMyRecentActivity>>);
    vi.mocked(social.getOwnRatingRow).mockResolvedValueOnce({ stars: "4.5", detailedScore: null } as never);

    const element = await AuthenticatedHome({ user });

    expect(social.getOwnRatingRow).toHaveBeenCalledWith({ type: "release-group", id: "a1", column: "releaseGroupId" }, "u1");
    expect(findElement(element, SignedInHero)?.props?.ownRating).toEqual({ stars: "4.5", detailedScore: null });
  });
});

describe("ResumeList: se oculta sin datos", () => {
  it("ResumeList no renderiza nada sin lista", async () => {
    expect(await ResumeList({ list: null })).toBeNull();
  });

});

// openspec: redesign-signed-in-home-phase3
describe("AuthenticatedHome — parte baja", () => {
  beforeEach(() => vi.clearAllMocks());

  const listen = { kind: "listen", id: "l1", target: { type: "release-group", id: "a1", title: "Álbum" } };
  const withActivity = () =>
    vi.mocked(home.listMyRecentActivity).mockResolvedValue({
      entries: [listen], page: 1, pageSize: 10, hasNext: false,
    } as unknown as Awaited<ReturnType<typeof home.listMyRecentActivity>>);
  const withoutActivity = () =>
    vi.mocked(home.listMyRecentActivity).mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false });

  it("pide la comunidad sin la actividad propia", async () => {
    withFollows();
    await AuthenticatedHome({ user });
    expect(communityActivity.listCommunityActivity).toHaveBeenCalledWith("u1", 1, 7, { excludeViewer: true });
  });

  it("«Mejor valorados» solo para una cuenta sin actividad", async () => {
    withoutFollows();
    withActivity();
    vi.mocked(discovery.listTopRated).mockResolvedValue([{ id: "x" }] as never);
    const used = await AuthenticatedHome({ user });
    expect(discovery.listTopRated).not.toHaveBeenCalled();
    expect(findAll(used, AlbumRail)).toHaveLength(0);

    withoutActivity();
    const fresh = await AuthenticatedHome({ user });
    expect(discovery.listTopRated).toHaveBeenCalledTimes(1);
    expect(findAll(fresh, AlbumRail)).toHaveLength(1);
  });

  it("colecciones solo con /explore habilitado", async () => {
    withFollows();
    vi.mocked(discovery.listFeaturedCollections).mockResolvedValue([{ id: "c1" }] as never);
    expect(findAll(await AuthenticatedHome({ user }), CollectionMosaic)).toHaveLength(1);

    vi.mocked(config.isExploreEnabled).mockReturnValueOnce(false);
    vi.mocked(discovery.listFeaturedCollections).mockClear();
    expect(findAll(await AuthenticatedHome({ user }), CollectionMosaic)).toHaveLength(0);
    expect(discovery.listFeaturedCollections).not.toHaveBeenCalled();
  });

  it("retomar lista va al pie del estante con escuchas y como sección sin ellas", async () => {
    withFollows();
    const resumeList = { id: "list1", title: "Lista", entityType: "release-group" as const, itemCount: 1, coverThumbUrls: [] };
    vi.mocked(home.getMostRecentEditedList).mockResolvedValue(resumeList);

    vi.mocked(home.listMyRecentListens).mockResolvedValueOnce([{ id: "l1" }] as never);
    const withListens = await AuthenticatedHome({ user });
    const shelf = findElement(withListens, RecentListensShelf);
    expect(findAll(shelf?.props?.footer, ResumeList)[0]?.props?.variant).toBe("row");

    vi.mocked(home.listMyRecentListens).mockResolvedValueOnce([]);
    const noListens = await AuthenticatedHome({ user });
    expect(findAll(noListens, ResumeList)[0]?.props?.variant).toBeUndefined();
  });
});

// openspec: personalize-signed-in-hero-backdrop
describe("AuthenticatedHome — fondo de la cabecera", () => {
  it("pide tus álbumes del fondo y se los pasa a la cabecera", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({ users: [], page: 1, pageSize: 1, hasNext: false });
    const albums = [{ id: "rg-1", coverThumbUrl: "https://covers/1.jpg" }];
    vi.mocked(home.listMyBackdropAlbums).mockResolvedValueOnce(albums);

    const element = await AuthenticatedHome({ user });

    expect(home.listMyBackdropAlbums).toHaveBeenCalledWith("u1");
    expect(findElement(element, SignedInHero)?.props?.backdropAlbums).toEqual(albums);
  });
});
