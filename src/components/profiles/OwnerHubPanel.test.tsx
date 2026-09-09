import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerHubPanel } from "./OwnerHubPanel";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${vars.count}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("OwnerHubPanel", () => {
  it("enlaza las superficies de gestión de /me/*", async () => {
    renderWithIntl(await OwnerHubPanel({ pendingRequests: 0 }));
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/me/diary",
        "/me/favorites",
        "/me/lists",
        "/me/collection",
        "/me/followers",
        "/me/following",
        "/me/follow-requests",
        "/me/blocks",
        "/me/settings",
      ]),
    );
  });

  it("muestra el badge de solicitudes pendientes cuando hay > 0", async () => {
    renderWithIntl(await OwnerHubPanel({ pendingRequests: 3 }));
    expect(screen.getByText("pendingFollowRequests:3")).toBeInTheDocument();
  });

  it("no muestra badge cuando no hay solicitudes pendientes", async () => {
    renderWithIntl(await OwnerHubPanel({ pendingRequests: 0 }));
    expect(screen.queryByText(/pendingFollowRequests/)).not.toBeInTheDocument();
  });
});
