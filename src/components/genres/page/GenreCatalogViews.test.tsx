import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { parseGenreParams } from "@/services/genres/page-params";
import { GenreAlbumsView } from "./GenreAlbumsView";
import { GenreArtistsView } from "./GenreArtistsView";
import { GenreFilterBar } from "./GenreFilterBar";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));
vi.mock("@/components/catalog/AlbumCard", () => ({
  AlbumCard: ({ releaseGroup }: { releaseGroup: { title: string } }) => <span data-testid="card">{releaseGroup.title}</span>,
}));
vi.mock("./GenreAlbumRow", () => ({
  GenreAlbumRow: ({ album, artist }: { album: { title: string }; artist: { name: string } | null }) => (
    <span data-testid="row">
      {album.title} · {artist?.name ?? "—"}
    </span>
  ),
}));

const categoryLabels = { studio: "De estudio", single_ep: "Singles y EPs", compilation: "Recopilatorios", live_other: "En vivo y otros" };
const album = (id: string, title: string) => ({ id, title, category: "studio" }) as never;

beforeEach(() => {
  mocks.replace.mockReset();
});

describe("GenreFilterBar", () => {
  const base = {
    slug: "shoegaze",
    categoryLabels,
    decades: [1990, 1980],
    subgenres: [{ value: "dream-pop", label: "dream pop" }],
  };

  it("cada filtro navega a la URL con la página en 1 y solo los valores no predeterminados", async () => {
    renderWithIntl(<GenreFilterBar {...base} params={parseGenreParams({ tab: "albums", page: "4" })} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tipo" }), "studio");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=albums&tipo=studio");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Década" }), "1990");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=albums&decada=1990");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "recientes");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=albums&orden=recientes");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Subgénero" }), "dream-pop");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=albums&sub=dream-pop");
  });

  it("el interruptor 'Solo este género' escribe solo=1", async () => {
    renderWithIntl(<GenreFilterBar {...base} params={parseGenreParams({ tab: "albums" })} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Solo este género" }));
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=albums&solo=1");
  });

  it("enviar la búsqueda navega con el texto recortado", async () => {
    renderWithIntl(<GenreFilterBar {...base} params={parseGenreParams({ tab: "albums" })} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en este género" }), "  slowdive {Enter}");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=albums&q=slowdive");
  });

  it("sin subgéneros con música no ofrece el selector", () => {
    renderWithIntl(<GenreFilterBar {...base} subgenres={[]} params={parseGenreParams({ tab: "albums" })} />);
    expect(screen.queryByRole("combobox", { name: "Subgénero" })).toBeNull();
  });

  it("'Limpiar filtros' aparece solo con filtros activos y conserva la vista", () => {
    const { unmount } = renderWithIntl(<GenreFilterBar {...base} params={parseGenreParams({ tab: "albums" })} />);
    expect(screen.queryByRole("link", { name: "Limpiar filtros" })).toBeNull();
    unmount();
    renderWithIntl(<GenreFilterBar {...base} params={parseGenreParams({ tab: "albums", tipo: "studio", vista: "lista" })} />);
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=albums&vista=lista");
  });

  it("los campos llevan el nombre de su parámetro para funcionar sin JavaScript", () => {
    const { container } = renderWithIntl(<GenreFilterBar {...base} params={parseGenreParams({ tab: "albums" })} />);
    const names = [...container.querySelectorAll("[name]")].map((el) => el.getAttribute("name"));
    expect(names).toEqual(expect.arrayContaining(["tab", "q", "tipo", "decada", "sub", "orden", "solo"]));
  });
});

describe("GenreAlbumsView", () => {
  const props = {
    slug: "shoegaze",
    albums: [album("a", "Souvlaki"), album("b", "Loveless")],
    hasNext: true,
    artists: new Map([["a", { id: "x", name: "Slowdive" }]]),
    categoryLabels,
    coverLabel: "Carátula",
    authenticated: false,
    decades: [1990],
    subgenres: [],
  };

  it("la cuadrícula es la vista por defecto", () => {
    renderWithIntl(<GenreAlbumsView {...props} params={parseGenreParams({ tab: "albums" })} />);
    expect(screen.getAllByTestId("card")).toHaveLength(2);
    expect(screen.queryAllByTestId("row")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Cuadrícula" })).toHaveAttribute("aria-current", "true");
  });

  it("vista=lista renderiza una fila por álbum con su artista principal", () => {
    renderWithIntl(<GenreAlbumsView {...props} params={parseGenreParams({ tab: "albums", vista: "lista" })} />);
    const rows = screen.getAllByTestId("row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Souvlaki · Slowdive");
    expect(rows[1]).toHaveTextContent("Loveless · —");
    expect(screen.getByRole("link", { name: "Cuadrícula" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=albums");
  });

  it("pagina conservando los filtros", () => {
    renderWithIntl(<GenreAlbumsView {...props} params={parseGenreParams({ tab: "albums", tipo: "studio", page: "2" })} />);
    expect(screen.getByRole("link", { name: "Página siguiente" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=albums&tipo=studio&page=3");
  });

  it("filtros sin resultados muestran 'Limpiar filtros' y no el mensaje de género sin música", () => {
    renderWithIntl(<GenreAlbumsView {...props} albums={[]} hasNext={false} params={parseGenreParams({ tab: "albums", q: "zzz" })} />);
    expect(screen.getByText("Ningún álbum coincide con estos filtros.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Limpiar filtros" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Todavía no hay música de este género en el catálogo.")).toBeNull();
  });

  it("sin filtros y sin álbumes muestra el mensaje de género sin música", () => {
    renderWithIntl(<GenreAlbumsView {...props} albums={[]} hasNext={false} params={parseGenreParams({ tab: "albums" })} />);
    expect(screen.getByText("Todavía no hay música de este género en el catálogo.")).toBeInTheDocument();
  });
});

describe("GenreArtistsView", () => {
  const artists = [
    { id: "a1", name: "Slowdive", type: "group", photoUrl: null, albumCount: 3, discographyComplete: true, hasMbid: true, featuredAlbum: null },
    { id: "a2", name: "Ride", type: "group", photoUrl: null, albumCount: 1, discographyComplete: true, hasMbid: true, featuredAlbum: null },
  ];
  const facets = { countries: [], debutDecades: [] };

  it("lista las tarjetas y la barra de filtros con el orden activo", () => {
    renderWithIntl(
      <GenreArtistsView slug="shoegaze" params={parseGenreParams({ tab: "artists" })} artists={artists} hasNext={false} facets={facets} authenticated={false} />,
    );
    expect(screen.getByRole("link", { name: /Slowdive/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("albumes");
  });

  it("una búsqueda sin resultados ofrece limpiarla", () => {
    renderWithIntl(
      <GenreArtistsView slug="shoegaze" params={parseGenreParams({ tab: "artists", q: "zzz" })} artists={[]} hasNext={false} facets={facets} authenticated={false} />,
    );
    expect(screen.getByText("Ningún artista coincide con estos filtros.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Limpiar filtros" })[0]).toHaveAttribute("href", "/es/genre/shoegaze?tab=artists");
  });

  it("sin artistas y sin filtros muestra el estado vacío", () => {
    renderWithIntl(
      <GenreArtistsView slug="shoegaze" params={parseGenreParams({ tab: "artists" })} artists={[]} hasNext={false} facets={facets} authenticated={false} />,
    );
    expect(screen.getByText("Ningún artista del catálogo tiene este género todavía.")).toBeInTheDocument();
  });
});
