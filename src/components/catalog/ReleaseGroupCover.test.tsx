import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReleaseGroupCover } from "./ReleaseGroupCover";

vi.mock("./LazyCoverImage", () => ({
  LazyCoverImage: ({ releaseGroupId }: { releaseGroupId: string }) => <span data-testid="lazy" data-id={releaseGroupId} />,
}));
vi.mock("./CoverThumb", () => ({
  CoverThumb: ({ cover }: { cover: string | null }) => <span data-testid="thumb" data-src={cover ?? ""} />,
}));

describe("ReleaseGroupCover", () => {
  it("resuelta en el payload: la pinta sin pedir /cover", () => {
    render(<ReleaseGroupCover releaseGroupId="rg" coverThumbUrl="https://example.test/a.jpg" coverResolved />);
    expect(screen.getByTestId("thumb")).toHaveAttribute("data-src", "https://example.test/a.jpg");
    expect(screen.queryByTestId("lazy")).not.toBeInTheDocument();
  });

  it("resuelta sin carátula (ausente o retirada): la silueta, sin pedirla", () => {
    render(<ReleaseGroupCover releaseGroupId="rg" coverThumbUrl={null} coverResolved />);
    expect(screen.getByTestId("thumb")).toHaveAttribute("data-src", "");
    expect(screen.queryByTestId("lazy")).not.toBeInTheDocument();
  });

  it("sin resolver o sin el dato (un valor guardado antes): la carga diferida la pide", () => {
    const { rerender } = render(<ReleaseGroupCover releaseGroupId="rg" coverThumbUrl={null} coverResolved={false} />);
    expect(screen.getByTestId("lazy")).toHaveAttribute("data-id", "rg");
    rerender(<ReleaseGroupCover releaseGroupId="rg2" />);
    expect(screen.getByTestId("lazy")).toHaveAttribute("data-id", "rg2");
    expect(screen.queryByTestId("thumb")).not.toBeInTheDocument();
  });
});
