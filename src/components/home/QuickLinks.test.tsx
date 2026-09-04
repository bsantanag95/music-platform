import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { QuickLinks } from "./QuickLinks";
import { renderWithIntl } from "@/test/i18n-test-utils";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

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

describe("QuickLinks", () => {
  it("renderiza los 6 accesos rápidos con su ícono y su ruta", async () => {
    const ui = await QuickLinks();
    renderWithIntl(ui);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);

    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/me/diary",
      "/me/favorites",
      "/me/lists",
      "/me/collection",
      "/search",
      "/users",
    ]);
  });
});
