import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturedCollection } from "./FeaturedCollection";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={`/es${href}`} className={className}>
      {children}
    </a>
  ),
}));

const base = {
  href: "/explore/collections/ganadores-del-grammy-2025-l1",
  title: "Ganadores del Grammy 2025",
  coverThumbs: ["https://coverartarchive.org/a.jpg", "https://coverartarchive.org/b.jpg"],
  familyLabel: "Premios",
  itemsLabel: "10 álbumes",
  openLabel: "Abrir colección",
};

describe("FeaturedCollection", () => {
  it("es un único enlace al detalle, con título, sello de familia, conteo y acción", () => {
    render(<FeaturedCollection {...base} context="Premios Grammy 2025 · 2 de febrero de 2025" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/es/explore/collections/ganadores-del-grammy-2025-l1");
    expect(screen.getByRole("heading", { level: 3, name: "Ganadores del Grammy 2025" })).toBeInTheDocument();
    expect(screen.getByText("Premios")).toBeInTheDocument();
    expect(screen.getByText("10 álbumes")).toBeInTheDocument();
    expect(screen.getByText("Abrir colección")).toBeInTheDocument();
    expect(screen.getByText("Premios Grammy 2025 · 2 de febrero de 2025")).toBeInTheDocument();
  });

  it("la frase de contexto sustituye a la descripción", () => {
    render(<FeaturedCollection {...base} description="Descripción larga" context="La frase" />);

    expect(screen.getByText("La frase")).toBeInTheDocument();
    expect(screen.queryByText("Descripción larga")).toBeNull();
  });

  it("sin frase usa la descripción; sin ninguna de las dos no pinta párrafo", () => {
    const { rerender, container } = render(<FeaturedCollection {...base} description="Descripción larga" />);
    expect(screen.getByText("Descripción larga")).toBeInTheDocument();

    rerender(<FeaturedCollection {...base} />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("no lleva un rótulo «Destacada» sobre el título", () => {
    render(<FeaturedCollection {...base} />);

    expect(screen.queryByText(/destacada/i)).toBeNull();
  });
});
