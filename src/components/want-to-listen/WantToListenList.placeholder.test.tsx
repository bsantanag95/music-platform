import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { WantToListenList } from "./WantToListenList";
import type { WantToListenListResponse } from "@/lib/api/schemas";

// openspec: refine-want-to-listen-page-phase1. Mientras no se conoce el modo guardado el listado es un
// marcador neutro: nunca se pinta el modo por defecto para saltar después al guardado.

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/lib/api/want-to-listen", () => ({ getMyWantToListen: vi.fn(), removeFromWantToListen: vi.fn() }));
vi.mock("@/lib/api/artist-journeys", () => ({
  getArtistJourneyStatuses: vi.fn().mockResolvedValue([]),
  activateArtistJourney: vi.fn(),
}));
vi.mock("./use-want-to-listen-view-mode", () => ({
  useWantToListenViewMode: () => ["detailed", vi.fn(), false] as const,
}));

const initial: WantToListenListResponse = {
  items: [
    {
      id: "e1",
      targetType: "artist",
      createdAt: "2026-01-02T00:00:00Z",
      target: { id: "a1", title: "Pink Floyd", coverThumbUrl: null },
    },
  ],
  page: 1,
  pageSize: 20,
  hasNext: false,
  counts: { artist: 1, "release-group": 0 },
};

describe("WantToListenList · marcador del listado", () => {
  it("sin el modo guardado leído no pinta entradas y el conmutador queda oculto sin perder su espacio", () => {
    renderWithIntl(<WantToListenList initial={initial} />);

    expect(screen.getByTestId("want-to-listen-list-placeholder")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pink Floyd" })).not.toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { hidden: true });
    expect(group.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(group.parentElement!.className).toContain("invisible");
  });
});
