import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ListCoverMosaic } from "./ListCoverMosaic";

vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ className }: { className: string }) => <span data-testid="cover" className={className} />,
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
});
