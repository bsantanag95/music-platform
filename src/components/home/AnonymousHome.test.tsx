import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import * as communityActivity from "@/services/activity/community-activity";
import * as discovery from "@/services/discovery/discovery";
import * as discoveryConfig from "@/lib/config/discovery";
import { AnonymousHome } from "./AnonymousHome";
import { AnonHero } from "./AnonHero";
import { HowItWorks } from "./HowItWorks";
import { AnonCta } from "./AnonCta";
import { HomeReleases } from "./HomeReleases";
import { QuickLinks } from "./QuickLinks";
import { FeedPreview } from "./FeedPreview";
import { CollectionMosaic } from "./CollectionMosaic";
import { CommunityActivity } from "./CommunityActivity";
import { PeopleCard } from "./PeopleCard";
import { AlbumRail } from "@/components/discovery/AlbumRail";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/services/home/home", () => ({
  listPublicLists: vi.fn().mockResolvedValue([]),
  listPopularComments: vi
    .fn()
    .mockResolvedValue({ artist: [], "release-group": [], recording: [] }),
  listHomeReleases: vi.fn().mockResolvedValue([]),
  ensureReleaseCalendarFresh: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/activity/community-activity", () => ({
  listCommunityActivity: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 6, hasNext: false }),
}));

vi.mock("@/services/discovery/discovery", () => ({
  listTopRated: vi.fn().mockResolvedValue([]),
  listFeaturedCollections: vi.fn().mockResolvedValue([]),
  albumArtistNames: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: vi.fn().mockReturnValue(true) }));
vi.mock("@/components/discovery/AlbumRail", () => ({ AlbumRail: () => null }));

function includesType(node: unknown, type: unknown): boolean {
  if (node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((child) => includesType(child, type));
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return true;
  return includesType(element.props?.children, type);
}

describe("AnonymousHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` no revierte implementaciones — se reponen los defaults
    // para que un `mockResolvedValue` de un test no se filtre al siguiente.
    vi.mocked(discovery.listTopRated).mockResolvedValue([]);
    vi.mocked(discovery.listFeaturedCollections).mockResolvedValue([]);
    vi.mocked(discoveryConfig.isExploreEnabled).mockReturnValue(true);
  });

  it("muestra hero, carrusel y CTA; nunca accesos ni feed de usuario", async () => {
    const element = await AnonymousHome();

    expect(includesType(element, AnonHero)).toBe(true);
    expect(includesType(element, HowItWorks)).toBe(true);
    expect(includesType(element, AnonCta)).toBe(true);
    expect(includesType(element, QuickLinks)).toBe(false);
    expect(includesType(element, FeedPreview)).toBe(false);
  });

  it("el muro del hero es estático y no consulta datos de usuario", async () => {
    await AnonymousHome();

    expect(communityActivity.listCommunityActivity).toHaveBeenCalledWith(null, 1, 7);
  });

  const album = {
    id: "11111111-1111-4111-8111-111111111111",
    mbid: null,
    title: "Kid A",
    category: "studio" as const,
    firstReleaseDate: null,
    firstReleaseYear: 2000,
    createdAt: "2026-01-01T00:00:00.000Z",
    coverThumbUrl: null,
    coverResolved: false,
  };

  it("muestra el bloque editorial de álbumes cuando hay colecciones o mejor valorados", async () => {
    vi.mocked(discovery.listTopRated).mockResolvedValue([{ ...album, avgStars: 4.2, ratingCount: 5 }]);
    vi.mocked(discovery.listFeaturedCollections).mockResolvedValue([
      { id: "c1", title: "Esenciales", description: null, itemCount: 5, coverThumbs: [], source: "curated", templateKey: null, periodKey: null, family: "discovery" },
    ]);

    const element = await AnonymousHome();

    expect(includesType(element, CollectionMosaic)).toBe(true);
    expect(includesType(element, AlbumRail)).toBe(true);
  });

  it("con el descubrimiento deshabilitado no consulta colecciones curadas; el riel de mejor valorados puede seguir", async () => {
    vi.mocked(discoveryConfig.isExploreEnabled).mockReturnValue(false);
    vi.mocked(discovery.listTopRated).mockResolvedValue([{ ...album, avgStars: 4.2, ratingCount: 5 }]);

    const element = await AnonymousHome();

    expect(discovery.listFeaturedCollections).not.toHaveBeenCalled();
    expect(includesType(element, CollectionMosaic)).toBe(false);
    expect(includesType(element, AlbumRail)).toBe(true);
  });

  function findProps(node: unknown, type: unknown): Record<string, unknown> | null {
    if (node == null || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findProps(child, type);
        if (found) return found;
      }
      return null;
    }
    const element = node as { type?: unknown; props?: Record<string, unknown> & { children?: unknown } };
    if (element.type === type) return element.props ?? {};
    return findProps(element.props?.children, type);
  }

  it("mejor valorados va en riel con el artista y el promedio de estrellas", async () => {
    vi.mocked(discovery.listTopRated).mockResolvedValue([{ ...album, avgStars: 4.25, ratingCount: 5 }]);
    vi.mocked(discovery.albumArtistNames).mockResolvedValue({ [album.id]: "Radiohead" });

    const element = await AnonymousHome();

    const rail = findProps(element, AlbumRail)!;
    expect(rail.layout).toBe("scroll");
    expect(rail.artistNames).toEqual({ [album.id]: "Radiohead" });
    expect(rail.stats).toEqual({ [album.id]: "★ 4,3" });
  });

  it("los lanzamientos van como horario y el cierre ofrece explorar si está habilitado", async () => {
    const element = await AnonymousHome();

    expect(findProps(element, HomeReleases)?.personalReleases).toBeUndefined();
    expect(findProps(element, AnonCta)?.exploreEnabled).toBe(true);
  });

  it("la comunidad va en tarjetas y el acceso a personas aparece aunque no haya actividad", async () => {
    // los mocks por defecto devuelven [] en actividad, comentarios y listas
    const element = await AnonymousHome();

    expect(findProps(element, CommunityActivity)?.layout).toBe("cards");
    expect(includesType(element, PeopleCard)).toBe(true);
  });

  it("sin colecciones ni mejor valorados, el bloque editorial no se renderiza", async () => {
    // los mocks por defecto devuelven []
    const element = await AnonymousHome();

    expect(includesType(element, CollectionMosaic)).toBe(false);
    expect(includesType(element, AlbumRail)).toBe(false);
    // el resto del Inicio anónimo sigue
    expect(includesType(element, AnonHero)).toBe(true);
    expect(includesType(element, HowItWorks)).toBe(true);
  });
});
