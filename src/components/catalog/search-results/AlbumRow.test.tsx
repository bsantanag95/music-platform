import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { AlbumSearchResult } from "@/services/catalog/search/types";
import { AlbumRow } from "./AlbumResults";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("../LazyCoverImage", () => ({ LazyCoverImage: () => <span data-testid="lazy-cover" /> }));
vi.mock("../CoverThumb", () => ({ CoverThumb: ({ cover }: { cover: string | null }) => <span data-testid="cover" data-src={cover ?? ""} /> }));

const wall: AlbumSearchResult = {
  kind: "release-group",
  id: "w",
  mbid: null,
  title: "The Wall",
  artistName: "Pink Floyd",
  category: "studio",
  coverThumbUrl: null,
  coverResolved: false,
  year: 1979,
  cached: true,
};

describe("AlbumRow (refine-search-results-phase3)", () => {
  it("media de la comunidad desde 5 valoraciones y tu nota", () => {
    renderWithIntl(<AlbumRow album={{ ...wall, community: { average: 4.6, count: 12 }, yourStars: 5 }} />);
    expect(screen.getByText("4,6 · 12")).toBeInTheDocument();
    expect(screen.getByText("Tu nota 5,0")).toBeInTheDocument();
  });

  it("con menos de 5 valoraciones y sin nota propia no muestra nada a la derecha", () => {
    renderWithIntl(<AlbumRow album={{ ...wall, community: { average: null, count: 3 }, yourStars: null }} />);
    expect(screen.queryByText(/· 3$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tu nota/)).not.toBeInTheDocument();
  });

  it("con la carátula resuelta en el payload la pinta sin pedir /cover", () => {
    renderWithIntl(<AlbumRow album={{ ...wall, coverResolved: true, coverThumbUrl: "https://example.test/wall.jpg" }} />);
    expect(screen.getByTestId("cover")).toHaveAttribute("data-src", "https://example.test/wall.jpg");
    expect(screen.queryByTestId("lazy-cover")).not.toBeInTheDocument();
  });

  it("sin resolver, la carga diferida la pide al hacerse visible", () => {
    renderWithIntl(<AlbumRow album={wall} />);
    expect(screen.getByTestId("lazy-cover")).toBeInTheDocument();
    expect(screen.queryByTestId("cover")).not.toBeInTheDocument();
  });
});
