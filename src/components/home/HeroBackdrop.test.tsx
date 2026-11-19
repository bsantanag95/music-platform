import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { BACKDROP_MIN, HeroBackdrop, PERSONAL_CELLS } from "./HeroBackdrop";

vi.mock("@/components/ui/AppImage", () => ({
  AppImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const albums = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `rg-${i}`, coverThumbUrl: `https://covers/${i}.jpg` }));

// openspec: personalize-signed-in-hero-backdrop
describe("HeroBackdrop", () => {
  it("por debajo del mínimo es el mosaico general entero, sin carátulas propias", () => {
    const { container } = render(<HeroBackdrop albums={albums(BACKDROP_MIN - 1)} />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.dataset.backdrop).toBe("general");
    expect(layer.style.backgroundImage).toContain("/hero/wall.webp");
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("con suficientes álbumes pone los propios en las celdas visibles, en orden, y rellena con el mosaico general", () => {
    const { container } = render(<HeroBackdrop albums={albums(8)} />);
    const cells = [...container.querySelectorAll<HTMLElement>("[data-cell]")];
    expect(cells).toHaveLength(32);

    const personal = cells.filter((cell) => cell.dataset.cell === "personal");
    expect(personal).toHaveLength(8);
    // La primera carátula va en la columna de más a la derecha, fila de arriba (celda 7).
    expect(cells[PERSONAL_CELLS[0]!]!.querySelector("img")!.getAttribute("src")).toBe("https://covers/0.jpg");
    expect(cells[PERSONAL_CELLS[1]!]!.querySelector("img")!.getAttribute("src")).toBe("https://covers/1.jpg");
    expect(cells.filter((cell) => cell.dataset.cell === "wall")).toHaveLength(24);
  });

  it("nunca usa más de 20 celdas propias", () => {
    const { container } = render(<HeroBackdrop albums={albums(30)} />);
    expect(container.querySelectorAll("[data-cell=personal]")).toHaveLength(20);
    expect(PERSONAL_CELLS).toHaveLength(20);
  });

  it("es decorativo: oculto para tecnologías de asistencia y sin texto alternativo", () => {
    const { container } = render(<HeroBackdrop albums={albums(10)} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    for (const img of container.querySelectorAll("img")) expect(img).toHaveAttribute("alt", "");
  });
});
