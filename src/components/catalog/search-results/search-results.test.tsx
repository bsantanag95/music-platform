import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { songHref } from "@/lib/catalog-links";
import catalogEs from "../../../../messages/es/catalog.json";
import type { ArtistSearchResult, SongGroupResult } from "@/services/catalog/search/types";
import { ArtistResults } from "./ArtistResults";
import { RefineHint, SearchEmpty, SearchTypeSwitch } from "./SearchChrome";
import { SongInterpretation, SongResults } from "./SongResults";
import { SearchOriginNotice } from "./SearchOriginNotice";
import { ActiveFilterChips } from "./ActiveFilterChips";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../LazyCoverImage", () => ({ LazyCoverImage: () => <span data-testid="cover" /> }));

const labels = catalogEs.search;

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

describe("SearchTypeSwitch / SearchEmpty", () => {
  it("ofrece la misma consulta en los otros tipos", () => {
    renderWithIntl(<SearchTypeSwitch query="back for the attack" current="artist" />);

    expect(screen.getByRole("link", { name: labels.types.album })).toHaveAttribute(
      "href",
      "/search?type=album&q=back+for+the+attack",
    );
    expect(screen.queryByRole("link", { name: labels.types.artist })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("el estado vacío incluye los accesos a los otros tipos", () => {
    renderWithIntl(<SearchEmpty query="xyzzy" type="song" />);

    expect(screen.getByText(labels.results.emptyDescription.song)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: labels.types.album })).toBeInTheDocument();
  });
});

describe("filtros de la búsqueda avanzada", () => {
  it("cambiar de tipo conserva solo los filtros compatibles", () => {
    renderWithIntl(
      <SearchTypeSwitch
        query="hallelujah"
        current="album"
        filters={{ artist: "jeff buckley", yearFrom: 1994 }}
      />,
    );

    expect(screen.getByRole("link", { name: labels.types.song })).toHaveAttribute(
      "href",
      "/search?type=song&q=hallelujah&artist=jeff+buckley",
    );
    expect(screen.getByRole("link", { name: labels.types.artist })).toHaveAttribute(
      "href",
      "/search?type=artist&q=hallelujah",
    );
  });

  it("un chip por filtro que lo quita, y Quitar filtros conserva las pastillas", () => {
    renderWithIntl(
      <ActiveFilterChips
        type="artist"
        query="sumo"
        filters={{ country: "AR", beginFrom: 1980, beginTo: 1989, ended: true }}
        pillParams={{ artistType: "group" }}
      />,
    );

    expect(screen.getByRole("link", { name: /País: Argentina/ })).toHaveAttribute(
      "href",
      "/search?type=artist&q=sumo&artistType=group&beginFrom=1980&beginTo=1989&ended=1",
    );
    expect(screen.getByRole("link", { name: /Inicio: 1980–1989/ })).toHaveAttribute(
      "href",
      "/search?type=artist&q=sumo&artistType=group&country=AR&ended=1",
    );
    expect(screen.getByRole("link", { name: /Ya no en actividad/ })).toHaveAttribute(
      "href",
      "/search?type=artist&q=sumo&artistType=group&country=AR&beginFrom=1980&beginTo=1989",
    );
    expect(screen.getByRole("link", { name: labels.advanced.clear })).toHaveAttribute(
      "href",
      "/search?type=artist&q=sumo&artistType=group",
    );
  });

  it("rangos abiertos y duraciones en m:ss; sin filtros no hay chips", () => {
    const { unmount } = renderWithIntl(
      <ActiveFilterChips type="song" query="hallelujah" filters={{ durMax: 420 }} />,
    );
    expect(screen.getByRole("link", { name: /Duración: Hasta 7:00/ })).toBeInTheDocument();
    unmount();

    renderWithIntl(<ActiveFilterChips type="album" query="kiss" filters={{ yearFrom: 1980 }} />);
    expect(screen.getByRole("link", { name: /Desde 1980/ })).toHaveAttribute("href", "/search?type=album&q=kiss");
  });

  it("sin resultados con filtros: Quitar filtros", () => {
    renderWithIntl(<SearchEmpty query="maiden" type="album" filters={{ yearFrom: 2090 }} />);

    expect(screen.getByText(labels.advanced.emptyFiltered)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: labels.advanced.clear })).toHaveAttribute(
      "href",
      "/search?type=album&q=maiden",
    );
  });
});

describe("ArtistResults", () => {
  it("con homónimos: mejor coincidencia, luego homónimos y después el resto", () => {
    renderWithIntl(
      <ArtistResults
        query="KISS"
        results={[
          artist({ id: "us", name: "KISS", exact: true, country: "US", disambiguation: "US rock band" }),
          artist({ id: "kr", name: "KISS", exact: true, disambiguation: "South Korean girl group" }),
          artist({ id: "kk", name: "Kiss Kiss", artistType: "unknown" }),
        ]}
      />,
    );

    expect(screen.getByText(labels.results.artists.bestMatch)).toBeInTheDocument();
    const best = screen.getByRole("link", { name: /US rock band/ });
    expect(best).toHaveAttribute("href", "/artist/us");
    expect(within(best).getByText(/Grupo · US · US rock band/)).toBeInTheDocument();
    expect(screen.getByText(labels.results.artists.homonyms.replace("{query}", "KISS"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /South Korean girl group/ })).toHaveAttribute("href", "/artist/kr");
    // Tipo desconocido: sin etiqueta "Sin clasificar".
    expect(screen.getByRole("link", { name: "Kiss Kiss" })).toBeInTheDocument();
  });

  it("sin coincidencias exactas no muestra tarjeta de mejor coincidencia", () => {
    renderWithIntl(<ArtistResults query="icon" results={[artist({ id: "d", name: "Despised Icon" })]} />);

    expect(screen.queryByText(labels.results.artists.bestMatch)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Despised Icon/ })).toBeInTheDocument();
  });
});

