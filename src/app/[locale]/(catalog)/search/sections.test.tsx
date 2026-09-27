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
}));

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
  return { type: "artist", results, remoteFailed };
}

describe("ArtistSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("coincidencia exacta única: redirige al perfil con el origen de la búsqueda", async () => {
    mocks.searchArtists.mockResolvedValue(
      response([artist({ id: "sabrina", name: "Sabrina Carpenter", exact: true }), artist({ id: "c", name: "Carpenter" })]),
    );

    await expect(ArtistSection({ query: "Sabrina Carpenter", all: false })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith({
      href: "/artist/sabrina?from=search&q=Sabrina+Carpenter",
      locale: "es",
    });
  });

  it("con homónimos, con all=1, con filtro o con MusicBrainz caído no redirige", async () => {
    mocks.searchArtists.mockResolvedValue(
      response([artist({ id: "a", name: "KISS", exact: true }), artist({ id: "b", name: "KISS", exact: true })]),
    );
    expect(isValidElement(await ArtistSection({ query: "KISS", all: false }))).toBe(true);

    mocks.searchArtists.mockResolvedValue(response([artist({ id: "s", name: "Sabrina Carpenter", exact: true })]));
    await ArtistSection({ query: "Sabrina Carpenter", all: true });
    await ArtistSection({ query: "Sabrina Carpenter", all: false, artistType: "person" });

    mocks.searchArtists.mockResolvedValue(response([artist({ id: "i", name: "Icon", exact: true })], true));
    await ArtistSection({ query: "icon", all: false });

    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("fallo total de la búsqueda: estado de error recuperable", async () => {
    mocks.searchArtists.mockRejectedValue(new Error("502"));

    const element = (await ArtistSection({ query: "icon", all: false })) as ReactElement;
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

    await AlbumSection({ query: "destroyer", category: "studio", decade: 1970 });

    expect(mocks.searchAlbums).toHaveBeenCalledTimes(1);
    expect(mocks.searchAlbums).toHaveBeenCalledWith("destroyer", {
      category: "studio",
      decade: 1970,
      localOnly: true,
    });
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
