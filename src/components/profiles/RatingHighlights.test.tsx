import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { RatingHighlights } from "./RatingHighlights";
import type { RatingHighlightEntry } from "@/services/rating-highlights/rating-highlights";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const highlight = (over: Partial<RatingHighlightEntry> = {}): RatingHighlightEntry => ({
  id: "r1",
  stars: "5.0",
  detailedScore: null,
  entity: {
    type: "release-group",
    id: "rg1",
    title: "Blonde",
    artistName: "Frank Ocean",
    coverThumbUrl: null,
  },
  ...over,
});

describe("RatingHighlights", () => {
  it("no renderiza nada sin valoraciones destacadas", async () => {
    expect(await RatingHighlights({ highlights: [] })).toBeNull();
  });

  it("renderiza título, artista y enlace por cada valoración destacada", async () => {
    renderWithIntl(await RatingHighlights({ highlights: [highlight()] }));
    expect(screen.getByText("Blonde")).toBeInTheDocument();
    expect(screen.getByText("Frank Ocean")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveProperty("href", expect.stringContaining("/album/rg1"));
  });

  it("varias valoraciones destacadas se listan todas", async () => {
    renderWithIntl(
      await RatingHighlights({
        highlights: [highlight({ id: "r1" }), highlight({ id: "r2", entity: { ...highlight().entity, id: "rg2", title: "Norman Fucking Rockwell!" } })],
      }),
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
