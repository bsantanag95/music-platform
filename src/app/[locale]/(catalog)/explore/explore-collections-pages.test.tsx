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
  listDecadeCovers: vi.fn(),
  listDecadeCategories: vi.fn(),
  listAlbumsByGenre: vi.fn(),
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
vi.mock("@/services/discovery/decade-covers", () => ({ listDecadeCovers: mocks.listDecadeCovers }));
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
    listDecadeCategories: mocks.listDecadeCategories,
    listAlbumsByGenre: mocks.listAlbumsByGenre,
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
    // En español la década se llama "Años 90", no "1990s".
    expect(decades.tiles.map((tile) => (tile as unknown as { label: string }).label)).toEqual(["Años 2020", "Años 90", "Años 50"]);
    expect((decades.moreTiles as unknown as { label: string }[]).map((tile) => tile.label)).toEqual(["Años 40", "Años 1890"]);
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
    type Link = { key: string; label: string; href: string; current: boolean };
    type ListProps = {
      heading: string;
      crumb: string;
      parentCrumbs?: { label: string; href: string }[];
      baseHref: string;
      lede?: string;
      headerCovers: string[];
      availableCategories: string[];
      related?: { href: string; label: string };
      clearHref?: string;
      facets: { label: string; links: Link[]; menu?: { label: string; links: Link[] } }[];
    };

    const hardRock = { id: "g-hr", slug: "hard-rock", name: "hard rock", nameEs: null };

    beforeEach(() => {
      mocks.listAlbumsByDecade.mockResolvedValue({ albums: [], page: 1, pageSize: 24, hasNext: false });
      mocks.listAlbumsByGenre.mockResolvedValue({ albums: [], page: 1, pageSize: 24, hasNext: false, genre: hardRock });
      mocks.listDecades.mockResolvedValue([{ decade: 2000, count: 5 }, { decade: 1990, count: 9 }]);
      mocks.listDecadeYears.mockResolvedValue([1990, 1994, 1999]);
      mocks.listDecadeGenres.mockResolvedValue([
        { slug: "grunge", name: "grunge", nameEs: null },
        { slug: "hard-rock", name: "hard rock", nameEs: null },
      ]);
      mocks.listDecadeCovers.mockResolvedValue(new Map([[1990, ["c1", "c2", "c3", "c4"]]]));
      mocks.listDecadeCategories.mockResolvedValue(["studio", "single_ep"]);
    });

    const open = async (searchParams: Record<string, string>) => {
      const element = await ExplorePage({ params, searchParams: Promise.resolve(searchParams) });
      return findAll(element, FilteredAlbumList)[0]!.props as ListProps;
    };
    const facet = (props: ListProps, label: string) => props.facets.find((item) => item.label === label)!;

    it("sin refinamientos: título, contexto, mosaico y filas rotuladas de la década", async () => {
      const props = await open({ decada: "1990" });

      expect(props.heading).toBe("decadeResultsHeading");
      expect(props.crumb).toBe("Años 90");
      expect(props.parentCrumbs).toEqual([]);
      expect(props.baseHref).toBe("/explore?decada=1990");
      expect(props.lede).toBe("decadeLede");
      expect(props.headerCovers).toEqual(["c1", "c2", "c3", "c4"]);
      expect(props.related).toBeUndefined();
      expect(props.clearHref).toBeUndefined();
      expect(props.facets.map((item) => item.label)).toEqual(["facetYear", "facetGenre"]);
    });

    it("la fila de años ofrece «Toda la década» marcada y un chip por año, sin pasar el año al listado", async () => {
      const props = await open({ decada: "1990" });
      const years = facet(props, "facetYear");

      expect(years.links.map((link) => link.key)).toEqual(["all", "1990", "1994", "1999"]);
      expect(years.links[0]).toMatchObject({ href: "/explore?decada=1990", current: true });
      expect(years.links[2]).toMatchObject({ href: "/explore?decada=1990&anio=1994", current: false });
      expect(mocks.listAlbumsByDecade).toHaveBeenCalledWith(1990, 1, expect.objectContaining({ year: undefined }));
      expect(mocks.listAlbumsByGenre).not.toHaveBeenCalled();
    });

    it("la fila de géneros filtra en el sitio: «Todos» marcado y cada género con ?genero=", async () => {
      const props = await open({ decada: "1990" });
      const genres = facet(props, "facetGenre");

      expect(genres.links.map((link) => link.key)).toEqual(["all", "grunge", "hard-rock"]);
      expect(genres.links[0]).toMatchObject({ label: "facetAllGenres", href: "/explore?decada=1990", current: true });
      expect(genres.links[1]).toMatchObject({ href: "/explore?decada=1990&genero=grunge", current: false });
    });

    it("un año de la década filtra el listado, cambia el título y agrega un nivel a la miga de pan", async () => {
      const props = await open({ decada: "1990", anio: "1994", tipo: "studio" });

      expect(mocks.listAlbumsByDecade).toHaveBeenCalledWith(1990, 1, expect.objectContaining({ year: 1994, category: "studio" }));
      expect(props.heading).toBe("yearResultsHeading");
      expect(props.crumb).toBe("1994");
      expect(props.parentCrumbs).toEqual([{ label: "Años 90", href: "/explore?decada=1990" }]);
      expect(props.baseHref).toBe("/explore?decada=1990&anio=1994");
      expect(props.clearHref).toBe("/explore?decada=1990");
      expect(facet(props, "facetYear").links.find((link) => link.current)?.key).toBe("1994");
      // Los chips conservan el tipo elegido; los de género conservan además el año.
      expect(facet(props, "facetYear").links[0]!.href).toBe("/explore?decada=1990&tipo=studio");
      expect(facet(props, "facetGenre").links[1]!.href).toBe("/explore?decada=1990&anio=1994&genero=grunge&tipo=studio");
      expect(mocks.listDecadeCategories).toHaveBeenCalledWith(1990, { year: 1994, genreId: undefined });
    });

    it.each(["1985", "2000", "abc", "", "1994.5"])("un año inválido (%j) se ignora y muestra la década completa", async (anio) => {
      const props = await open({ decada: "1990", anio });

      expect(mocks.listAlbumsByDecade).toHaveBeenCalledWith(1990, 1, expect.objectContaining({ year: undefined }));
      expect(props.heading).toBe("decadeResultsHeading");
      expect(props.parentCrumbs).toEqual([]);
      expect(facet(props, "facetYear").links[0]!.current).toBe(true);
    });

    it("un género refina la década: lista por género con la década, título, miga, enlace a su página y «Quitar filtros»", async () => {
      const props = await open({ decada: "1990", genero: "hard-rock", orden: "az" });

      expect(mocks.listAlbumsByGenre).toHaveBeenCalledWith("hard-rock", 1, expect.objectContaining({ decade: 1990, year: undefined, sort: "az" }));
      expect(mocks.listAlbumsByDecade).not.toHaveBeenCalled();
      expect(props.heading).toBe("decadeGenreHeading");
      expect(props.parentCrumbs).toEqual([{ label: "Años 90", href: "/explore?decada=1990" }]);
      expect(props.crumb).toBe("hard rock");
      expect(props.baseHref).toBe("/explore?decada=1990&genero=hard-rock");
      expect(props.related).toEqual({ href: "/genre/hard-rock?tab=albums&decada=1990", label: "genrePageLink" });
      expect(props.clearHref).toBe("/explore?decada=1990");
      expect(mocks.listDecadeCategories).toHaveBeenCalledWith(1990, { year: undefined, genreId: "g-hr" });
      const genres = facet(props, "facetGenre");
      expect(genres.links[0]).toMatchObject({ current: false });
      expect(genres.links.find((link) => link.current)?.key).toBe("hard-rock");
      // «Todos» quita el género y conserva el orden.
      expect(genres.links[0]!.href).toBe("/explore?decada=1990&orden=az");
    });

    it("género y año a la vez: los chips conservan el otro y la miga tiene los dos niveles", async () => {
      const props = await open({ decada: "1990", anio: "1994", genero: "hard-rock" });

      expect(mocks.listAlbumsByGenre).toHaveBeenCalledWith("hard-rock", 1, expect.objectContaining({ decade: 1990, year: 1994 }));
      expect(props.heading).toBe("decadeGenreYearHeading");
      expect(props.parentCrumbs).toEqual([
        { label: "Años 90", href: "/explore?decada=1990" },
        { label: "1994", href: "/explore?decada=1990&anio=1994" },
      ]);
      expect(props.baseHref).toBe("/explore?decada=1990&anio=1994&genero=hard-rock");
      // Año: conserva el género; «Toda la década» quita el año. Género: «Todos» conserva el año.
      expect(facet(props, "facetYear").links[0]!.href).toBe("/explore?decada=1990&genero=hard-rock");
      expect(facet(props, "facetYear").links[1]!.href).toBe("/explore?decada=1990&anio=1990&genero=hard-rock");
      expect(facet(props, "facetGenre").links[0]!.href).toBe("/explore?decada=1990&anio=1994");
    });

    it("cambiar de década conserva el género, el tipo y el orden y quita el año", async () => {
      const props = await open({ decada: "1990", anio: "1994", genero: "hard-rock", tipo: "studio", orden: "az" });
      const menu = facet(props, "facetYear").menu!;

      expect(menu.label).toBe("otherDecades");
      expect(menu.links.map((link) => link.label)).toEqual(["Años 90", "Años 2000"]);
      expect(menu.links[0]).toMatchObject({ current: true });
      expect(menu.links[1]!.href).toBe("/explore?decada=2000&genero=hard-rock&tipo=studio&orden=az");
    });

    it("un género de la URL que no está entre los de la fila se agrega al final, marcado", async () => {
      mocks.listAlbumsByGenre.mockResolvedValue({
        albums: [],
        page: 1,
        pageSize: 24,
        hasNext: false,
        genre: { id: "g-sg", slug: "shoegaze", name: "shoegaze", nameEs: null },
      });

      const props = await open({ decada: "1990", genero: "shoegaze" });
      const genres = facet(props, "facetGenre").links;

      expect(genres.map((link) => link.key)).toEqual(["all", "grunge", "hard-rock", "shoegaze"]);
      expect(genres[3]).toMatchObject({ label: "shoegaze", current: true });
      expect(genres[0]!.current).toBe(false);
    });

    it("un género desconocido no inventa enlace a su página ni chip", async () => {
      mocks.listAlbumsByGenre.mockResolvedValue({ albums: [], page: 1, pageSize: 24, hasNext: false, genre: null });

      const props = await open({ decada: "1990", genero: "no-existe" });

      expect(props.related).toBeUndefined();
      expect(props.crumb).toBe("no-existe");
      expect(props.clearHref).toBe("/explore?decada=1990");
      expect(facet(props, "facetGenre").links.map((link) => link.key)).toEqual(["all", "grunge", "hard-rock"]);
      expect(mocks.listDecadeCategories).toHaveBeenCalledWith(1990, { year: undefined, genreId: undefined });
    });

    it("una familia junto a la década se ignora", async () => {
      await open({ decada: "1990", familia: "rock" });

      expect(mocks.listAlbumsByDecade).toHaveBeenCalledTimes(1);
      expect(mocks.listAlbumsByGenre).not.toHaveBeenCalled();
    });

    it("la línea de contexto solo acompaña al orden «Destacados»", async () => {
      expect((await open({ decada: "1990" })).lede).toBe("decadeLede");
      expect((await open({ decada: "1990", orden: "recientes" })).lede).toBeUndefined();
    });

    it("pasa los tipos con discos en el corte para deshabilitar los demás", async () => {
      mocks.listDecadeCategories.mockResolvedValue(["single_ep"]);

      expect((await open({ decada: "1910" })).availableCategories).toEqual(["single_ep"]);
      expect(mocks.listDecadeCategories).toHaveBeenCalledWith(1910, { year: undefined, genreId: undefined });
    });

    it("sin carátulas de la década la cabecera no lleva mosaico", async () => {
      mocks.listDecadeCovers.mockResolvedValue(new Map());

      expect((await open({ decada: "1990" })).headerCovers).toEqual([]);
    });

    it("una década inválida muestra el estado vacío sin romper la página", async () => {
      mocks.listAlbumsByDecade.mockRejectedValue(Object.assign(new (await import("@/lib/api/errors")).ApiError("VALIDATION_ERROR", 400, "La década no es válida")));
      mocks.listDecadeYears.mockRejectedValue(new (await import("@/lib/api/errors")).ApiError("VALIDATION_ERROR", 400, "La década no es válida"));
      mocks.listDecadeCategories.mockRejectedValue(new (await import("@/lib/api/errors")).ApiError("VALIDATION_ERROR", 400, "La década no es válida"));

      const props = await open({ decada: "1995" });

      expect(props.crumb).toBe("1995");
      expect(props.availableCategories).toEqual([]);
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
