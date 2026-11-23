import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CoverThumb } from "./CoverThumb";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => <img src={src} alt={alt} onError={onError} />,
}));

// Caídas de la miniatura (openspec: modernize-artist-page-phase3): sin imagen o con error, el disco dibujado o el relleno
// que pida quien la usa; un error ocurrido antes de la hidratación también cae, sin dejar la imagen rota.
describe("CoverThumb", () => {
  it("sin imagen muestra el relleno a medida si lo hay", () => {
    render(<CoverThumb cover={null} label="" fallback={<span>Christmas EP</span>} />);
    expect(screen.getByText("Christmas EP")).toBeInTheDocument();
  });

  it("con error de carga cae al relleno", () => {
    const { container } = render(<CoverThumb cover="/c/x.jpg" label="" fallback={<span>Relleno</span>} />);
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByText("Relleno")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("una imagen que ya falló al montar (antes de hidratar) cae sin esperar el evento", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
    const onFail = vi.fn();
    render(<CoverThumb cover="/c/rota.jpg" label="" onFail={onFail} fallback={<span>Relleno</span>} />);
    expect(screen.getByText("Relleno")).toBeInTheDocument();
    expect(onFail).toHaveBeenCalledOnce();
    complete.mockRestore();
    width.mockRestore();
  });

  it("una imagen cargada o todavía en curso se queda", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(false);
    const { container } = render(<CoverThumb cover="/c/ok.jpg" label="Carátula" />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "Carátula");
    complete.mockRestore();
  });
});
