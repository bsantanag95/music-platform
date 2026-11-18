import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { FeedPreview } from "./FeedPreview";
import { selectHomeFeedCards } from "./home-feed-cards";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { FeedEntry } from "@/services/feed/feed";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: { count?: number }) =>
    values?.count != null ? `${key}:${values.count}` : key,
  ),
}));
vi.mock("@/components/profiles/UserHoverCard", () => ({ UserHoverCard: ({ children }: { children: ReactNode }) => <>{children}</> }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ label }: { label: string }) => <span data-testid="cover-thumb">{label}</span>,
}));

const author = { id: "u1", username: "fran", displayName: "Fran" };

const comment = {
  kind: "comment",
  id: "c1",
  body: "Producción impecable de principio a fin.",
  createdAt: "2026-08-01T00:00:00Z",
  target: {
    type: "release-group",
    id: "rg1",
    title: "Currents",
    artistName: "Tame Impala",
    artistId: "a1",
    coverThumbUrl: null,
  },
  author,
} satisfies FeedEntry;

const favorite: FeedEntry = {
  kind: "favorite",
  id: "f1",
  targetType: "release-group",
  audience: "public",
  createdAt: "2026-08-02T00:00:00Z",
  target: {
    id: "rg2",
    title: "Lonerism",
    artistName: "Tame Impala",
    artistId: "a1",
    albumId: null,
    albumTitle: null,
    coverThumbUrl: null,
  },
  author,
};

const camino = (id: string): FeedEntry => ({
  kind: "camino",
  id,
  event: "created",
  audience: "public",
  createdAt: "2026-07-30T00:00:00Z",
  camino: { id, title: "Camino", albumCount: 3 },
  author,
});

// openspec: redesign-signed-in-home-phase2
describe("FeedPreview", () => {
  it("muestra el contenido en tarjetas, el resumen por persona y el acceso al feed", async () => {
    const selection = selectHomeFeedCards([favorite, comment, camino("k1"), camino("k2")]);
    renderWithIntl(await FeedPreview({ selection }));

    expect(screen.getAllByRole("listitem").filter((item) => item.querySelector("article"))).toHaveLength(2);
    expect(screen.getByText("Producción impecable de principio a fin.")).toBeInTheDocument();
    expect(screen.getByText("Lonerism")).toBeInTheDocument();
    expect(screen.getByText("feedSummary.caminoCreated:2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "followingMore" })).toHaveAttribute("href", "/me/feed");
  });

  it("sin tarjetas muestra el texto vacío y conserva el acceso al feed", async () => {
    renderWithIntl(await FeedPreview({ selection: { cards: [], summary: [] } }));

    expect(screen.getByText("feedPreviewEmpty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "followingMore" })).toHaveAttribute("href", "/me/feed");
  });
});
