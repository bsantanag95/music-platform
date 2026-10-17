import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FilteredAlbumList } from "./FilteredAlbumList";
import { parseExploreListParams } from "@/services/discovery/explore-params";
import type { AlbumPage } from "@/services/discovery/discovery";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
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

  describe("años del corte", () => {
    const years = {
      label: "Años de los 1990s",
      links: [
        { key: "all", label: "Toda la década", href: "/explore?decada=1990", current: true },
        { key: "1994", label: "1994", href: "/explore?decada=1990&anio=1994", current: false },
        { key: "1995", label: "1995", href: "/explore?decada=1990&anio=1995", current: false },
      ],
    };

    it("pinta un chip por año, enlazado, y marca el actual", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} years={years} />);

      const nav = screen.getByRole("navigation", { name: "Años de los 1990s" });
      expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Toda la década", "1994", "1995"]);
      expect(within(nav).getByRole("link", { name: "1994" })).toHaveAttribute("href", "/es/explore?decada=1990&anio=1994");
      expect(within(nav).getByRole("link", { name: "Toda la década" })).toHaveAttribute("aria-current", "page");
      expect(within(nav).getByRole("link", { name: "1994" })).not.toHaveAttribute("aria-current");
    });

    it("va antes que los géneros del corte", () => {
      renderWithIntl(
        <FilteredAlbumList {...baseProps} years={years} topics={{ label: "Géneros de los 1990s", links: [{ key: "g", label: "grunge", href: "/genre/grunge" }] }} />,
      );

      const yearsNav = screen.getByRole("navigation", { name: "Años de los 1990s" });
      const topicsNav = screen.getByRole("navigation", { name: "Géneros de los 1990s" });
      expect(yearsNav.compareDocumentPosition(topicsNav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("sin años (solo \"Toda la década\") no pinta la fila", () => {
      renderWithIntl(<FilteredAlbumList {...baseProps} years={{ label: "Años de los 1990s", links: [years.links[0]!] }} />);

      expect(screen.queryByRole("navigation", { name: "Años de los 1990s" })).toBeNull();
    });
  });

  it("con un nivel intermedio la miga de pan lo muestra enlazado antes del corte", () => {
    renderWithIntl(<FilteredAlbumList {...baseProps} crumb="1994" parentCrumb={{ label: "1990s", href: "/explore?decada=1990" }} />);

    const crumbs = screen.getByRole("navigation", { name: /migas|breadcrumb|ruta/i });
    expect(within(crumbs).getByRole("link", { name: "1990s" })).toHaveAttribute("href", "/es/explore?decada=1990");
    expect(within(crumbs).getByText("1994")).toBeInTheDocument();
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
