import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { GenrePageView } from "./GenrePageView";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/AlbumCard", () => ({
  AlbumCard: ({ releaseGroup }: { releaseGroup: { title: string } }) => <span>{releaseGroup.title}</span>,
}));

const related = (slug: string, nameEs: string | null = null) => ({ slug, name: slug.replace(/-/g, " "), nameEs });
const labels = { home: "Inicio", explore: "Explorar", prev: "Anterior", next: "Siguiente" };
const categoryLabels = { studio: "Estudio", single_ep: "Single", compilation: "Compilado", live_other: "En vivo" };

const base = {
  name: "rock progresivo",
  families: ["rock" as const],
  parents: [related("rock")],
  subgenres: [related("symphonic-prog", "prog sinfónico")],
  related: [related("jazz")],
  artists: [{ id: "a1", name: "Pink Floyd", type: "group", albumCount: 14 }],
  albums: [{ id: "rg1", title: "Meddle" }] as never,
  page: 1,
  hasNext: true,
  baseHref: "/genre/progressive-rock",
  categoryLabels,
  coverLabel: "Carátula",
  authenticated: false,
  labels,
};

describe("GenrePageView", () => {
  it("muestra familias, relaciones con enlace, artistas y álbumes paginados", () => {
    renderWithIntl(<GenrePageView {...base} />);
    expect(screen.getByRole("heading", { level: 1, name: "rock progresivo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rock" })).toHaveAttribute("href", "/es/explore?familia=rock");
    expect(screen.getByRole("link", { name: "prog sinfónico" })).toHaveAttribute("href", "/es/genre/symphonic-prog");
    expect(screen.getByRole("link", { name: "jazz" })).toHaveAttribute("href", "/es/genre/jazz");
    expect(screen.getByRole("link", { name: /Pink Floyd/ })).toHaveTextContent("14 álbumes");
    expect(screen.getByText("Meddle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute("href", "/es/genre/progressive-rock?page=2");
  });

  it("sin música muestra el mensaje vacío y omite las secciones", () => {
    renderWithIntl(<GenrePageView {...base} artists={[]} albums={[]} hasNext={false} />);
    expect(screen.getByText("Todavía no hay música de este género en el catálogo.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Artistas" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Álbumes" })).toBeNull();
  });

  it("omite las filas de relaciones vacías", () => {
    renderWithIntl(<GenrePageView {...base} parents={[]} subgenres={[]} related={[]} />);
    expect(screen.queryByText("Subgénero de")).toBeNull();
    expect(screen.queryByText("Subgéneros")).toBeNull();
    expect(screen.queryByText("Géneros cercanos")).toBeNull();
  });

  it("en la segunda página ofrece 'Anterior'", () => {
    renderWithIntl(<GenrePageView {...base} page={2} hasNext={false} />);
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", "/es/genre/progressive-rock?page=1");
  });
});
