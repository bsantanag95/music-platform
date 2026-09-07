import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { PinnedShowcase } from "./PinnedShowcase";
import type { PinnedItem } from "@/services/profiles/showcase";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const pin = (over: Partial<PinnedItem>): PinnedItem => ({
  id: "p1",
  note: null,
  position: 0,
  entity: {
    type: "release-group",
    id: "rg1",
    title: "Souvlaki",
    artistName: "Slowdive",
    coverThumbUrl: null,
  },
  ...over,
});

describe("PinnedShowcase", () => {
  it("no renderiza nada sin destacados", async () => {
    expect(await PinnedShowcase({ pinned: [] })).toBeNull();
  });

  it("renderiza título, artista, nota y enlace a la entidad", async () => {
    renderWithIntl(
      await PinnedShowcase({ pinned: [pin({ note: "mi puerta de entrada al shoegaze" })] }),
    );
    expect(screen.getByText("Souvlaki")).toBeInTheDocument();
    expect(screen.getByText("Slowdive")).toBeInTheDocument();
    expect(screen.getByText("mi puerta de entrada al shoegaze")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveProperty("href", expect.stringContaining("/album/rg1"));
  });
});