describe("Canciones", () => {
  const dokken: SongGroupResult = {
    kind: "song",
    key: "kiss of death|dokken",
    title: "Kiss of Death",
    artistName: "Dokken",
    recordingId: "11111111-1111-4111-8111-111111111111",
    mbid: null,
    albums: Array.from({ length: 7 }, (_, index) => ({
      id: `album-${index}`,
      mbid: null,
      title: `Álbum ${index}`,
      category: "studio" as const,
      year: 1987 + index,
    })),
    query: "Dokken - Kiss of Death",
  };
  const newOrder: SongGroupResult = {
    ...dokken,
    key: "kiss of death|new order",
    artistName: "New Order",
    recordingId: null,
    albums: [],
    query: "New Order - Kiss of Death",
  };

  it("muestra la interpretación y la alternativa como consulta explícita", () => {
    renderWithIntl(
      <SongInterpretation
        interpretation={{ song: "kiss of death", artistName: "Dokken" }}
        alternatives={[{ song: "dokken", artistName: "Kiss of Death", query: "Kiss of Death - dokken" }]}
      />,
    );

    expect(
      screen.getByText(
        labels.results.songs.interpretation.replace("{song}", "kiss of death").replace("{artist}", "Dokken"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: labels.results.songs.alternative.replace("{song}", "dokken").replace("{artist}", "Kiss of Death"),
      }),
    ).toHaveAttribute("href", "/search?type=song&q=Kiss+of+Death+-+dokken");
  });

  it("sin interpretación con artista no muestra nada", () => {
    const { container } = renderWithIntl(<SongInterpretation interpretation={null} alternatives={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("la canción resuelta lista sus álbumes; las demás abren su propia búsqueda", () => {
    renderWithIntl(
      <SongResults
        response={{
          type: "song",
          results: [dokken, newOrder],
          remoteFailed: false,
          total: 2,
          nextOffset: null,
          interpretation: null,
          alternatives: [],
          refine: null,
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: labels.results.songContext.title.replace("{song}", "Kiss of Death") }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: labels.results.songContext.viewSongAria.replace("{song}", "Kiss of Death"),
      }),
    ).toHaveAttribute("href", songHref("Dokken", "Kiss of Death", "11111111-1111-4111-8111-111111111111"));
    expect(screen.getByRole("link", { name: /Álbum 0/ })).toHaveAttribute("href", "/album/album-0");
    // Cinco visibles y el resto a un clic.
    expect(screen.queryByRole("link", { name: /Álbum 6/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: labels.results.songContext.showMore.replace("{count}", "2") }));
    expect(screen.getByRole("link", { name: /Álbum 6/ })).toBeInTheDocument();

    expect(screen.getByText(labels.results.songs.otherSongs)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: labels.results.songs.openSong.replace("{song}", "Kiss of Death — New Order"),
      }),
    ).toHaveAttribute("href", "/search?type=song&q=New+Order+-+Kiss+of+Death");
  });

  it("sin grabación identidad no ofrece enlace directo a la canción", () => {
    renderWithIntl(
      <SongResults
        response={{
          type: "song",
          results: [newOrder],
          remoteFailed: false,
          total: 1,
          nextOffset: null,
          interpretation: null,
          alternatives: [],
          refine: null,
        }}
      />,
    );

    expect(
      screen.queryByRole("link", {
        name: labels.results.songContext.viewSongAria.replace("{song}", "Kiss of Death"),
      }),
    ).not.toBeInTheDocument();
  });
});

describe("RefineHint", () => {
  it("ofrece atajos 'Artista - consulta'", () => {
    renderWithIntl(<RefineHint kind="album" query="destroyer" total={716} artists={["KISS", "Telepathe"]} />);

    expect(screen.getByText(/716 álbumes coinciden con «destroyer»/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "KISS" })).toHaveAttribute("href", "/search?type=album&q=KISS+-+destroyer");
  });

  it("sin artistas no renderiza nada", () => {
    const { container } = renderWithIntl(<RefineHint kind="song" query="x" total={60} artists={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SearchOriginNotice", () => {
  it("vuelve a la lista sin redirigir (all=1)", () => {
    renderWithIntl(<SearchOriginNotice query="Sabrina Carpenter" />);

    expect(screen.getByText(labels.origin.notThisOne)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: labels.origin.seeAll.replace("{query}", "Sabrina Carpenter") }),
    ).toHaveAttribute("href", "/search?type=artist&q=Sabrina+Carpenter&all=1");
  });
});
