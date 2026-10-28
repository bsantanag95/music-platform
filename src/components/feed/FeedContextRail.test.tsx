import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FeedContextRail } from "./FeedContextRail";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const empty = { items: [], period: "week" as const };

describe("FeedContextRail (redesign-feed-entries)", () => {
  it("sin módulos con contenido no renderiza nada", async () => {
    const { container } = renderWithIntl(await FeedContextRail({ convergence: empty, mostActive: [] }));
    expect(container).toBeEmptyDOMElement();
  });

  it("lista a quienes más se movieron, sin cifras, enlazados al feed filtrado", async () => {
    renderWithIntl(
      await FeedContextRail({
        convergence: empty,
        mostActive: [
          { id: "a", username: "ana", displayName: "Ana" },
          { id: "f", username: "fran", displayName: null },
        ],
      }),
    );
    const links = screen.getAllByRole("link", { hidden: true });
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["AAna", "/me/feed?author=ana"],
      ["F@fran", "/me/feed?author=fran"],
    ]);
    expect(screen.getByRole("heading", { name: "rail.mostActive", hidden: true })).toBeInTheDocument();
  });
});
