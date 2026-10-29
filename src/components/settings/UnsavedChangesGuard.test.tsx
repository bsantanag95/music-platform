import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { useReportDirty } from "@/components/profiles/editor-host";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";
import { SettingsEditorCard } from "./SettingsEditorCard";
import { SettingsSectionIndex } from "./SettingsSectionIndex";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// Un editor mínimo que informa su estado por el mismo contrato que los editores del dueño.
function FakeEditor() {
  const [value, setValue] = useState("");
  useReportDirty(value !== "");
  return (
    <>
      <input aria-label="bio" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button" onClick={() => setValue("")}>
        guardar
      </button>
    </>
  );
}

function Screen() {
  return (
    <UnsavedChangesGuard>
      {/* Un `<a>` como el que renderiza `Link`: el guardián escucha los clics del documento, no el componente. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/es/me/settings/account">Cuenta</a>
      <a href="#settings-identity">ancla</a>
      <SettingsSectionIndex
        sections={[
          { id: "identity", label: "Tu identidad" },
          { id: "links", label: "Enlaces" },
        ]}
      />
      <SettingsEditorCard id="identity" label="Tu identidad">
        <FakeEditor />
      </SettingsEditorCard>
    </UnsavedChangesGuard>
  );
}

describe("cambios sin guardar en Ajustes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin cambios, los enlaces navegan sin preguntar", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Screen />);
    await user.click(screen.getByRole("link", { name: "Cuenta" }));
    expect(screen.queryByText("¿Salir sin guardar?")).toBeNull();
  });

  it("la tarjeta y el índice marcan los cambios; salir pide confirmar y cancelar se queda", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Screen />);
    await user.type(screen.getByRole("textbox", { name: "bio" }), "hola");

    expect(screen.getByRole("region", { name: "Tu identidad" })).toHaveTextContent("Cambios sin guardar");
    expect(screen.getByRole("link", { name: /Tu identidad/ }).querySelector("span")).not.toBeNull();

    await user.click(screen.getByRole("link", { name: "Cuenta" }));
    expect(screen.getByText("¿Salir sin guardar?")).toBeInTheDocument();
    expect(screen.getByText(/Tienes cambios sin guardar en: Tu identidad/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "bio" })).toHaveValue("hola");
  });

  it("confirmar navega con el router", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Screen />);
    await user.type(screen.getByRole("textbox", { name: "bio" }), "hola");
    await user.click(screen.getByRole("link", { name: "Cuenta" }));
    await user.click(screen.getByRole("button", { name: "Salir sin guardar" }));
    expect(router.push).toHaveBeenCalledWith("/es/me/settings/account");
  });

  it("las anclas de la misma página no preguntan; guardar quita la marca", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Screen />);
    await user.type(screen.getByRole("textbox", { name: "bio" }), "hola");
    await user.click(screen.getByRole("link", { name: "ancla" }));
    expect(screen.queryByText("¿Salir sin guardar?")).toBeNull();

    await user.click(screen.getByRole("button", { name: "guardar" }));
    expect(screen.getByRole("region", { name: "Tu identidad" })).not.toHaveTextContent("Cambios sin guardar");
  });

  it("con cambios, cerrar la pestaña pide la confirmación del navegador", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Screen />);
    const before = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(before);
    });
    expect(before.defaultPrevented).toBe(false);

    await user.type(screen.getByRole("textbox", { name: "bio" }), "x");
    const after = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(after);
    });
    expect(after.defaultPrevented).toBe(true);
  });
});
