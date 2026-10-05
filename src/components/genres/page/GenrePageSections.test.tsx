import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseGenreParams } from "@/services/genres/page-params";

const mocks = vi.hoisted(() => ({
  essentials: vi.fn(),
  news: vi.fn(),
  artists: vi.fn(),
  stats: vi.fn(),
  lists: vi.fn(),
  footprint: vi.fn(),
  reviews: vi.fn(),
  listAlbumsFiltered: vi.fn(),
  findDescendant: vi.fn(),
  primary: vi.fn(),
  albumsView: vi.fn(),
  treeCondition: { cond: "tree" },
  exactCondition: { cond: "exact" },
}));

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));
vi.mock("@/services/genres/rails", () => ({ getGenreEssentials: mocks.essentials, getGenreNewReleases: mocks.news }));
vi.mock("@/services/genres/artists", () => ({ listGenreArtists: mocks.artists }));
vi.mock("@/services/genres/stats", () => ({ getGenreStats: mocks.stats }));
vi.mock("@/services/genres/personal", () => ({ getGenreFootprint: mocks.footprint }));
vi.mock("./GenreFootprint", () => ({ GenreFootprint: () => null }));
vi.mock("@/services/genres/lists", () => ({ listGenreLists: mocks.lists }));
vi.mock("@/services/genres/reviews", () => ({ getGenreRecentReviews: mocks.reviews }));
vi.mock("./GenreCommunity", () => ({
  GenreListsPreview: () => null,
  GenreListsView: () => null,
  GenreRecentReviews: () => null,
}));
vi.mock("@/services/discovery/discovery", () => ({ listAlbumsFiltered: mocks.listAlbumsFiltered }));
vi.mock("@/services/catalog/primary-artists", () => ({ resolvePrimaryArtists: mocks.primary }));
vi.mock("@/services/genres/read", () => ({
  albumInGenreTree: () => mocks.treeCondition,
  albumHasGenre: () => mocks.exactCondition,
  findDescendantStyleGenre: mocks.findDescendant,
}));
vi.mock("./GenreAlbumsView", () => ({
  GenreAlbumsView: (props: unknown) => {
    mocks.albumsView(props);
    return null;
  },
}));
vi.mock("@/components/discovery/AlbumRail", () => ({ AlbumRail: () => null }));

const {
  GenreAlbumsSection,
  GenreEssentialsSection,
  GenreNewReleasesSection,
  GenreArtistsPreviewSection,
  GenreListsPreviewSection,
  GenreListsSection,
  GenreReviewsSection,
  GenreFootprintSection,
} = await import("./GenrePageSections");

const data = {
  genre: { id: "g1", slug: "shoegaze", name: "shoegaze", nameEs: null },
  families: [],
  parents: [],
  children: [
    { slug: "dream-pop", name: "dream pop", nameEs: null, albumCount: 5 },
    { slug: "vacío", name: "vacío", nameEs: null, albumCount: 0 },
  ],
  related: [],
} as never;
const base = {
  data,
  params: parseGenreParams({}),
  categoryLabels: { studio: "", single_ep: "", compilation: "", live_other: "" },
  coverLabel: "",
  authenticated: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAlbumsFiltered.mockResolvedValue({ albums: [], hasNext: false, page: 1, pageSize: 24 });
  mocks.stats.mockResolvedValue({ allDecades: [1990, 1980], decades: [] });
  mocks.primary.mockResolvedValue({ releaseGroups: new Map(), recordings: new Map() });
  mocks.findDescendant.mockResolvedValue(null);
});

describe("secciones del Resumen: se omiten bajo su umbral", () => {
  it("Esenciales no se renderiza si el servicio devuelve []", async () => {
    mocks.essentials.mockResolvedValue([]);
    await expect(GenreEssentialsSection(base)).resolves.toBeNull();
  });

  it("Novedades no se renderiza sin álbumes", async () => {
    mocks.news.mockResolvedValue([]);
    await expect(GenreNewReleasesSection(base)).resolves.toBeNull();
  });

  it("Artistas no se renderiza sin artistas", async () => {
    mocks.artists.mockResolvedValue({ artists: [], hasNext: false });
    await expect(GenreArtistsPreviewSection(base)).resolves.toBeNull();
  });

  it("Esenciales y Novedades se renderizan con álbumes", async () => {
    mocks.essentials.mockResolvedValue([{ id: "a" }]);
    mocks.news.mockResolvedValue([{ id: "b" }]);
    await expect(GenreEssentialsSection(base)).resolves.not.toBeNull();
    await expect(GenreNewReleasesSection(base)).resolves.not.toBeNull();
  });
});

