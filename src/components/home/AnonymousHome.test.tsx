import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import * as home from "@/services/home/home";
import * as discovery from "@/services/discovery/discovery";
import * as discoveryConfig from "@/lib/config/discovery";
import { AnonymousHome } from "./AnonymousHome";
import { AnonHero } from "./AnonHero";
import { HowItWorks } from "./HowItWorks";
import { AnonCta } from "./AnonCta";
import { QuickLinks } from "./QuickLinks";
import { FeedPreview } from "./FeedPreview";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { AlbumRail } from "@/components/discovery/AlbumRail";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/services/home/home", () => ({
  listCommunityActivity: vi.fn().mockResolvedValue([]),
  listPublicLists: vi.fn().mockResolvedValue([]),
  listRecentCoverArt: vi.fn().mockResolvedValue([]),
  listPopularComments: vi
    .fn()
    .mockResolvedValue({ artist: [], "release-group": [], recording: [] }),
  listHomeReleases: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/discovery/discovery", () => ({
  listTopRated: vi.fn().mockResolvedValue([]),
  listFeaturedCollections: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: vi.fn().mockReturnValue(true) }));
vi.mock("@/components/discovery/CollectionRail", () => ({
  CollectionRail: () => null,
}));
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

  it("arma el muro del hero con las carátulas recientes y no consulta datos de usuario", async () => {
    vi.mocked(home.listRecentCoverArt).mockResolvedValue(["https://cover/1.jpg"]);

    await AnonymousHome();

    expect(home.listRecentCoverArt).toHaveBeenCalled();
    expect(home.listCommunityActivity).toHaveBeenCalledWith(null, 6);
  });

  const album = {
    id: "11111111-1111-4111-8111-111111111111",
    mbid: null,
    title: "Kid A",
    category: "studio" as const,
    firstReleaseDate: null,
    firstReleaseYear: 2000,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("muestra el bloque editorial de álbumes cuando hay colecciones o mejor valorados", async () => {
    vi.mocked(discovery.listTopRated).mockResolvedValue([album]);
    vi.mocked(discovery.listFeaturedCollections).mockResolvedValue([
      { id: "c1", title: "Esenciales", itemCount: 5, coverThumbs: [] },
    ]);

    const element = await AnonymousHome();

    expect(includesType(element, CollectionRail)).toBe(true);
    expect(includesType(element, AlbumRail)).toBe(true);
  });

  it("con el descubrimiento deshabilitado no consulta colecciones curadas; el riel de mejor valorados puede seguir", async () => {
    vi.mocked(discoveryConfig.isExploreEnabled).mockReturnValue(false);
    vi.mocked(discovery.listTopRated).mockResolvedValue([album]);

    const element = await AnonymousHome();

    expect(discovery.listFeaturedCollections).not.toHaveBeenCalled();
    expect(includesType(element, CollectionRail)).toBe(true); // se renderiza con []
    expect(includesType(element, AlbumRail)).toBe(true);
  });

  it("sin colecciones ni mejor valorados, el bloque editorial no se renderiza", async () => {
    // los mocks por defecto devuelven []
    const element = await AnonymousHome();

    expect(includesType(element, CollectionRail)).toBe(false);
    expect(includesType(element, AlbumRail)).toBe(false);
    // el resto del Inicio anónimo sigue
    expect(includesType(element, AnonHero)).toBe(true);
    expect(includesType(element, HowItWorks)).toBe(true);
  });
});
