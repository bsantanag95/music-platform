import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { MyRatingsList } from "./MyRatingsList";
import type { MyRatingEntry, MyRatingsListResponse } from "@/lib/api/schemas";

// openspec: refine-ratings-page-phase1 (D1). Mientras no se conoce el modo guardado el listado es un
// marcador neutro: nunca se pinta el modo por defecto para saltar después al guardado.

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/lib/api/ratings", () => ({ getMyRatings: vi.fn() }));
vi.mock("./use-rating-view-mode", () => ({
  useRatingViewMode: () => ["graphic", vi.fn(), false] as const,
}));

const entry: MyRatingEntry = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  targetType: "release-group",
  stars: 5,
  detailedScore: 99,
  updatedAt: "2026-10-01T10:00:00.000Z",
  target: {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Safe and Sound",
    coverThumbUrl: null,
    artistName: "Heart",
    artistId: "550e8400-e29b-41d4-a716-446655440003",
    year: 2012,
  },
};

const initial: MyRatingsListResponse = {
  items: [entry],
  page: 1,
  pageSize: 30,
  hasNext: false,
  total: 1,
  counts: { "release-group": 1, recording: 0 },
  facets: {
    years: [2012],
    stars: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((value) => ({ value, count: value === 5 ? 1 : 0 })),
    types: { "release-group": 1, recording: 0 },
  },
};

describe("MyRatingsList · marcador del listado", () => {
  it("sin el modo guardado leído, no pinta carátulas ni filas, pero sí cabecera y barra", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithIntl(
      <QueryClientProvider client={client}>
        <MyRatingsList initial={initial} />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("ratings-list-placeholder")).toBeInTheDocument();
    expect(screen.queryAllByTestId("rating-caption")).toHaveLength(0);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("1 valoración")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar en tus valoraciones")).toBeInTheDocument();
  });
});
