import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { DiscoverListSummary } from "@/lib/api/schemas";
import { CommunityListCard } from "./CommunityListCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/profiles/UserHoverCard", () => ({
  UserHoverCard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("./ListCoverMosaic", () => ({ ListCoverMosaic: () => <span data-testid="mosaic" /> }));

const ID = "3b1f6c2e-1111-4a2b-9c3d-000000000001";

function summary(overrides: Partial<DiscoverListSummary> = {}): DiscoverListSummary {
  return {
    id: ID,
    entityType: "release-group",
    title: "Ganadores del Grammy 2025",
    description: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    itemCount: 10,
    coverThumbs: [],
    owner: { id: "o1", username: "exploracion", displayName: "Exploración" },
    isOfficial: false,
    saved: false,
    following: false,
    isOwn: false,
    generated: null,
    ...overrides,
  };
}

describe("CommunityListCard", () => {
  it("una colección generada enlaza directo a Explorar, con el título del idioma y sin perfil de dueño (redesign-lists-page, D2)", () => {
    renderWithIntl(
      <CommunityListCard list={summary({ generated: { templateKey: "grammy-winners", periodKey: "grammy-2025" } })} canSave={false} />,
      "en",
    );

    const link = screen.getByRole("link", { name: "Grammy winners 2025" });
    expect(link.getAttribute("href")).toMatch(/^\/explore\/collections\/grammy-winners-2025-/);
    expect(screen.getByText("by Explore")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /exploracion/i })).not.toBeInTheDocument();
  });

  it("una lista de la comunidad enlaza a su ruta de usuario con su título", () => {
    renderWithIntl(
      <CommunityListCard
        list={summary({ title: "Discos favoritos", owner: { id: "o2", username: "fran", displayName: "Fran" } })}
        canSave={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Discos favoritos" }).getAttribute("href")).toMatch(/^\/users\/fran\/lists\//);
    expect(screen.getByRole("link", { name: "por Fran" })).toHaveAttribute("href", "/users/fran");
  });
});
