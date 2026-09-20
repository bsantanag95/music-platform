import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerSettingsCard } from "./OwnerSettingsCard";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${vars.count}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("OwnerSettingsCard", () => {
  it("es un único enlace al área de ajustes, sin atajos a la biblioteca", async () => {
    renderWithIntl(await OwnerSettingsCard({ pendingRequests: 0 }));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/me/settings");
    expect(links[0]).toHaveTextContent("settings");
  });

  it("muestra la bandeja de solicitudes pendientes cuando hay > 0", async () => {
    renderWithIntl(await OwnerSettingsCard({ pendingRequests: 3 }));
    expect(screen.getByText("pendingFollowRequests:3")).toBeInTheDocument();
  });

  it("no muestra ningún indicador numérico cuando no hay solicitudes", async () => {
    renderWithIntl(await OwnerSettingsCard({ pendingRequests: 0 }));
    expect(screen.queryByText(/pendingFollowRequests/)).not.toBeInTheDocument();
  });
});
