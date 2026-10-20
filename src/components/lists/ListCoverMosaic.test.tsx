import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { ListCoverMosaic } from "./ListCoverMosaic";

vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ className, onFail }: { className: string; onFail?: () => void }) => (
    <button type="button" data-testid="cover" className={className} onClick={onFail} />
  ),
}));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span data-testid="disc" /> }));

describe("ListCoverMosaic", () => {
  it("usa tantas imágenes como haya, hasta cuatro, sin discos de relleno", () => {
    for (const n of [1, 2, 3, 4, 6]) {
      const { container, unmount } = render(<ListCoverMosaic coverThumbs={Array.from({ length: n }, (_, i) => `c${i}`)} />);
      expect(container.querySelectorAll("[data-testid=cover]")).toHaveLength(Math.min(n, 4));
      expect(container.querySelector("[data-testid=disc]")).toBeNull();
      unmount();
    }
  });

  it("con tres, la primera ocupa dos filas; sin imágenes, una sola silueta de disco", () => {
    const { container, unmount } = render(<ListCoverMosaic coverThumbs={["a", "b", "c"]} />);
    expect(container.querySelector("[data-testid=cover]")?.className).toContain("row-span-2");
    unmount();
    const empty = render(<ListCoverMosaic coverThumbs={[]} />);
    expect(empty.container.querySelectorAll("[data-testid=disc]")).toHaveLength(1);
  });

  it("una imagen que falla se descarta y el mosaico se reacomoda sin hueco; si fallan todas, queda el disco", () => {
    const { container } = render(<ListCoverMosaic coverThumbs={["a", "b", "c", "d"]} />);
    fireEvent.click(container.querySelectorAll("[data-testid=cover]")[3]!);
    const tiles = container.querySelectorAll("[data-testid=cover]");
    expect(tiles).toHaveLength(3);
    expect(tiles[0]?.className).toContain("row-span-2");
    expect(container.querySelector("[data-testid=disc]")).toBeNull();

    for (let i = 0; i < 3; i++) fireEvent.click(container.querySelector("[data-testid=cover]")!);
    expect(container.querySelectorAll("[data-testid=cover]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-testid=disc]")).toHaveLength(1);
  });

  it("una misma carátula repetida en la lista no rompe el mosaico", () => {
    const { container } = render(<ListCoverMosaic coverThumbs={["a", "a", "b"]} />);
    expect(container.querySelectorAll("[data-testid=cover]")).toHaveLength(3);
  });
});
