import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { ReviewIndex } from "./ReviewIndex";
import type { Review, ReviewsResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({ getReviews: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; "aria-current"?: "true" }) => (
    <a href={href} aria-current={rest["aria-current"]}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api/social", () => ({ getReviews: mocks.getReviews }));

const reviewsEs = catalogEs.album.reviews;
const RG = "rg-1";

function review(id: string, overrides: Partial<Review> = {}): Review {
  return {
    id,
    user: { id: `u-${id}`, username: `user${id}`, displayName: `Usuario ${id}` },
    title: `Título ${id}`,
    body: "Cuerpo",
    rating: { stars: 4.5, detailedScore: null },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function page(reviews: Review[], hasNext = false): ReviewsResponse {
  return { reviews, page: 1, pageSize: 20, hasNext };
}

beforeEach(() => vi.clearAllMocks());

describe("ReviewIndex", () => {
  it("lista título, nota, autor y fecha, con cada fila apuntando a la página de la reseña", () => {
    renderWithIntl(<ReviewIndex releaseGroupId={RG} initial={page([review("1")])} sort="recent" />);
    expect(screen.getByRole("link", { name: "Título 1" })).toHaveAttribute("href", "/review/1");
    expect(screen.getAllByText("Usuario 1").length).toBeGreaterThan(0);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("sin título muestra un extracto del cuerpo, sin dejar hueco", () => {
    renderWithIntl(
      <ReviewIndex releaseGroupId={RG} initial={page([review("1", { title: null, body: "Un disco que no envejece" })])} sort="recent" />,
    );
    expect(screen.getByRole("link", { name: "Un disco que no envejece" })).toBeInTheDocument();
  });

  it("mantiene el orden en los enlaces y marca el orden activo", () => {
    renderWithIntl(<ReviewIndex releaseGroupId={RG} initial={page([review("1")])} sort="best" />);
    expect(screen.getByRole("link", { name: "Título 1" })).toHaveAttribute("href", "/review/1?sort=best");
    expect(screen.getByRole("link", { name: reviewsEs.sort.best })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: reviewsEs.sort.worst })).toHaveAttribute(
      "href",
      `/album/${RG}/reviews?sort=worst`,
    );
  });

  it("una reseña de cuenta desactivada se muestra con «Cuenta desactivada»", () => {
    renderWithIntl(
      <ReviewIndex
        releaseGroupId={RG}
        initial={page([review("1", { user: { id: "u", username: "", displayName: null, deactivated: true } })])}
        sort="recent"
      />,
    );
    expect(screen.getAllByText(catalogEs.social.deactivatedAccount).length).toBeGreaterThan(0);
  });

  it("muestra el estado vacío", () => {
    renderWithIntl(<ReviewIndex releaseGroupId={RG} initial={page([])} sort="recent" />);
    expect(screen.getByText(reviewsEs.empty)).toBeInTheDocument();
  });

  it("carga la página siguiente con el mismo orden", async () => {
    mocks.getReviews.mockResolvedValue({ reviews: [review("2")], page: 2, pageSize: 20, hasNext: false });
    renderWithIntl(<ReviewIndex releaseGroupId={RG} initial={page([review("1")], true)} sort="worst" />);
    fireEvent.click(screen.getByRole("button", { name: reviewsEs.loadMore }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Título 2" })).toBeInTheDocument());
    expect(mocks.getReviews).toHaveBeenCalledWith("release-group", RG, 2, 20, "worst");
  });
});
