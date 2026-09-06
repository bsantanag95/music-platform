import { describe, it, expect, vi } from "vitest";
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

describe("SearchResults", () => {
  it("muestra artistas y álbumes en la pestaña Todo", () => {
    renderWithIntl(<SearchResults results={[artistResult(), albumResult()]} />);

    expect(screen.getByText("Poison")).toBeInTheDocument();
    expect(screen.getByText("Toxicity")).toBeInTheDocument();
  });

  it("filtra por tipo con las pestañas Artistas y Álbumes", () => {
    renderWithIntl(<SearchResults results={[artistResult(), albumResult()]} />);

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabArtists }));
    expect(screen.getByText("Poison")).toBeInTheDocument();
    expect(screen.queryByText("Toxicity")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabAlbums }));
    expect(screen.getByText("Toxicity")).toBeInTheDocument();
    expect(screen.queryByText("Poison")).not.toBeInTheDocument();
  });

  it("expone el estado activo de las pestañas a tecnologías asistivas", () => {
    renderWithIntl(<SearchResults results={[artistResult()]} />);

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
    renderWithIntl(<SearchResults results={[artistResult(), albumResult()]} />);

    const artistLink = screen.getByRole("link", { name: /Poison/ });
    const albumLink = screen.getByRole("link", { name: /Toxicity/ });
    expect(artistLink).toHaveAttribute("href", "/artist/artist-1");
    expect(albumLink).toHaveAttribute("href", "/album/album-1");
  });

  it("la fila de artista muestra tipo y disambiguation; la de álbum, artista y año", () => {
    renderWithIntl(<SearchResults results={[artistResult(), albumResult()]} />);

    expect(
      screen.getByText(new RegExp(catalogEs.artist.typeLabels.group)),
    ).toBeInTheDocument();
    expect(screen.getByText(/glam metal band/)).toBeInTheDocument();
    expect(screen.getByText(/System of a Down/)).toBeInTheDocument();
    expect(screen.getByText(/2001/)).toBeInTheDocument();
    expect(screen.getByTestId("cover-album-1")).toBeInTheDocument();
  });

  it("estado vacío propio cuando no hay resultados", () => {
    renderWithIntl(<SearchResults results={[]} />);

    expect(
      screen.getByText(catalogEs.search.results.emptyTitle),
    ).toBeInTheDocument();
  });

  it("estado vacío también al filtrar una pestaña sin coincidencias de ese tipo", () => {
    renderWithIntl(<SearchResults results={[artistResult()]} />);

    fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabAlbums }));

    expect(
      screen.getByText(catalogEs.search.results.emptyTitle),
    ).toBeInTheDocument();
  });

  describe("contexto de canción (add-recording-album-search)", () => {
    it("renderiza la sección con el título interpolado y enlaces a los álbumes", () => {
      renderWithIntl(<SearchResults results={[artistResult()]} songContext={songContext()} />);

      expect(screen.getByText(songContextTitle("Stairway to Heaven"))).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: songContextTitle("Stairway to Heaven") }));
      const albumLink = screen.getByRole("link", { name: /Led Zeppelin IV/ });
      expect(albumLink).toHaveAttribute("href", "/album/album-rg");
      expect(screen.getByText(/1971/)).toBeInTheDocument();
      expect(screen.getByTestId("cover-album-rg")).toBeInTheDocument();
    });

    it("no añade pestaña ni enlaza a la canción: la canción no es resultado navegable", () => {
      renderWithIntl(<SearchResults results={[]} songContext={songContext()} />);

      expect(screen.getAllByRole("tab")).toHaveLength(3);
      expect(screen.queryByRole("link", { name: /Stairway to Heaven/ })).not.toBeInTheDocument();
    });

    it("con solo contexto de canción, 'Todo' no muestra el estado vacío", () => {
      renderWithIntl(<SearchResults results={[]} songContext={songContext()} />);

      expect(
        screen.queryByText(catalogEs.search.results.emptyTitle),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: catalogEs.search.results.tabArtists }));
      expect(screen.getByText(catalogEs.search.results.emptyTitle)).toBeInTheDocument();
    });

    it("sin contexto de canción el comportamiento es idéntico al anterior", () => {
      renderWithIntl(<SearchResults results={[albumResult()]} />);

      expect(
        screen.queryByText(songContextTitle("Stairway to Heaven")),
      ).not.toBeInTheDocument();
    });
  });
});
