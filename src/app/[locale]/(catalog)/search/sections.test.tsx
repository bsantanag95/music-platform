import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import type { ArtistSearchResponse, ArtistSearchResult } from "@/services/catalog/search/types";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
  searchArtists: vi.fn(),
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchUsers: vi.fn(),
  getProfileByUsername: vi.fn(),
  getCurrentUser: vi.fn(),
  suggestSpelling: vi.fn(async (): Promise<string | null> => null),
}));

vi.mock("@/services/catalog/search/spelling", () => ({ suggestSpelling: mocks.suggestSpelling }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: () => null, useRouter: () => ({}) }));
vi.mock("@/services/catalog/search", async () => {
  const actual = await vi.importActual<typeof import("@/services/catalog/search/exact")>(
    "@/services/catalog/search/exact",
  );
  return {
    searchArtists: mocks.searchArtists,
    searchAlbums: mocks.searchAlbums,
    searchSongs: mocks.searchSongs,
    uniqueExactArtist: actual.uniqueExactArtist,
  };
});
vi.mock("@/services/social/profiles", () => ({
  searchUsers: mocks.searchUsers,
  getProfileByUsername: mocks.getProfileByUsername,
}));
vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: mocks.getCurrentUser }));

const { ArtistSection, AlbumSection, UserSection } = await import("./sections");

function artist(overrides: Partial<ArtistSearchResult>): ArtistSearchResult {
  return {
    kind: "artist",
    id: "id",
    mbid: null,
    name: "X",
    disambiguation: null,
    artistType: "group",
    country: null,
    cached: false,
    exact: false,
    ...overrides,
  };
}

function response(results: ArtistSearchResult[], remoteFailed = false): ArtistSearchResponse {
  return { type: "artist", results, remoteFailed, total: null, nextOffset: null };
}

/** Resuelve la parte transmitida (dentro del `Suspense`) de una sección, como haría el streaming. */
async function streamed(section: unknown): Promise<unknown> {
  const element = section as ReactElement<{ children: ReactElement }>;
  const remote = element.props.children;
  return (remote.type as (props: unknown) => Promise<unknown>)(remote.props);
}

describe("ArtistSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra primero lo local y deja MusicBrainz al streaming (openspec: speed-up-search)", async () => {
    mocks.searchArtists.mockResolvedValue(response([artist({ id: "kiss", name: "Kiss", exact: true })]));

    const element = (await ArtistSection({ query: "kiss", all: false })) as ReactElement<{ fallback: unknown }>;

    expect(mocks.searchArtists).toHaveBeenCalledTimes(1);
    expect(mocks.searchArtists).toHaveBeenCalledWith("kiss", { filters: {}, localOnly: true });
    expect(isValidElement(element.props.fallback)).toBe(true);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("coincidencia exacta única: la parte transmitida redirige al perfil con el origen de la búsqueda", async () => {
    mocks.searchArtists.mockResolvedValue(
      response([artist({ id: "sabrina", name: "Sabrina Carpenter", exact: true }), artist({ id: "c", name: "Carpenter" })]),
    );

    const section = await ArtistSection({ query: "Sabrina Carpenter", all: false });
    await expect(streamed(section)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.searchArtists).toHaveBeenLastCalledWith("Sabrina Carpenter", { filters: {} });
    expect(mocks.redirect).toHaveBeenCalledWith({
      href: "/artist/sabrina?from=search&q=Sabrina+Carpenter",
      locale: "es",
    });
  });

  it("con homónimos, con all=1, con filtro o con MusicBrainz caído no redirige", async () => {
    mocks.searchArtists.mockResolvedValue(
      response([artist({ id: "a", name: "KISS", exact: true }), artist({ id: "b", name: "KISS", exact: true })]),
    );
    expect(isValidElement(await streamed(await ArtistSection({ query: "KISS", all: false })))).toBe(true);

    mocks.searchArtists.mockResolvedValue(response([artist({ id: "s", name: "Sabrina Carpenter", exact: true })]));
    await streamed(await ArtistSection({ query: "Sabrina Carpenter", all: true }));
    await streamed(await ArtistSection({ query: "Sabrina Carpenter", all: false, criteria: { artistType: "person" } }));
    // Un criterio de la búsqueda avanzada tampoco, ni la página avanzada (openspec: redesign-advanced-search).
    await streamed(await ArtistSection({ query: "Sabrina Carpenter", all: false, criteria: { country: ["US"] } }));
    expect(mocks.searchArtists).toHaveBeenLastCalledWith("Sabrina Carpenter", {
      filters: expect.objectContaining({ country: ["US"] }),
    });
    await streamed(await ArtistSection({ query: "Sabrina Carpenter", advanced: true }));

    mocks.searchArtists.mockResolvedValue(response([artist({ id: "i", name: "Icon", exact: true })], true));
    await streamed(await ArtistSection({ query: "icon", all: false }));

    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("fallo de la base: estado de error recuperable", async () => {
    mocks.searchArtists.mockRejectedValue(new Error("db"));

    const element = (await ArtistSection({ query: "icon", all: false })) as ReactElement;
    expect((element.type as { name?: string }).name).toBe("SearchErrorState");
  });

  it("fallo total de la parte remota: estado de error recuperable", async () => {
    mocks.searchArtists.mockResolvedValueOnce(response([])).mockRejectedValueOnce(new Error("502"));

    const element = (await streamed(await ArtistSection({ query: "icon", all: false }))) as ReactElement;
    expect((element.type as { name?: string }).name).toBe("SearchErrorState");
  });
});

describe("AlbumSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resuelve primero lo local y deja la pata remota al streaming", async () => {
    mocks.searchAlbums.mockResolvedValue({
      type: "album",
      results: [],
      remoteFailed: false,
      total: null,
      nextOffset: null,
      refine: null,
    });

    await AlbumSection({ query: "destroyer", criteria: { category: ["studio"] }, decade: 1970 });

    expect(mocks.searchAlbums).toHaveBeenCalledTimes(1);
    expect(mocks.searchAlbums).toHaveBeenCalledWith(
      "destroyer",
      expect.objectContaining({ categories: ["studio"], decade: 1970, localOnly: true }),
    );
  });
});

