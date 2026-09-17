import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { DualRating } from "./DualRating";
import type { RatingsResponse } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    getRatings: vi.fn(),
    saveRating: vi.fn(),
    deleteRating: vi.fn(),
    highlightRating: vi.fn(),
    unhighlightRating: vi.fn(),
    ApiError,
  };
});

vi.mock("@/lib/api/social", () => ({
  getRatings: mocks.getRatings,
  saveRating: mocks.saveRating,
  deleteRating: mocks.deleteRating,
  highlightRating: mocks.highlightRating,
  unhighlightRating: mocks.unhighlightRating,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

beforeEach(() => vi.clearAllMocks());

const rated = (over: Partial<RatingsResponse["own"]> = {}): RatingsResponse => ({
  own: {
    id: "rating-1",
    stars: 4.5,
    detailedScore: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    isHighlighted: false,
    ...over,
  },
  aggregate: { count: 3, averageStars: 4.2, averageDetailedScore: null },
});

describe("DualRating — destacar/quitar la propia valoración (openspec: rework-user-profile, rating-highlights)", () => {
  it("sin valoración propia, no ofrece la acción de destacar", () => {
    renderWithIntl(
      <DualRating
        target="release-group"
        targetId="rg1"
        authenticated
        initial={{ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Destacar en el perfil" })).not.toBeInTheDocument();
  });

  it("con valoración propia sin destacar, ofrece destacarla", async () => {
    const user = userEvent.setup();
    mocks.highlightRating.mockResolvedValue({ highlights: [] });
    renderWithIntl(<DualRating target="release-group" targetId="rg1" authenticated initial={rated()} />);

    await user.click(screen.getByRole("button", { name: "Destacar en el perfil" }));

    await waitFor(() => expect(mocks.highlightRating).toHaveBeenCalledWith("rating-1"));
    expect(await screen.findByRole("button", { name: "Quitar de destacadas" })).toBeInTheDocument();
  });

  it("con valoración ya destacada, ofrece quitarla", async () => {
    const user = userEvent.setup();
    mocks.unhighlightRating.mockResolvedValue({ highlights: [] });
    renderWithIntl(
      <DualRating target="release-group" targetId="rg1" authenticated initial={rated({ isHighlighted: true })} />,
    );

    await user.click(screen.getByRole("button", { name: "Quitar de destacadas" }));

    await waitFor(() => expect(mocks.unhighlightRating).toHaveBeenCalledWith("rating-1"));
    expect(await screen.findByRole("button", { name: "Destacar en el perfil" })).toBeInTheDocument();
  });

  it("un error de la API se muestra sin cambiar el estado del botón", async () => {
    const user = userEvent.setup();
    mocks.highlightRating.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR", 400, "tope alcanzado"));
    renderWithIntl(<DualRating target="release-group" targetId="rg1" authenticated initial={rated()} />);

    await user.click(screen.getByRole("button", { name: "Destacar en el perfil" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisá los datos ingresados e intentá de nuevo.");
    expect(screen.getByRole("button", { name: "Destacar en el perfil" })).toBeInTheDocument();
  });
});
