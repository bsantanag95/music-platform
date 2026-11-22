import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListThemeLine } from "./ListThemeChip";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const GENRE = { type: "genre" as const, id: "g1", slug: "progressive-rock", name: "progressive rock", nameEs: "rock progresivo" };

// Chip de tema y "sobre" (openspec: add-list-themes-phase1).
describe("ListThemeLine", () => {
  it("muestra el nombre del tema y el sobre enlazado a la ficha del género, en el idioma", () => {
    renderWithIntl(<ListThemeLine theme="recommendations" subject={GENRE} />);
    expect(screen.getByText("Recomendaciones")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "rock progresivo" })).toHaveAttribute("href", "/genre/progressive-rock");
  });

  it("sin enlace dentro de una fila que ya es un enlace", () => {
    renderWithIntl(<ListThemeLine theme="start_here" subject={GENRE} linked={false} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Por dónde empezar")).toBeInTheDocument();
  });

  it("una lista sin tema ni sobre no dibuja nada", () => {
    const { container } = renderWithIntl(<ListThemeLine theme={null} subject={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
