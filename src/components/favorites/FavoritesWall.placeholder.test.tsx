import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FavoritesWall } from "./FavoritesWall";
import type { Favorite, FavoritesListResponse } from "@/lib/api/schemas";

// openspec: refine-favorites-page-phase1. Mientras no se conoce el modo guardado el listado es un marcador
// neutro: nunca se pinta el modo por defecto para saltar después al guardado.

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("@/lib/api/favorites", () => ({
  getMyFavorites: vi.fn(),
  getUserFavorites: vi.fn(),
  removeFavorite: vi.fn(),
  updateFavoriteAudience: vi.fn(),
  updateFavoritesAudienceBulk: vi.fn(),
}));
vi.mock("./use-favorite-view-mode", () => ({
  useFavoriteViewMode: () => ["detailed", vi.fn(), false] as const,
}));

const favorite: Favorite = {
  id: "00000000-0000-4000-8000-000000000001",
  targetType: "artist",
  audience: "followers",
  createdAt: "2026-02-01T00:00:00.000Z",
  target: { id: "t1", title: "Radiohead", coverThumbUrl: null },
};

const initial: FavoritesListResponse = {
  favorites: [favorite],
  page: 1,
  pageSize: 20,
  hasNext: false,
  counts: { artist: 1, "release-group": 0, recording: 0 },
};

describe("FavoritesWall · marcador del listado", () => {
  it("sin el modo guardado leído no pinta fichas, pero sí cabecera y barra, y el conmutador queda oculto", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithIntl(
      <QueryClientProvider client={client}>
        <FavoritesWall initial={initial} />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("favorites-list-placeholder")).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("1 artista", { exact: false })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar en tus favoritos")).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { hidden: true });
    expect(group.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(group.parentElement!.className).toContain("invisible");
  });
});
