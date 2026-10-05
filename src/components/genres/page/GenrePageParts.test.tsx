import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { GenreStats } from "@/services/genres/stats";
import { parseGenreParams } from "@/services/genres/page-params";
import { GenreArtistCard } from "./GenreArtistCard";
import { GenreDecadeBars } from "./GenreDecadeBars";
import { GenreHeader, primaryFamily } from "./GenreHeader";
import { GenrePagination } from "./GenrePagination";
import { GenreStatsLine } from "./GenreStatsLine";
import { GenreTabs } from "./GenreTabs";
import { GenreTree } from "./GenreTree";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
}));

const tree = (slug: string, albumCount: number, nameEs: string | null = null) => ({
  slug,
  name: slug.replace(/-/g, " "),
  nameEs,
  albumCount,
});
const related = (slug: string, nameEs: string | null = null) => ({ slug, name: slug.replace(/-/g, " "), nameEs });

const stats = (patch: Partial<GenreStats> = {}): GenreStats => ({
  albumCount: 412,
  artistCount: 138,
  ratingCount: 1204,
  averageStars: 4.1,
  peakDecade: 1970,
  decades: [],
  allDecades: [],
  ...patch,
});

describe("GenreHeader", () => {
  it("muestra las migas con la primera familia en el orden de la interfaz, el título y las familias", () => {
    renderWithIntl(<GenreHeader name="rock progresivo" families={["experimental", "rock"]} />);
    expect(screen.getByRole("heading", { level: 1, name: "rock progresivo" })).toBeInTheDocument();
    const crumbs = within(screen.getByRole("navigation", { name: "breadcrumb" }));
    expect(crumbs.getByRole("link", { name: "Explorar" })).toHaveAttribute("href", "/es/explore");
    expect(crumbs.getByRole("link", { name: "Rock" })).toHaveAttribute("href", "/es/explore?familia=rock");
    expect(crumbs.queryByRole("link", { name: "Experimental" })).toBeNull();
    expect(screen.getByRole("link", { name: "Experimental" })).toHaveAttribute("href", "/es/explore?familia=experimental");
  });

  it("un género sin familia omite ese tramo de las migas", () => {
    renderWithIntl(<GenreHeader name="raro" families={[]} />);
    const crumbs = within(screen.getByRole("navigation", { name: "breadcrumb" }));
    expect(crumbs.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Familias")).toBeNull();
  });

  it("primaryFamily respeta el orden de la interfaz", () => {
    expect(primaryFamily(["jazz", "rock"])).toBe("rock");
    expect(primaryFamily([])).toBeNull();
  });
});

describe("GenreStatsLine", () => {
  it("muestra álbumes, artistas, valoraciones, media y década de auge", () => {
    renderWithIntl(<GenreStatsLine stats={stats()} />);
    expect(screen.getByText(/412 álbumes · 138 artistas · 1.?204 valoraciones · Década de auge: 1970s/)).toBeInTheDocument();
    expect(screen.getByText(/Media de la comunidad: 4,1 de 5/)).toBeInTheDocument();
  });

  it("omite lo que el servicio dejó en null", () => {
    renderWithIntl(<GenreStatsLine stats={stats({ ratingCount: null, averageStars: null, peakDecade: null })} />);
    expect(screen.queryByText(/valoraciones/)).toBeNull();
    expect(screen.queryByText(/Media de la comunidad/)).toBeNull();
    expect(screen.queryByText(/Década de auge/)).toBeNull();
    expect(screen.getByText("412 álbumes · 138 artistas")).toBeInTheDocument();
  });

  it("singular en una sola unidad", () => {
    renderWithIntl(<GenreStatsLine stats={stats({ albumCount: 1, artistCount: 1, ratingCount: null, averageStars: null })} />);
    expect(screen.getByText(/^1 álbum · 1 artista/)).toBeInTheDocument();
  });
});

describe("GenreTabs", () => {
  it("marca la pestaña activa y enlaza cada una por ?tab=", () => {
    renderWithIntl(<GenreTabs slug="shoegaze" params={parseGenreParams({ tab: "artists" })} />);
    const nav = within(screen.getByRole("navigation", { name: "Secciones del género" }));
    expect(nav.getByRole("link", { name: "Artistas" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Resumen" })).not.toHaveAttribute("aria-current");
    expect(nav.getByRole("link", { name: "Resumen" })).toHaveAttribute("href", "/es/genre/shoegaze");
    expect(nav.getByRole("link", { name: "Álbumes" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=albums");
    expect(nav.getByRole("link", { name: "Listas" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=lists");
  });

  it("sin parámetro el Resumen es la pestaña activa", () => {
    renderWithIntl(<GenreTabs slug="shoegaze" params={parseGenreParams({})} />);
    expect(screen.getByRole("link", { name: "Resumen" })).toHaveAttribute("aria-current", "page");
  });
});

describe("GenreTree", () => {
  it("muestra padres, el género actual, subgéneros con su cantidad y cercanos, enlazados", () => {
    renderWithIntl(
      <GenreTree
        name="rock progresivo"
        parents={[related("rock")]}
        subgenres={[tree("neo-prog", 40, "neo-prog"), tree("canterbury", 3)]}
        related={[related("jazz-fusion")]}
      />,
    );
    expect(screen.getByRole("link", { name: "rock" })).toHaveAttribute("href", "/es/genre/rock");
    expect(screen.getByText("rock progresivo")).toBeInTheDocument();
    const items = within((screen.getByText("Subgéneros").parentElement as HTMLElement)).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("neo-prog");
    expect(items[0]).toHaveTextContent("40 álbumes");
    expect(items[1]).toHaveTextContent("canterbury");
    expect(items[1]).toHaveTextContent("3 álbumes");
    expect(screen.getByRole("link", { name: "jazz fusion" })).toHaveAttribute("href", "/es/genre/jazz-fusion");
  });

  it("los subgéneros sin música van atenuados al final", () => {
    renderWithIntl(<GenreTree name="g" parents={[]} subgenres={[tree("con-musica", 2), tree("sin-musica", 0)]} related={[]} />);
    const items = within((screen.getByText("Subgéneros").parentElement as HTMLElement)).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent("Sin música todavía");
    expect(items[1]).toHaveClass("opacity-60");
  });

  it("si ningún subgénero tiene música omite la fila de subgéneros", () => {
    renderWithIntl(<GenreTree name="g" parents={[related("rock")]} subgenres={[tree("a", 0), tree("b", 0)]} related={[]} />);
    expect(screen.queryByText("Subgéneros")).toBeNull();
    expect(screen.queryByRole("link", { name: "a" })).toBeNull();
  });

  it("con más de 12 subgéneros muestra 12 y el resto tras un desplegable", () => {
    const many = Array.from({ length: 20 }, (_, i) => tree(`sub-${String(i).padStart(2, "0")}`, 100 - i));
    const { container } = renderWithIntl(<GenreTree name="g" parents={[]} subgenres={many} related={[]} />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByText("Ver 8 subgéneros más")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
  });

  it("sin padres, subgéneros con música ni cercanos no renderiza nada", () => {
    const { container } = renderWithIntl(<GenreTree name="g" parents={[]} subgenres={[]} related={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("GenreDecadeBars", () => {
  const params = parseGenreParams({});

  it("cada década enlaza a la pestaña Álbumes filtrada y dice su cantidad", () => {
    renderWithIntl(
      <GenreDecadeBars
        slug="shoegaze"
        params={params}
        decades={[
          { decade: 1990, count: 5 },
          { decade: 1980, count: 12 },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: "1980s: 12 álbumes" });
    expect(link).toHaveAttribute("href", "/es/genre/shoegaze?tab=albums&decada=1980");
    expect(screen.getByRole("link", { name: "1990s: 5 álbumes" })).toBeInTheDocument();
  });

  it("sin décadas no renderiza nada", () => {
    const { container } = renderWithIntl(<GenreDecadeBars slug="shoegaze" params={params} decades={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("GenreArtistCard", () => {
  it("muestra el nombre enlazado y los álbumes del género", () => {
    renderWithIntl(<GenreArtistCard artist={{ id: "a1", name: "Slowdive", type: "group", photoUrl: null, albumCount: 2 }} />);
    expect(screen.getByRole("link", { name: /Slowdive/ })).toHaveTextContent("2 álbumes del género");
  });

  it("un solo álbum va en singular", () => {
    renderWithIntl(<GenreArtistCard artist={{ id: "a1", name: "Slowdive", type: "group", photoUrl: null, albumCount: 1 }} />);
    expect(screen.getByText("1 álbum del género")).toBeInTheDocument();
  });
});

describe("GenrePagination", () => {
  it("enlaza anterior y siguiente conservando los filtros", () => {
    const params = parseGenreParams({ tab: "albums", tipo: "studio", page: "2" });
    renderWithIntl(<GenrePagination slug="g" params={params} page={2} hasNext />);
    expect(screen.getByRole("link", { name: "Página anterior" })).toHaveAttribute("href", "/es/genre/g?tab=albums&tipo=studio");
    expect(screen.getByRole("link", { name: "Página siguiente" })).toHaveAttribute("href", "/es/genre/g?tab=albums&tipo=studio&page=3");
  });

  it("una sola página no renderiza la navegación", () => {
    const { container } = renderWithIntl(<GenrePagination slug="g" params={parseGenreParams({})} page={1} hasNext={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
