import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FilteredAlbumList } from "./FilteredAlbumList";
import { parseExploreListParams } from "@/services/discovery/explore-params";
import type { AlbumPage } from "@/services/discovery/discovery";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; scroll?: boolean }) => {
    // `scroll` es una prop del `Link` de next-intl, no un atributo de `<a>`.
    const attrs: Record<string, unknown> = { ...rest };
    delete attrs.scroll;
    return (
      <a href={`/es${href}`} {...attrs}>
        {children}
      </a>
    );
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/components/catalog/AlbumCard", () => ({
  AlbumCard: ({ releaseGroup }: { releaseGroup: { title: string } }) => <span>{releaseGroup.title}</span>,
}));

const categoryLabels: Record<ReleaseGroupCategory, string> = {
  studio: "De estudio",
  single_ep: "Singles y EPs",
  compilation: "Compilaciones",
  live_other: "Directos y otros",
};

const album = (id: string) => ({ id, title: `Disco ${id}` }) as unknown as AlbumPage["albums"][number];
const result: AlbumPage = { albums: [album("a"), album("b")], page: 1, pageSize: 24, hasNext: false };

const baseProps = {
  heading: "Álbumes · Rock",
  crumb: "Rock",
  result,
  baseHref: "/explore?familia=rock",
  params: parseExploreListParams({}),
  categoryLabels,
  coverLabel: "Carátula",
};

const families = ["rock", "metal", "jazz"].map((key) => ({
  key,
  label: key.toUpperCase(),
  href: `/explore?familia=${key}`,
  current: key === "rock",
}));

