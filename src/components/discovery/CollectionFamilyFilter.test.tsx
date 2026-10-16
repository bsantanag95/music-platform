import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionFamilyFilter } from "./CollectionFamilyFilter";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
}));

const options = [
  { value: null, label: "Todas", href: "/explore/collections" },
  { value: "awards", label: "Premios", href: "/explore/collections?familia=awards" },
  { value: "releases", label: "Lanzamientos", href: "/explore/collections?familia=releases" },
];

describe("CollectionFamilyFilter", () => {
  it("ofrece «Todas» y cada familia con contenido, como enlaces", () => {
    render(<CollectionFamilyFilter label="Filtrar por tipo" options={options} />);

    const nav = screen.getByRole("navigation", { name: "Filtrar por tipo" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Premios" })).toHaveAttribute("href", "/es/explore/collections?familia=awards");
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("marca «Todas» como actual sin filtro y la familia cuando hay filtro", () => {
    const { rerender } = render(<CollectionFamilyFilter label="Filtrar por tipo" options={options} />);
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Premios" })).not.toHaveAttribute("aria-current");

    rerender(<CollectionFamilyFilter label="Filtrar por tipo" options={options} active="awards" />);
    expect(screen.getByRole("link", { name: "Premios" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Todas" })).not.toHaveAttribute("aria-current");
  });

  it("con una sola familia no se pinta", () => {
    const { container } = render(<CollectionFamilyFilter label="Filtrar por tipo" options={options.slice(0, 2)} />);

    expect(container).toBeEmptyDOMElement();
  });
});
