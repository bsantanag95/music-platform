import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ProfileReviews } from "./ProfileReviews";
import type { ProfileReview } from "@/services/profiles/reviews";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(
    (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ cover }: { cover: string | null }) => (
    <span data-testid="cover" data-cover={cover ?? ""} />
  ),
}));

function review(over: Partial<ProfileReview> = {}): ProfileReview {
  return {
    id: "rv1",
    title: "Un disco para volver",
    body: "La producción respira y cada tema encuentra su lugar sin apuro.",
    stars: "4.5",
    detailedScore: 88,
    updatedAt: "2026-09-08T00:00:00.000Z",
    album: { id: "rg1", title: "A Moon Shaped Pool", artistName: "Radiohead", coverThumbUrl: null },
    ...over,
  };
}

describe("ProfileReviews", () => {
  it("no renderiza nada con data null", async () => {
    expect(await ProfileReviews({ data: null })).toBeNull();
  });

  it("no renderiza nada con lista vacía", async () => {
    expect(await ProfileReviews({ data: { reviews: [], total: 0 } })).toBeNull();
  });

  it("renderiza una tarjeta por reseña con el álbum enlazado, el rating y el cuerpo recortado", async () => {
    render(await ProfileReviews({ data: { reviews: [review()], total: 1 } }));

    expect(screen.getByRole("link", { name: "A Moon Shaped Pool" })).toHaveAttribute(
      "href",
      "/album/rg1",
    );
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Un disco para volver")).toBeInTheDocument();
    const body = screen.getByText(/La producción respira/);
    expect(body.className).toMatch(/line-clamp-4/);
    // el medidor de rating aparece
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("4.5"));
  });

  it("muestra 'y N más' cuando el total supera las mostradas", async () => {
    render(
      await ProfileReviews({
        data: { reviews: [review({ id: "a" }), review({ id: "b" })], total: 7 },
      }),
    );

    expect(screen.getByText(/reviews\.andMore.*"count":5/)).toBeInTheDocument();
  });

  it("omite el medidor cuando la reseña no tiene rating", async () => {
    render(
      await ProfileReviews({
        data: { reviews: [review({ stars: null, detailedScore: null })], total: 1 },
      }),
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
