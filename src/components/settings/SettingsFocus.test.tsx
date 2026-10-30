import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { SettingsFocus } from "./SettingsFocus";
import { SettingsSection } from "./SettingsSection";

const nav = vi.hoisted(() => ({ pathname: "/me/settings/profile" }));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => nav.pathname }));

describe("SettingsFocus", () => {
  it("no mueve el foco en la carga inicial y lo lleva al título de la pantalla nueva", async () => {
    nav.pathname = "/me/settings/profile";
    const { rerender } = render(
      <>
        <button type="button">menú</button>
        <SettingsFocus />
        <SettingsSection title="Perfil">contenido</SettingsSection>
      </>,
    );
    expect(document.activeElement).toBe(document.body);

    // La ruta cambia mientras el título anterior sigue montado (como con `loading.tsx`): no se enfoca ese.
    nav.pathname = "/me/settings/notifications";
    act(() => {
      rerender(
        <>
          <button type="button">menú</button>
          <SettingsFocus />
          <SettingsSection title="Perfil">contenido</SettingsSection>
        </>,
      );
    });
    expect(document.activeElement).toBe(document.body);

    // Llega la pantalla nueva (otro nodo): el foco va a su título.
    await act(async () => {
      rerender(
        <>
          <button type="button">menú</button>
          <SettingsFocus />
          <SettingsSection key="notifications" title="Notificaciones">
            contenido
          </SettingsSection>
        </>,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(document.activeElement).toHaveTextContent("Notificaciones");
    expect(document.activeElement?.tagName).toBe("H2");
  });
});
