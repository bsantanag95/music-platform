import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { Reviews } from "./Reviews";
import type { ReviewsResponse } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mocks = vi.hoisted(() => ({
  getReviews: vi.fn(),
  saveReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
}));
vi.mock("@/lib/api/social", () => mocks);

const TARGET_ID = "00000000-0000-4000-8000-0000000000a1";

function response(reviews: ReviewsResponse["reviews"]): ReviewsResponse {
  return { reviews, page: 1, pageSize: 20, hasNext: false };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Reviews", () => {
  it("muestra una reseña con título y estrellas, y otra sin título sin dejar hueco", () => {
    renderWithIntl(
      <Reviews
        target="release-group"
        targetId={TARGET_ID}
        authenticated={false}
        ownStars={0}
        initial={response([
          {
            id: "rv1",
            user: { id: "u1", username: "joe", displayName: "Joe A" },
            title: "Sísifo feliz",
            body: "Legítimamente increíble.",
            rating: { stars: 4.5, detailedScore: null },
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "rv2",
            user: { id: "u2", username: "sam", displayName: null },
            title: null,
            body: "Sin título pero con opinión.",
            rating: { stars: 3, detailedScore: null },
            createdAt: "2026-01-02T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        ])}
      />,
    );

    expect(screen.getByText("· Sísifo feliz")).toBeInTheDocument();
    expect(screen.getByText("Legítimamente increíble.")).toBeInTheDocument();
    expect(screen.getByText("Sin título pero con opinión.")).toBeInTheDocument();
    // la reseña sin título no renderiza un separador "·" propio
    expect(screen.queryByText("· null")).not.toBeInTheDocument();
  });

  it("sin sesión ofrece iniciar sesión y no muestra editor", () => {
    renderWithIntl(
      <Reviews
        target="release-group"
        targetId={TARGET_ID}
        authenticated={false}
        ownStars={0}
        initial={response([])}
      />,
    );
    expect(screen.getByText("Iniciá sesión para reseñar")).toBeInTheDocument();
    expect(screen.queryByLabelText("Escribir una reseña")).not.toBeInTheDocument();
  });

  it("el editor pide estrellas cuando el usuario no valoró el álbum", () => {
    renderWithIntl(
      <Reviews
        target="release-group"
        targetId={TARGET_ID}
        authenticated
        userId="me"
        ownStars={0}
        initial={response([])}
      />,
    );
    expect(screen.getByText("Elegí una valoración para publicar la reseña.")).toBeInTheDocument();
  });

  it("el editor no pide estrellas cuando el usuario ya valoró el álbum", () => {
    renderWithIntl(
      <Reviews
        target="release-group"
        targetId={TARGET_ID}
        authenticated
        userId="me"
        ownStars={4}
        initial={response([])}
      />,
    );
    expect(
      screen.queryByText("Elegí una valoración para publicar la reseña."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tu reseña")).toBeInTheDocument();
  });

  it("publica una reseña con título opcional", async () => {
    const user = userEvent.setup();
    mocks.saveReview.mockResolvedValue({
      id: "new",
      user: { id: "me", username: "me", displayName: "Me" },
      title: "Mi título",
      body: "Un texto suficientemente largo para publicar.",
      rating: { stars: 4, detailedScore: null },
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    renderWithIntl(
      <Reviews
        target="release-group"
        targetId={TARGET_ID}
        authenticated
        userId="me"
        ownStars={4}
        initial={response([])}
      />,
    );

    await user.type(screen.getByLabelText("Título (opcional)"), "Mi título");
    await user.type(
      screen.getByLabelText("Tu reseña"),
      "Un texto suficientemente largo para publicar.",
    );
    await user.click(screen.getByRole("button", { name: "Publicar reseña" }));

    expect(mocks.saveReview).toHaveBeenCalledWith("release-group", TARGET_ID, {
      body: "Un texto suficientemente largo para publicar.",
      title: "Mi título",
    });
    expect(await screen.findByText("· Mi título")).toBeInTheDocument();
  });
});
