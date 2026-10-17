import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { ArchivedCollection, FeaturedCollection } from "@/services/discovery/discovery";

// Páginas de colecciones de Explorar (openspec: split-explore-collections): la portada `/explore` con sus dos riles y
// la página `/explore/collections`. Se inspecciona el árbol de elementos que devuelven los Server Components.

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
  isExploreEnabled: vi.fn(),
  getExplorePage: vi.fn(),
  listCollectionsHub: vi.fn(),
  listCollectionArchive: vi.fn(),
  listCollectionFamilies: vi.fn(),
  listCollectionSummaries: vi.fn(),
  listAlbumsByDecade: vi.fn(),
  listDecades: vi.fn(),
  listDecadeYears: vi.fn(),
  listDecadeGenres: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi
    .fn()
    .mockResolvedValue(Object.assign((key: string) => key, { rich: (key: string) => key, has: () => true })),
}));
vi.mock("@/services/discovery/collections/summaries", () => ({ listCollectionSummaries: mocks.listCollectionSummaries }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: () => null }));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: mocks.isExploreEnabled }));
vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
vi.mock("@/services/awards/read", () => ({ listRecentCeremonies: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/discovery/collections/sync", () => ({ ensureCollectionsFresh: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/services/discovery/decade-genres", () => ({ listDecadeGenres: mocks.listDecadeGenres }));
vi.mock("@/services/genres/names", () => ({
  genreDisplayName: (item: { name: string }) => item.name,
  genreLocaleOf: vi.fn(),
}));
vi.mock("@/services/discovery/discovery", async () => {
  const actual = await vi.importActual<typeof import("@/services/discovery/discovery")>("@/services/discovery/discovery");
  return {
    ...actual,
    getExplorePage: mocks.getExplorePage,
    albumArtistNames: vi.fn().mockResolvedValue({}),
    listCollectionsHub: mocks.listCollectionsHub,
    listCollectionArchive: mocks.listCollectionArchive,
    listCollectionFamilies: mocks.listCollectionFamilies,
    listAlbumsByDecade: mocks.listAlbumsByDecade,
    listDecades: mocks.listDecades,
    listDecadeYears: mocks.listDecadeYears,
  };
});

const { default: ExplorePage } = await import("./page");
const { default: CollectionsPage } = await import("./collections/page");
const { CollectionRail } = await import("@/components/discovery/CollectionRail");
const { FeaturedCollection } = await import("@/components/discovery/FeaturedCollection");
const { CollectionFamilyFilter } = await import("@/components/discovery/CollectionFamilyFilter");
const { ExploreJumpNav } = await import("@/components/discovery/ExploreJumpNav");
const { PopularNow } = await import("@/components/discovery/PopularNow");
const { MosaicGrid } = await import("@/components/discovery/MosaicGrid");
const { FilteredAlbumList } = await import("@/components/discovery/FilteredAlbumList");

/** Todos los elementos de `type` dentro del árbol devuelto por el componente. */
function findAll(node: ReactNode, type: unknown, found: ReactElement[] = []): ReactElement[] {
  if (node == null || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((child) => findAll(child, type, found));
    return found;
  }
  if (!isValidElement(node)) return found;
  if (node.type === type) found.push(node);
  findAll((node.props as { children?: ReactNode }).children, type, found);
  return found;
}

const collection = (id: string, over: Partial<FeaturedCollection> = {}): FeaturedCollection => ({
  id,
  title: `Colección ${id}`,
  description: null,
  itemCount: 12,
  coverThumbs: [],
  source: "template",
  templateKey: "anniversaries",
  periodKey: "2026-10",
  family: "ephemeris",
  ...over,
});

const archived = (id: string): ArchivedCollection => ({ ...collection(id), endedAt: "2026-09-01T00:00:00.000Z" });

const empty = {
  collections: [] as FeaturedCollection[],
  newReleases: [],
  upcoming: [],
  decades: [],
  families: [],
  topRated: [],
  popular: { albums: null, artists: null, songs: null },
};

const params = Promise.resolve({ locale: "es" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isExploreEnabled.mockReturnValue(true);
  mocks.getExplorePage.mockResolvedValue(empty);
  mocks.listCollectionsHub.mockResolvedValue({ collections: [] });
  mocks.listCollectionArchive.mockResolvedValue({ collections: [], page: 1, pageSize: 24, hasNext: false });
  mocks.listCollectionFamilies.mockResolvedValue([]);
  mocks.listCollectionSummaries.mockResolvedValue(new Map());
});

describe("/explore: un solo riel de colecciones", () => {
  it("mezcla curadas y generadas en un riel desplazable, con su ancla y «Ver todas»", async () => {
    mocks.getExplorePage.mockResolvedValue({
      ...empty,
      collections: [
        collection("e1", { source: "curated", templateKey: null, periodKey: null, family: "discovery" }),
        collection("a1"),
      ],
    });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const rails = findAll(element, CollectionRail);

    expect(rails).toHaveLength(1);
    const rail = rails[0]!.props as {
      id: string;
      collections: FeaturedCollection[];
      seeAll?: { href: string };
      familyLabel?: unknown;
      layout?: string;
    };
    expect(rail.id).toBe("colecciones");
    // El orden que trae el servicio se respeta: una curada puede ir antes que una generada.
    expect(rail.collections.map((c) => c.id)).toEqual(["e1", "a1"]);
    expect(rail.seeAll?.href).toBe("/explore/collections");
    expect(rail.layout).toBe("scroll");
    // La familia se muestra en toda colección, no solo en las generadas.
    expect(rail.familyLabel).toBeTypeOf("function");
  });

  it("la navegación rápida enlaza el riel solo si tiene contenido", async () => {
    mocks.getExplorePage.mockResolvedValue({
      ...empty,
      collections: [collection("a1")],
      families: [{ key: "rock", tier: "main", count: 3 }],
    });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const nav = findAll(element, ExploreJumpNav)[0]!.props as { items: { id: string }[] };

    expect(nav.items.map((item) => item.id)).toEqual(["colecciones", "generos"]);
  });

  it("Popular ahora va después de Colecciones y la navegación rápida la enlaza solo si tiene contenido", async () => {
    const popular = {
      albums: null,
      artists: { window: "month" as const, items: [{ id: "x", name: "Artista", photoUrl: null, people: 2 }] },
      songs: null,
    };
    mocks.getExplorePage.mockResolvedValue({
      ...empty,
      popular,
      collections: [collection("a1")],
      families: [{ key: "rock", tier: "main", count: 3, covers: [] }],
    });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const nav = findAll(element, ExploreJumpNav)[0]!.props as { items: { id: string }[] };
    const section = findAll(element, PopularNow)[0]!.props as { section: unknown };

    expect(nav.items.map((item) => item.id)).toEqual(["colecciones", "popular", "generos"]);
    expect(section.section).toBe(popular);
    // Ya no hay un riel «Más reseñados».
    expect(nav.items.some((item) => item.id === "mas-resenados")).toBe(false);
  });

  it("sin colecciones vigentes, el riel no se enlaza", async () => {
    mocks.getExplorePage.mockResolvedValue({ ...empty, families: [{ key: "rock", tier: "main", count: 3 }] });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const nav = findAll(element, ExploreJumpNav)[0]?.props as { items: { id: string }[] } | undefined;

    expect(nav?.items.some((item) => item.id === "colecciones") ?? false).toBe(false);
  });
});

describe("/explore: Explorar por década (openspec: redesign-explore-decades)", () => {
  const card = (decade: number, covers: string[] = []) => ({ decade, count: 100, covers });

  it("pinta las décadas como mosaico, de la más reciente a la más antigua, y las anteriores a 1950 van aparte", async () => {
    mocks.getExplorePage.mockResolvedValue({
      ...empty,
      families: [{ key: "rock", tier: "main", count: 3, covers: [] }],
      decades: [card(2020, ["a", "b"]), card(1990), card(1950), card(1940), card(1890)],
    });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const grids = findAll(element, MosaicGrid).map((grid) => grid.props as { id: string; tiles: { key: string; href: string; covers: string[] }[]; moreTiles?: { key: string }[]; moreLabel?: string });
    const decades = grids.find((grid) => grid.id === "decadas")!;

    expect(decades.tiles.map((tile) => tile.key)).toEqual(["2020", "1990", "1950"]);
    expect(decades.tiles[0]).toMatchObject({ href: "/explore?decada=2020", covers: ["a", "b"] });
    expect(decades.moreTiles?.map((tile) => tile.key)).toEqual(["1940", "1890"]);
    expect(decades.moreLabel).toBe("earlierDecades");
    // La sección de géneros sigue siendo la otra grilla, antes de la de décadas.
    expect(grids.map((grid) => grid.id)).toEqual(["generos", "decadas"]);
  });

  it("la navegación rápida enlaza Décadas justo después de Géneros", async () => {
    mocks.getExplorePage.mockResolvedValue({
      ...empty,
      collections: [collection("a1")],
      families: [{ key: "rock", tier: "main", count: 3, covers: [] }],
      newReleases: [{ id: "n1" }],
      decades: [card(2020)],
    });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const nav = findAll(element, ExploreJumpNav)[0]!.props as { items: { id: string }[] };

    expect(nav.items.map((item) => item.id)).toEqual(["colecciones", "generos", "decadas", "novedades"]);
  });

  describe("vista de década", () => {
    type ListProps = {
      heading: string;
      crumb: string;
      parentCrumb?: { label: string; href: string };
      baseHref: string;
      years: { links: { key: string; href: string; current: boolean }[] };
      topics: { links: { key: string; label: string; href: string }[] };
      siblings: { collapsed?: boolean; links: { key: string; href: string; current: boolean }[] };
    };

    beforeEach(() => {
      mocks.listAlbumsByDecade.mockResolvedValue({ albums: [], page: 1, pageSize: 24, hasNext: false });
      mocks.listDecades.mockResolvedValue([{ decade: 2000, count: 5 }, { decade: 1990, count: 9 }]);
      mocks.listDecadeYears.mockResolvedValue([1990, 1994, 1999]);
      mocks.listDecadeGenres.mockResolvedValue([{ slug: "grunge", name: "grunge", nameEs: null }]);
    });

    const open = async (searchParams: Record<string, string>) => {
      const element = await ExplorePage({ params, searchParams: Promise.resolve(searchParams) });
      return findAll(element, FilteredAlbumList)[0]!.props as ListProps;
    };

    it("ofrece los años de la década, con «Toda la década» marcada, y no los pasa al listado sin año", async () => {
      const props = await open({ decada: "1990" });

      expect(props.heading).toBe("decadeResultsHeading");
      expect(props.baseHref).toBe("/explore?decada=1990");
      expect(props.years.links.map((link) => link.key)).toEqual(["all", "1990", "1994", "1999"]);
      expect(props.years.links[0]).toMatchObject({ href: "/explore?decada=1990", current: true });
      expect(props.years.links[2]).toMatchObject({ href: "/explore?decada=1990&anio=1994", current: false });
      expect(mocks.listAlbumsByDecade).toHaveBeenCalledWith(1990, 1, expect.objectContaining({ year: undefined }));
    });

    it("un año de la década filtra el listado, cambia el título y agrega un nivel a la miga de pan", async () => {
      const props = await open({ decada: "1990", anio: "1994", tipo: "studio" });

      expect(mocks.listAlbumsByDecade).toHaveBeenCalledWith(1990, 1, expect.objectContaining({ year: 1994, category: "studio" }));
      expect(props.heading).toBe("yearResultsHeading");
      expect(props.crumb).toBe("1994");
      expect(props.parentCrumb).toEqual({ label: "decadeChip", href: "/explore?decada=1990" });
      expect(props.baseHref).toBe("/explore?decada=1990&anio=1994");
      expect(props.years.links.find((link) => link.current)?.key).toBe("1994");
      // Los chips conservan el tipo elegido.
      expect(props.years.links[0]!.href).toBe("/explore?decada=1990&tipo=studio");
      expect(props.years.links[1]!.href).toBe("/explore?decada=1990&anio=1990&tipo=studio");
    });

    it.each(["1985", "2000", "abc", "", "1994.5"])("un año inválido (%j) se ignora y muestra la década completa", async (anio) => {
      const props = await open({ decada: "1990", anio });

      expect(mocks.listAlbumsByDecade).toHaveBeenCalledWith(1990, 1, expect.objectContaining({ year: undefined }));
      expect(props.heading).toBe("decadeResultsHeading");
      expect(props.parentCrumb).toBeUndefined();
      expect(props.years.links[0]!.current).toBe(true);
    });

    it("los géneros de la década llevan a la página del género ya filtrada por esa década", async () => {
      const props = await open({ decada: "1990", anio: "1994" });

      expect(props.topics.links).toEqual([{ key: "grunge", label: "grunge", href: "/genre/grunge?tab=albums&decada=1990" }]);
    });

    it("las otras décadas van plegadas, sin el año, conservando el tipo", async () => {
      const props = await open({ decada: "1990", anio: "1994", tipo: "studio" });

      expect(props.siblings.collapsed).toBe(true);
      expect(props.siblings.links.map((link) => link.key)).toEqual(["1990", "2000"]);
      expect(props.siblings.links[1]).toMatchObject({ href: "/explore?decada=2000&tipo=studio", current: false });
      expect(props.siblings.links[0]!.current).toBe(true);
    });
  });
});

describe("/explore/collections", () => {
  it("redirige a Inicio con Explorar apagado", async () => {
    mocks.isExploreEnabled.mockReturnValue(false);

    await expect(CollectionsPage({ params, searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/", locale: "es" });
  });

  const curated = (id: string, family: FeaturedCollection["family"] = "discovery") =>
    collection(id, { source: "curated", templateKey: null, periodKey: null, family });
  const railOf = (element: ReactNode, id: string) =>
    findAll(element, CollectionRail).find((rail) => (rail.props as { id: string }).id === id)?.props as
      | { collections: FeaturedCollection[]; emptyMessage?: ReactNode; compact?: boolean; bare?: boolean }
      | undefined;

  it("abre con la primera vigente como destacada y pone el resto en una sola rejilla, sin agrupar por familia", async () => {
    mocks.listCollectionsHub.mockResolvedValue({
      collections: [curated("e1"), collection("a1", { family: "awards" }), collection("a2", { family: "ephemeris" })],
    });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });
    const featured = findAll(element, FeaturedCollection)[0]!.props as { title: string; familyLabel: string; href: string };

    // La destacada es la primera del orden editorial, curada o generada.
    expect(featured.title).toBe("Colección e1");
    expect(featured.familyLabel).toBe("collectionFamilies.discovery");
    expect(featured.href).toContain("e1");
    const grid = railOf(element, "vigentes-rejilla")!;
    expect(grid.collections.map((c) => c.id)).toEqual(["a1", "a2"]);
    expect(grid.bare).toBe(true);
    // Ya no hay un bloque por familia.
    expect(findAll(element, CollectionRail).some((rail) => String((rail.props as { id: string }).id).startsWith("familia-"))).toBe(false);
  });

  it("con una sola vigente, la muestra como destacada y no pinta la rejilla", async () => {
    mocks.listCollectionsHub.mockResolvedValue({ collections: [collection("a1", { family: "awards" })] });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });

    expect(findAll(element, FeaturedCollection)).toHaveLength(1);
    expect(railOf(element, "vigentes-rejilla")).toBeUndefined();
  });

  it("con un filtro de familia, muestra solo esa familia, sin destacada, y se lo pasa al archivo", async () => {
    mocks.listCollectionsHub.mockResolvedValue({
      collections: [collection("a1", { family: "awards" }), collection("a2", { family: "ephemeris" }), collection("a3", { family: "awards" })],
    });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "awards" }) });

    expect(findAll(element, FeaturedCollection)).toHaveLength(0);
    expect(railOf(element, "vigentes-rejilla")!.collections.map((c) => c.id)).toEqual(["a1", "a3"]);
    expect(mocks.listCollectionArchive).toHaveBeenLastCalledWith({ family: "awards", page: 1 });
  });

  it("sin vigentes no pinta destacada ni rejilla: queda el archivo", async () => {
    mocks.listCollectionArchive.mockResolvedValue({ collections: [archived("v1")], page: 1, pageSize: 24, hasNext: false });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });

    expect(findAll(element, FeaturedCollection)).toHaveLength(0);
    expect(railOf(element, "vigentes-rejilla")).toBeUndefined();
    expect(railOf(element, "anteriores")!.collections.map((c) => c.id)).toEqual(["v1"]);
  });

  it("ofrece el filtro con Todas y las familias que trae el servicio, y marca la activa", async () => {
    mocks.listCollectionFamilies.mockResolvedValue(["ephemeris", "awards"]);

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "awards" }) });
    const filter = findAll(element, CollectionFamilyFilter)[0]!.props as {
      options: { value: string | null; href: string }[];
      active?: string;
    };

    expect(filter.options.map((option) => option.value)).toEqual([null, "ephemeris", "awards"]);
    expect(filter.options[0]!.href).toBe("/explore/collections");
    expect(filter.options[2]!.href).toBe("/explore/collections?familia=awards");
    expect(filter.active).toBe("awards");
  });

  it("la frase de contexto de cada tarjeta sale del resumen del presentador", async () => {
    mocks.listCollectionsHub.mockResolvedValue({ collections: [curated("e1"), collection("a1")] });
    mocks.listCollectionSummaries.mockResolvedValue(new Map([["a1", { key: "anniversariesSummary" }]]));

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });
    const grid = railOf(element, "vigentes-rejilla") as unknown as { contextFor: (c: { id: string }) => string | undefined };

    expect(grid.contextFor({ id: "a1" })).toBe("anniversariesSummary");
    expect(grid.contextFor({ id: "e1" })).toBeUndefined();
  });

  it("pasa la familia y la página al archivo, e ignora una familia inválida", async () => {
    await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "awards", pagina: "3" }) });
    expect(mocks.listCollectionArchive).toHaveBeenLastCalledWith({ family: "awards", page: 3 });

    await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "inventada", pagina: "-2" }) });
    expect(mocks.listCollectionArchive).toHaveBeenLastCalledWith({ family: undefined, page: 1 });
  });

  it("el archivo vacío sin filtro no pinta nada (sin mensaje que lo mantenga)", async () => {
    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });

    expect(railOf(element, "anteriores")!.emptyMessage).toBeUndefined();
  });

  it("con filtro de familia, el archivo vacío dice que no hay de ese tipo y ofrece volver a Todas", async () => {
    const element = await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "awards" }) });
    const empty = railOf(element, "anteriores")!.emptyMessage;

    expect(empty).toBeDefined();
    expect(isValidElement(empty)).toBe(true);
  });

  it("el archivo usa tarjetas densas", async () => {
    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });

    expect(railOf(element, "anteriores")!.compact).toBe(true);
  });

  it("muestra la fecha en que cada colección del archivo dejó de estar vigente", async () => {
    mocks.listCollectionArchive.mockResolvedValue({ collections: [archived("v1")], page: 1, pageSize: 24, hasNext: false });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });
    const archive = findAll(element, CollectionRail).find((rail) => (rail.props as { id: string }).id === "anteriores")!;
    const note = (archive.props as { noteFor: (c: ArchivedCollection) => string }).noteFor(archived("v1"));

    expect(note).toBe("endedOn");
  });
});
