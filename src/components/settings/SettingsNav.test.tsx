import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { act, screen } from "@testing-library/react";
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

  it("lista las seis pantallas de ajustes, con Cuenta y seguridad al final", () => {
    expect(SETTINGS_SCREENS.map((screen) => screen.id)).toEqual([
      "profile",
      "curation",
      "privacy",
      "network",
      "notifications",
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
      "/me/settings/notifications",
      "/me/settings/account",
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      "Perfil",
      "Curaduría",
      "Privacidad y audiencia",
      "Red",
      "Notificaciones",
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
  it("en una fila con scroll lleva la pantalla activa a la vista, y otra vez al cambiar de pantalla", () => {
    const scrollIntoView = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const widths = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(600);
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(340);
    try {
      // Un contenedor que vuelve a renderizar el menú tras cambiar la ruta simulada (con `rerender` se perdería el
      // proveedor de traducciones).
      function Harness() {
        const [, setTick] = useState(0);
        return (
          <>
            <button
              type="button"
              onClick={() => {
                nav.pathname = "/me/settings/privacy";
                setTick((tick) => tick + 1);
              }}
            >
              ir
            </button>
            <SettingsNav screens={SETTINGS_SCREENS} />
          </>
        );
      }
      nav.pathname = "/me/settings/account";
      renderWithIntl(<Harness />);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
      expect(scrollIntoView.mock.contexts[0]).toHaveAttribute("href", "/me/settings/account");

      act(() => screen.getByRole("button", { name: "ir" }).click());
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(scrollIntoView.mock.contexts[1]).toHaveAttribute("href", "/me/settings/privacy");
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
      widths.mockRestore();
      client.mockRestore();
    }
  });

  it("como columna (sin scroll) no desplaza nada", () => {
    const scrollIntoView = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      renderWithIntl(<SettingsNav screens={SETTINGS_SCREENS} />);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
  });
  it("muestra el estado bajo cada entrada, con el aviso en tono de alerta", () => {
    renderWithIntl(
      <SettingsNav
        screens={SETTINGS_SCREENS}
        statuses={{
          privacy: { text: "Perfil privado", tone: "muted" },
          account: { text: "Email sin verificar", tone: "warn" },
        }}
      />,
    );
    expect(screen.getByRole("link", { name: /Privacidad y audiencia\s*Perfil privado/ })).toBeInTheDocument();
    expect(screen.getByText("Email sin verificar")).toHaveClass("text-amber");
    expect(screen.getByText("Perfil privado")).toHaveClass("hidden", "md:block");
  });
});
