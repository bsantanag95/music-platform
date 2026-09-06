import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SearchResults } from "@/components/catalog/SearchResults";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { CatalogSearchResult, CatalogSongContext } from "@/lib/api/schemas";

vi.mock("./LazyCoverImage", () => ({
  LazyCoverImage: ({ releaseGroupId }: { releaseGroupId: string }) => (
    <span data-testid={`cover-${releaseGroupId}`} />
  ),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function artistResult(overrides: Partial<CatalogSearchResult> = {}): CatalogSearchResult {
  return {
    kind: "artist",
    id: "artist-1",
    mbid: null,
    name: "Poison",
    subtitle: "glam metal band",
    artistType: "group",
    category: null,
    year: null,
    cached: false,
    ...overrides,
  };
}

function albumResult(overrides: Partial<CatalogSearchResult> = {}): CatalogSearchResult {
  return {
    kind: "release-group",
    id: "album-1",
    mbid: null,
    name: "Toxicity",
    subtitle: "System of a Down",
    artistType: null,
    category: "studio",
    year: 2001,
    cached: false,
    ...overrides,
  };
}

function songContext(overrides: Partial<CatalogSongContext> = {}): CatalogSongContext {
  return {
    recordingId: "rec-1",
    mbid: "rec-mbid-1",
    title: "Stairway to Heaven",
    artistName: "Led Zeppelin",
    albums: [
      {
        id: "album-rg",
        mbid: "rg-mbid",
        title: "Led Zeppelin IV",
        category: "studio",
        year: 1971,
      },
    ],
    ...overrides,
  };
}

const songContextTitle = (song: string) =>
  catalogEs.search.results.songContext.title.replace("{song}", song);

beforeEach(() => {
  window.history.replaceState({}, "", "/search?q=Poison");
});

describe("SearchResults", () => {
  it("muestra artistas y álbumes en la pestaña Todo", () => {
    renderWithIntl(
      <SearchResults results={[artistResult(), albumResult()]} query="Poison" />,
    );

    expect(screen.getByText("Poison")).toBeInTheDocument();
    expect(screen.getByText("Toxicity")).toBeInTheDocument();
  });

  it("filtra por tipo con las pestañas Artistas y Álbumes", () => {
    renderWithIntl(
      <SearchResults results={[artistResult(), albumResult()]} query="Poison" />,
    );

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabArtists }));
    expect(screen.getByText("Poison")).toBeInTheDocument();
    expect(screen.queryByText("Toxicity")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabAlbums }));
    expect(screen.getByText("Toxicity")).toBeInTheDocument();
    expect(screen.queryByText("Poison")).not.toBeInTheDocument();
  });

  it("arranca en la pestaña indicada por initialTab", () => {
    renderWithIntl(
      <SearchResults
        results={[artistResult(), albumResult()]}
        query="Poison"
        initialTab="albums"
      />,
    );

    expect(
      screen.getByRole("tab", { name: catalogEs.search.results.tabAlbums }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Toxicity")).toBeInTheDocument();
    expect(screen.queryByText("Poison")).not.toBeInTheDocument();
  });

  it("cada pestaña muestra el número de coincidencias de su tipo", () => {
    renderWithIntl(
      <SearchResults
        results={[artistResult(), albumResult(), albumResult({ id: "album-2", name: "Steal This Album" })]}
        query="Poison"
      />,
    );

    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveTextContent(`${catalogEs.search.results.tabAll} · 3`);
    expect(tablist).toHaveTextContent(`${catalogEs.search.results.tabArtists} · 1`);
    expect(tablist).toHaveTextContent(`${catalogEs.search.results.tabAlbums} · 2`);
  });

  it("refleja la pestaña activa en ?type= sin recargar", () => {
    renderWithIntl(
      <SearchResults results={[artistResult(), albumResult()]} query="Poison" />,
    );

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabArtists }));
    expect(new URL(window.location.href).searchParams.get("type")).toBe("artists");

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabAll }));
    expect(new URL(window.location.href).searchParams.has("type")).toBe(false);
  });

  it("mueve el foco entre pestañas con las flechas", () => {
    renderWithIntl(
      <SearchResults results={[artistResult(), albumResult()]} query="Poison" />,
    );

    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });

    expect(
      screen.getByRole("tab", { name: catalogEs.search.results.tabArtists }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("expone el estado activo de las pestañas a tecnologías asistivas", () => {
    renderWithIntl(<SearchResults results={[artistResult()]} query="Poison" />);

    const allTab = screen.getByRole("tab", { name: catalogEs.search.results.tabAll });
    const artistsTab = screen.getByRole("tab", {
      name: catalogEs.search.results.tabArtists,
    });
    expect(allTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(artistsTab);

    expect(allTab).toHaveAttribute("aria-selected", "false");
    expect(artistsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("cada fila enlaza a su vista destino", () => {
    renderWithIntl(
      <SearchResults results={[artistResult(), albumResult()]} query="Poison" />,
    );

    const artistLink = screen.getByRole("link", { name: /Poison/ });
    const albumLink = screen.getByRole("link", { name: /Toxicity/ });
    expect(artistLink).toHaveAttribute("href", "/artist/artist-1");
    expect(albumLink).toHaveAttribute("href", "/album/album-1");
  });

  it("la fila de artista muestra tipo y disambiguation; la de álbum, artista y año", () => {
    renderWithIntl(
      <SearchResults results={[artistResult(), albumResult()]} query="Poison" />,
    );

    expect(
      screen.getByText(new RegExp(catalogEs.artist.typeLabels.group)),
    ).toBeInTheDocument();
    expect(screen.getByText(/glam metal band/)).toBeInTheDocument();
    expect(screen.getByText(/System of a Down/)).toBeInTheDocument();
    expect(screen.getByText(/2001/)).toBeInTheDocument();
    expect(screen.getByTestId("cover-album-1")).toBeInTheDocument();
  });

  it("marca las filas ya presentes en el catálogo local", () => {
    renderWithIntl(
      <SearchResults
        results={[artistResult({ cached: true }), albumResult()]}
        query="Poison"
      />,
    );

    expect(
      screen.getByText(catalogEs.search.results.cachedTag),
    ).toBeInTheDocument();
  });

  it("estado vacío propio, con puente a la búsqueda de usuarios, cuando no hay resultados", () => {
    renderWithIntl(<SearchResults results={[]} query="Poison" />);

    expect(
      screen.getByText(catalogEs.search.results.emptyTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /usuarios llamados/i }),
    ).toHaveAttribute("href", "/users?q=Poison");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("estado vacío también al filtrar una pestaña sin coincidencias de ese tipo", () => {
    renderWithIntl(<SearchResults results={[artistResult()]} query="Poison" />);

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabAlbums }));

    expect(
      screen.getByText(catalogEs.search.results.emptyTitle),
    ).toBeInTheDocument();
  });

  describe("contexto de canción (add-recording-album-search)", () => {
    it("renderiza la sección con el título interpolado y enlaces a los álbumes", () => {
      renderWithIntl(
        <SearchResults results={[artistResult()]} query="Stairway" songContext={songContext()} />,
      );

      expect(screen.getByText(songContextTitle("Stairway to Heaven"))).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: songContextTitle("Stairway to Heaven") }));
      const albumLink = screen.getByRole("link", { name: /Led Zeppelin IV/ });
      expect(albumLink).toHaveAttribute("href", "/album/album-rg");
      expect(screen.getByText(/1971/)).toBeInTheDocument();
      expect(screen.getByTestId("cover-album-rg")).toBeInTheDocument();
    });

    it("no añade pestaña ni enlaza a la canción: la canción no es resultado navegable", () => {
      renderWithIntl(
        <SearchResults results={[]} query="Stairway" songContext={songContext()} />,
      );

      expect(screen.getAllByRole("tab")).toHaveLength(3);
      expect(screen.queryByRole("link", { name: /Stairway to Heaven/ })).not.toBeInTheDocument();
    });

    it("con solo contexto de canción, 'Todo' no muestra el estado vacío", () => {
      renderWithIntl(
        <SearchResults results={[]} query="Stairway" songContext={songContext()} />,
      );

      expect(
        screen.queryByText(catalogEs.search.results.emptyTitle),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabArtists }));
      expect(screen.getByText(catalogEs.search.results.emptyTitle)).toBeInTheDocument();
    });

    it("sin contexto de canción el comportamiento es idéntico al anterior", () => {
      renderWithIntl(<SearchResults results={[albumResult()]} query="Poison" />);

      expect(
        screen.queryByText(songContextTitle("Stairway to Heaven")),
      ).not.toBeInTheDocument();
    });

    it("recorta a 5 álbumes y despliega el resto con 'Ver más'", () => {
      const albums = Array.from({ length: 8 }, (_, i) => ({
        id: `rg-${i}`,
        mbid: `rg-mbid-${i}`,
        title: `Álbum ${i}`,
        category: "compilation" as const,
        year: 2000 + i,
      }));
      renderWithIntl(
        <SearchResults
          results={[]}
          query="Roulette"
          songContext={songContext({ albums })}
        />,
      );

      expect(screen.getByRole("link", { name: /Álbum 4/ })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Álbum 5/ })).not.toBeInTheDocument();

      const showMore = catalogEs.search.results.songContext.showMore.replace("{count}", "3");
      fireEvent.click(screen.getByRole("button", { name: showMore }));

      expect(screen.getByRole("link", { name: /Álbum 7/ })).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: catalogEs.search.results.songContext.showLess }),
      );
      expect(screen.queryByRole("link", { name: /Álbum 7/ })).not.toBeInTheDocument();
    });

    it("sin exceso de álbumes no ofrece 'Ver más'", () => {
      renderWithIntl(
        <SearchResults results={[]} query="Stairway" songContext={songContext()} />,
      );

      expect(screen.queryByText(/Ver \d+ más/)).not.toBeInTheDocument();
    });
  });
});