describe("GenreAlbumsSection", () => {
  async function render(query: Record<string, string>) {
    const element = await GenreAlbumsSection({ ...base, params: parseGenreParams({ tab: "albums", ...query }), locale: "es" });
    (element as { type: (props: unknown) => unknown; props: unknown }).type((element as { props: unknown }).props);
    return mocks.albumsView.mock.calls[0]![0] as { params: { sub?: string }; subgenres: { value: string }[]; decades: number[] };
  }

  it("aplica los filtros de la URL a la lectura", async () => {
    await render({ tipo: "studio", decada: "1990", q: "slow", orden: "recientes", page: "2" });
    expect(mocks.listAlbumsFiltered).toHaveBeenCalledWith(mocks.treeCondition, {
      page: 2,
      category: "studio",
      decade: 1990,
      q: "slow",
      sort: "newest",
    });
  });

  it("solo=1 usa el género exacto, sin descendientes", async () => {
    await render({ solo: "1" });
    expect(mocks.listAlbumsFiltered.mock.calls[0]![0]).toBe(mocks.exactCondition);
  });

  it("un subgénero válido cambia la raíz; uno ajeno se ignora y se quita de los parámetros", async () => {
    const view = await render({ sub: "no-es-hijo" });
    expect(mocks.findDescendant).toHaveBeenCalledWith("g1", "no-es-hijo");
    expect(view.params.sub).toBeUndefined();

    mocks.albumsView.mockClear();
    mocks.findDescendant.mockResolvedValue({ id: "g2", slug: "dream-pop" });
    const valid = await render({ sub: "dream-pop" });
    expect(valid.params.sub).toBe("dream-pop");
  });

  it("el selector de subgéneros ofrece solo los que tienen música y el de décadas incluye la activa", async () => {
    const view = await render({ decada: "1970" });
    expect(view.subgenres.map((s) => s.value)).toEqual(["dream-pop"]);
    expect(view.decades).toEqual([1990, 1980, 1970]);
  });
});

describe("secciones de comunidad", () => {
  it("las listas se piden con el lector y la pestaña pagina por la URL", async () => {
    mocks.lists.mockResolvedValue({ lists: [], hasNext: false });
    await GenreListsPreviewSection({ ...base, readerId: "u1" });
    expect(mocks.lists).toHaveBeenLastCalledWith("u1", "g1", { pageSize: 6 });
    await GenreListsSection({ ...base, params: parseGenreParams({ tab: "lists", page: "3" }), readerId: null });
    expect(mocks.lists).toHaveBeenLastCalledWith(null, "g1", { page: 3 });
  });

  it("las reseñas se piden con el lector para excluir bloqueos", async () => {
    mocks.reviews.mockResolvedValue([]);
    await GenreReviewsSection({ ...base, readerId: "u1" });
    expect(mocks.reviews).toHaveBeenCalledWith("g1", "u1");
  });
});

describe("GenreFootprintSection", () => {
  it("sin sesión no consulta nada y no se renderiza", async () => {
    await expect(GenreFootprintSection({ ...base, readerId: null })).resolves.toBeNull();
    expect(mocks.footprint).not.toHaveBeenCalled();
  });

  it("con sesión pide la huella de la persona; con Esenciales la invitación va al riel, sin ellos a Álbumes", async () => {
    mocks.footprint.mockResolvedValue({ ratedCount: 0, averageStars: null, favorites: [], pendingCount: 0 });
    mocks.essentials.mockResolvedValue([{ id: "a" }]);
    const withEssentials = (await GenreFootprintSection({ ...base, readerId: "u1" })) as { props: { start: { kind: string; href: string } } };
    expect(mocks.footprint).toHaveBeenCalledWith("u1", "g1");
    expect(withEssentials.props.start).toEqual({ kind: "essentials", href: "/genre/shoegaze#genre-essentials" });

    mocks.essentials.mockResolvedValue([]);
    const without = (await GenreFootprintSection({ ...base, readerId: "u1" })) as { props: { start: { kind: string; href: string } } };
    expect(without.props.start).toEqual({ kind: "albums", href: "/genre/shoegaze?tab=albums" });
  });
});
