import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { GenreChips } from "./GenreChips";

// El Link de next-intl necesita el router de Next: se reemplaza por un <a> que conserva los atributos.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
}));

const genre = (slug: string, inherited = false, nameEs: string | null = null) => ({ slug, name: slug.replace(/-/g, " "), nameEs, inherited });

describe("GenreChips", () => {
  it("no renderiza nada sin géneros ni descriptores", () => {
    const { container } = renderWithIntl(<GenreChips genres={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra chips enlazados a la página del género, con el nombre en español si existe", () => {
    renderWithIntl(<GenreChips genres={[genre("progressive-rock", false, "rock progresivo"), genre("art-rock")]} />);
    expect(screen.getByRole("link", { name: "rock progresivo" })).toHaveAttribute("href", "/es/genre/progressive-rock");
    expect(screen.getByRole("link", { name: "art rock" })).toHaveAttribute("href", "/es/genre/art-rock");
  });

  it("muestra 5 chips y agrupa el resto detrás de '+N'", () => {
    const genres = Array.from({ length: 7 }, (_, i) => genre(`g-${i}`));
    renderWithIntl(<GenreChips genres={genres} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
    // Los 7 existen en el DOM (los 2 últimos dentro del <details>), pero solo 5 fuera de él.
    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(document.querySelectorAll("details a")).toHaveLength(2);
  });

  it("marca los heredados con estilo atenuado y texto accesible con el artista", () => {
    renderWithIntl(<GenreChips genres={[genre("shoegaze", true)]} inheritedFrom="Slowdive" />);
    const link = screen.getByRole("link", { name: /shoegaze/ });
    expect(link).toHaveAttribute("data-inherited", "true");
    expect(link).toHaveAttribute("title", "Heredado de Slowdive");
    expect(link).toHaveTextContent("Heredado de Slowdive");
  });

  it("en una canción (sin artista) dice que viene del álbum", () => {
    renderWithIntl(<GenreChips genres={[genre("shoegaze", true)]} />);
    expect(screen.getByRole("link", { name: /shoegaze/ })).toHaveAttribute("title", "Del álbum");
  });

  it("los descriptores van aparte, sin enlace", () => {
    renderWithIntl(<GenreChips genres={[genre("post-rock")]} descriptors={["instrumental", "soundtrack"]} />);
    expect(screen.getByText("Instrumental")).toBeInTheDocument();
    expect(screen.getByText("Banda sonora")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instrumental" })).toBeNull();
  });
});