describe("FilteredAlbumList", () => {
  it("el título va directamente bajo la miga de pan, sin rótulo de tipo de corte encima", () => {
    renderWithIntl(<FilteredAlbumList {...baseProps} />);

    const heading = screen.getByRole("heading", { level: 1, name: "Álbumes · Rock" });
    expect(heading.previousElementSibling).toBeNull();
    expect(screen.queryByText(/familia de géneros/i)).toBeNull();
    expect(screen.queryByText(/^década$/i)).toBeNull();
  });

  describe("filas de filtros rotuladas (openspec: redesign-decade-view)", () => {
    const facets = [
      {
        label: "Año",
        links: [
          { key: "all", label: "Toda la década", href: "/explore?decada=1990", current: true },
          { key: "1994", label: "1994", href: "/explore?decada=1990&anio=1994", current: false },
          { key: "1995", label: "1995", href: "/explore?decada=1990&anio=1995", current: false },
        ],
        menu: {
          label: "Otras décadas",
          links: [
            { key: "1980", label: "Años 80", href: "/explore?decada=1980", current: false },
            { key: "1990", label: "Años 90", href: "/explore?decada=1990", current: true },
          ],
        },
      },
      {
        label: "Género",
        links: [
          { key: "all", label: "Todos", href: "/explore?decada=1990", current: true },
          { key: "grunge", label: "grunge", href: "/explore?decada=1990&genero=grunge", current: false },
        ],
      },
    ];

    it("pinta cada fila con su rótulo visible y sus chips, y marca el actual", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} facets={facets} />);

      const years = screen.getByRole("navigation", { name: "Año" });
      expect(within(years).getAllByRole("link").map((a) => a.textContent)).toEqual(["Toda la década", "1994", "1995"]);
      expect(within(years).getByRole("link", { name: "1994" })).toHaveAttribute("href", "/es/explore?decada=1990&anio=1994");
      expect(within(years).getByRole("link", { name: "Toda la década" })).toHaveAttribute("aria-current", "page");
      expect(within(years).getByRole("link", { name: "1994" })).not.toHaveAttribute("aria-current");
      // El rótulo está a la vista (no solo en el nombre accesible).
      expect(screen.getByText("Año")).toBeVisible();
      expect(screen.getByText("Género")).toBeVisible();
    });

    it("los chips de género filtran esta misma lista: no enlazan a la página del género", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} facets={facets} />);

      const genres = screen.getByRole("navigation", { name: "Género" });
      expect(within(genres).getByRole("link", { name: "grunge" })).toHaveAttribute("href", "/es/explore?decada=1990&genero=grunge");
    });

    it("las filas van en el orden recibido y antes de los géneros de familia", () => {
      renderWithIntl(
        <FilteredAlbumList {...baseProps} facets={facets} topics={{ label: "Géneros de Rock", links: [{ key: "g", label: "grunge", href: "/genre/grunge" }] }} />,
      );

      const year = screen.getByRole("navigation", { name: "Año" });
      const genre = screen.getByRole("navigation", { name: "Género" });
      const topics = screen.getByRole("navigation", { name: "Géneros de Rock" });
      expect(year.compareDocumentPosition(genre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(genre.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("una fila sin chips no se pinta", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} facets={[{ label: "Género", links: [] }]} />);

      expect(screen.queryByRole("navigation", { name: "Género" })).toBeNull();
      expect(screen.queryByText("Género")).toBeNull();
    });

    it("el menú de otras décadas está en la fila de años, cerrado por defecto", () => {
      const { container } = renderWithIntl(<FilteredAlbumList {...baseProps} facets={facets} />);

      const details = container.querySelector("details")!;
      expect(details).not.toHaveAttribute("open");
      expect(within(details).getByText("Otras décadas")).toBeInTheDocument();
      expect(within(details).getAllByRole("link", { hidden: true }).map((a) => a.textContent)).toEqual(["Años 80", "Años 90"]);
      expect(within(details).getByRole("link", { name: "Años 90", hidden: true })).toHaveAttribute("aria-current", "page");
      // Va dentro de la fila de años, no como una fila propia.
      expect(screen.getByRole("navigation", { name: "Año" }).parentElement).toContainElement(details);
    });

    it("sin otras décadas (solo la actual) no hay menú", () => {
      const only = { ...facets[0]!, menu: { label: "Otras décadas", links: [facets[0]!.menu!.links[1]!] } };
      const { container } = renderWithIntl(<FilteredAlbumList {...baseProps} facets={[only]} />);

      expect(container.querySelector("details")).toBeNull();
    });
  });

  describe("cabecera", () => {
    it("muestra la línea de contexto bajo el título", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} lede="Premiados y mejor valorados primero." />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.nextElementSibling).toHaveTextContent("Premiados y mejor valorados primero.");
    });

    it("sin línea de contexto no pinta nada extra", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} />);

      expect(screen.getByRole("heading", { level: 1 }).nextElementSibling).toBeNull();
    });

    it("pinta el mosaico decorativo de las carátulas del corte, solo desde pantallas anchas y sin texto alternativo", () => {
      const { container } = renderWithIntl(<FilteredAlbumList {...baseProps} headerCovers={["https://c/1.jpg", "https://c/2.jpg", "https://c/3.jpg", "https://c/4.jpg"]} />);

      const mosaic = container.querySelector("header [aria-hidden='true']")!;
      expect(mosaic).toHaveClass("hidden", "sm:grid");
      expect(mosaic.querySelectorAll("img")).toHaveLength(4);
      expect([...mosaic.querySelectorAll("img")].every((img) => img.getAttribute("alt") === "")).toBe(true);
      expect(mosaic.textContent).toBe("");
    });

    it("sin carátulas no hay mosaico", () => {
      const { container } = renderWithIntl(<FilteredAlbumList {...baseProps} headerCovers={[]} />);

      expect(container.querySelector("header img")).toBeNull();
    });
  });

  it("la miga de pan tiene un enlace por nivel intermedio y el último sin enlace", () => {
    renderWithIntl(
      <FilteredAlbumList
        {...baseProps}
        crumb="hard rock"
        parentCrumbs={[
          { label: "Años 80", href: "/explore?decada=1980" },
          { label: "1985", href: "/explore?decada=1980&anio=1985" },
        ]}
      />,
    );

    const crumbs = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(within(crumbs).getAllByRole("link").map((a) => a.textContent)).toEqual(["Inicio", "Explorar", "Años 80", "1985"]);
    expect(within(crumbs).getByRole("link", { name: "Años 80" })).toHaveAttribute("href", "/es/explore?decada=1980");
    expect(within(crumbs).getByText("hard rock")).not.toHaveAttribute("href");
  });

  describe("estado vacío con refinamientos", () => {
    const empty: AlbumPage = { albums: [], page: 1, pageSize: 24, hasNext: false };

    it("con clearHref ofrece «Quitar filtros» hacia ese destino aunque el tipo y el orden sean los de siempre", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} result={empty} baseHref="/explore?decada=1910&genero=hard-rock" clearHref="/explore?decada=1910" />);

      expect(screen.getByRole("link", { name: "Quitar filtros" })).toHaveAttribute("href", "/es/explore?decada=1910");
    });

    it("sin clearHref y sin filtros ofrece volver a Explorar", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} result={empty} />);

      expect(screen.getByRole("link", { name: "Volver a Explorar" })).toHaveAttribute("href", "/es/explore");
    });
  });

  it("pasa los tipos disponibles a la barra de filtros", () => {
    renderWithIntl(<FilteredAlbumList {...baseProps} availableCategories={["single_ep"]} />);

    expect(screen.getByRole("link", { name: "Singles y EPs" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "De estudio" })).toBeNull();
    expect(screen.getByText("De estudio")).toHaveAttribute("aria-disabled", "true");
  });

  describe("géneros del corte", () => {
    const topics = {
      label: "Géneros de Rock",
      links: [
        { key: "rock", label: "rock", href: "/genre/rock" },
        { key: "hard-rock", label: "hard rock", href: "/genre/hard-rock" },
      ],
    };

    it("pinta un chip por género, enlazado a su página, sin cifras", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} topics={topics} />);

      const nav = screen.getByRole("navigation", { name: "Géneros de Rock" });
      expect(within(nav).getByRole("link", { name: "hard rock" })).toHaveAttribute("href", "/es/genre/hard-rock");
      expect(within(nav).getAllByRole("link")).toHaveLength(2);
      expect(nav.textContent).not.toMatch(/\d/);
    });

    it("sin géneros no pinta la fila", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} topics={{ label: "Géneros de Rock", links: [] }} />);

      expect(screen.queryByRole("navigation", { name: "Géneros de Rock" })).toBeNull();
    });
  });

  describe("selector de cortes hermanos", () => {
    it("plegado: va en un desplegable cerrado que lista las demás familias y marca la actual", () => {
      const { container } = renderWithIntl(
        <FilteredAlbumList {...baseProps} siblings={{ label: "Otras familias", links: families, collapsed: true }} />,
      );

      const details = container.querySelector("details")!;
      expect(details).not.toBeNull();
      expect(details).not.toHaveAttribute("open");
      expect(within(details).getByText("Otras familias")).toBeInTheDocument();
      expect(within(details).getAllByRole("link")).toHaveLength(3);
      expect(within(details).getByRole("link", { name: "ROCK" })).toHaveAttribute("aria-current", "page");
    });

    it("sin `collapsed` (décadas) los chips quedan a la vista, sin desplegable", () => {
      const { container } = renderWithIntl(<FilteredAlbumList {...baseProps} siblings={{ label: "Otras décadas", links: families }} />);

      expect(container.querySelector("details")).toBeNull();
      expect(screen.getByRole("navigation", { name: "Otras décadas" })).toBeInTheDocument();
    });

    it("con un solo corte no hay nada que elegir", () => {
      const { container } = renderWithIntl(
        <FilteredAlbumList {...baseProps} siblings={{ label: "Otras familias", links: families.slice(0, 1), collapsed: true }} />,
      );

      expect(container.querySelector("details")).toBeNull();
    });
  });

  it("el orden por defecto se llama «Destacados», no «Mejor valorados»", () => {
    renderWithIntl(<FilteredAlbumList {...baseProps} />);

    expect(screen.getByRole("option", { name: "Destacados" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Mejor valorados" })).toBeNull();
  });
});