describe("estado vacío (refine-search-results-phase1)", () => {
  beforeEach(() => vi.clearAllMocks());

  const emptyAlbums = { type: "album", results: [], remoteFailed: false, total: 0, nextOffset: null, refine: null };
  const flatten = (node: unknown): ReactElement[] => {
    if (!isValidElement(node)) return Array.isArray(node) ? node.flatMap(flatten) : [];
    const children = (node.props as { children?: unknown }).children;
    return [node, ...flatten(children)];
  };

  it("sin filtro: sugiere desde el catálogo y oculta las pastillas", async () => {
    mocks.searchAlbums.mockResolvedValue(emptyAlbums);
    mocks.suggestSpelling.mockResolvedValue("Pink Floyd");

    const tree = flatten(await streamed(await AlbumSection({ query: "pink floid" })));
    const empty = tree.find((el) => (el.type as { name?: string }).name === "SearchEmpty");
    expect(empty?.props).toMatchObject({ suggestion: "Pink Floyd", clearFiltersHref: null });
    expect(tree.some((el) => (el.type as { name?: string }).name === "FilterPills")).toBe(false);
    expect(mocks.suggestSpelling).toHaveBeenCalledWith("album", "pink floid");
  });

  it("lista débil (ninguno cubre todas las palabras): sugerencia sobre los resultados", async () => {
    const album = (title: string, artistName: string) => ({
      kind: "release-group", id: title, mbid: null, title, artistName, category: "studio", year: 2000, cached: false,
    });
    mocks.searchAlbums.mockResolvedValue({ ...emptyAlbums, results: [album("Pink", "Four Tet"), album("Pink", "Aerosmith")] });
    mocks.suggestSpelling.mockResolvedValue("Pink Floyd");

    const tree = flatten(await streamed(await AlbumSection({ query: "pink floid" })));
    const hint = tree.find((el) => (el.type as { name?: string }).name === "DidYouMean");
    expect(hint?.props).toMatchObject({ type: "album", suggestion: "Pink Floyd" });
  });

  it("lista con una coincidencia completa: sin sugerencia", async () => {
    mocks.searchAlbums.mockResolvedValue({
      ...emptyAlbums,
      results: [{ kind: "release-group", id: "w", mbid: null, title: "The Wall", artistName: "Pink Floyd", category: "studio", year: 1979, cached: true }],
    });

    await streamed(await AlbumSection({ query: "the wall" }));
    expect(mocks.suggestSpelling).not.toHaveBeenCalled();
  });

  it("con filtro: ofrece quitarlo y no busca sugerencias", async () => {
    mocks.searchAlbums.mockResolvedValue(emptyAlbums);

    const tree = flatten(await streamed(await AlbumSection({ query: "the wall", decade: 1960 })));
    const empty = tree.find((el) => (el.type as { name?: string }).name === "SearchEmpty");
    expect(empty?.props).toMatchObject({ clearFiltersHref: "/search?type=album&q=the+wall", suggestion: null });
    expect(mocks.suggestSpelling).not.toHaveBeenCalled();
  });
});

describe("UserSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.searchUsers.mockResolvedValue({ users: [], page: 1, pageSize: 20, hasNext: false });
  });

  it("un username exacto abre el perfil", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ username: "fran" });

    await expect(UserSection({ query: "Fran", all: false })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.getProfileByUsername).toHaveBeenCalledWith("fran", null);
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/users/fran", locale: "es" });
  });

  it("sin username exacto lista resultados sin salir a MusicBrainz", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));

    await UserSection({ query: "ana", all: false });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.searchUsers).toHaveBeenCalledWith("ana", null, 1, 20);
    expect(mocks.searchArtists).not.toHaveBeenCalled();
  });
});
