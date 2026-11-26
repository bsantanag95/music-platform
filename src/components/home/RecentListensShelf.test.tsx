import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { artistHref } from "@/lib/catalog-links";
import { RecentListensShelf } from "./RecentListensShelf";
import type { HomeRecentListen } from "@/services/home/home";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
  getFormatter: vi.fn().mockResolvedValue({ relativeTime: () => "hace 3 días" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const listen = (id: string, title: string, rating: HomeRecentListen["rating"] = null): HomeRecentListen => ({
  id,
  listenContext: "first_listen",
  createdAt: "2026-11-15T00:00:00Z",
  target: {
    type: "release-group",
    id: `rg-${id}`,
    title,
    artistName: "Mötley Crüe",
    artistId: "00000000-0000-4000-8000-0000000000a1",
    coverThumbUrl: null,
  },
  rating,
});

// openspec: redesign-signed-in-home-phase2
describe("RecentListensShelf", () => {
  it("sin escuchas no renderiza nada", async () => {
    expect(await RecentListensShelf({ listens: [] })).toBeNull();
  });

  it("muestra cada disco con tu valoración compacta o el contexto, la fecha y el acceso al diario", async () => {
    renderWithIntl(
      await RecentListensShelf({
        listens: [listen("1", "Too Fast for Love", { stars: "4.0", detailedScore: 77 }), listen("2", "Dr. Feelgood")],
      }),
    );
    expect(screen.getByRole("heading", { name: "recentListensTitle" })).toBeInTheDocument();
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first!).getByRole("link", { name: /Too Fast for Love/ })).toBeInTheDocument();
    expect(first).toHaveTextContent("77/100");
    expect(first).not.toHaveTextContent("4,0");
    expect(second).toHaveTextContent("context.first_listen");
    expect(second).toHaveTextContent("hace 3 días");
    expect(screen.getByRole("link", { name: /recentListensSeeDiary/ })).toHaveAttribute("href", "/me/diary");
  });

  it("el nombre del artista enlaza a su página; sin id queda como texto", async () => {
    const withoutId = listen("2", "Dr. Feelgood");
    withoutId.target.artistId = null;
    renderWithIntl(await RecentListensShelf({ listens: [listen("1", "Too Fast for Love"), withoutId] }));
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first!).getByRole("link", { name: "Mötley Crüe" })).toHaveAttribute(
      "href",
      artistHref("Mötley Crüe", "00000000-0000-4000-8000-0000000000a1"),
    );
    expect(second).toHaveTextContent("Mötley Crüe");
    expect(within(second!).queryByRole("link", { name: "Mötley Crüe" })).toBeNull();
  });
});
