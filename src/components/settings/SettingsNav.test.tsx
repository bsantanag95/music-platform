import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SettingsNav } from "./SettingsNav";
import { SETTINGS_DEFAULT_HREF, SETTINGS_SCREENS } from "./settings-screens";

const nav = vi.hoisted(() => ({ pathname: "/me/settings/profile" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => nav.pathname,
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  nav.pathname = "/me/settings/profile";
});

describe("settings-screens", () => {
  it("la pantalla de aterrizaje es Perfil", () => {
    expect(SETTINGS_DEFAULT_HREF).toBe("/me/settings/profile");
  });

  it("lista las cinco pantallas de ajustes, con Cuenta y seguridad al final", () => {
    expect(SETTINGS_SCREENS.map((screen) => screen.id)).toEqual([
      "profile",
      "curation",
      "privacy",
      "network",
      "account",
    ]);
  });
});

describe("SettingsNav", () => {
  it("lista una pantalla por tipo de ajuste con su ruta propia", () => {
    renderWithIntl(<SettingsNav screens={SETTINGS_SCREENS} />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/me/settings/profile",
      "/me/settings/curation",
      "/me/settings/privacy",
      "/me/settings/network",
      "/me/settings/account",
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      "Perfil",
      "Curaduría",
      "Privacidad y audiencia",
      "Red",
      "Cuenta y seguridad",
    ]);
  });

  it("marca como actual solo la pantalla de la ruta", () => {
    nav.pathname = "/me/settings/privacy";
    renderWithIntl(<SettingsNav screens={SETTINGS_SCREENS} />);

    expect(screen.getByRole("link", { name: "Privacidad y audiencia" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Perfil" })).not.toHaveAttribute("aria-current");
  });

  it("es una navegación con nombre accesible", () => {
    renderWithIntl(<SettingsNav screens={SETTINGS_SCREENS} />);
    expect(screen.getByRole("navigation", { name: "Secciones de ajustes" })).toBeInTheDocument();
  });

  it("muestra la bandeja de solicitudes en Red solo cuando es mayor que cero", () => {
    const { unmount } = renderWithIntl(<SettingsNav screens={SETTINGS_SCREENS} badges={{ network: 3 }} />);
    expect(screen.getByRole("link", { name: /Red/ })).toHaveTextContent("3");
    unmount();

    renderWithIntl(<SettingsNav screens={SETTINGS_SCREENS} badges={{ network: 0 }} />);
    expect(screen.getByRole("link", { name: "Red" })).toBeInTheDocument();
  });
});
