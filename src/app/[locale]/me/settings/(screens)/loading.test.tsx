import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import SettingsLoading from "./loading";
import { settingsMetadata } from "@/components/settings/settings-metadata";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) =>
    ({ "settings.loading": "Cargando ajustes…", "settings.title": "Ajustes", "settings.nav.account": "Cuenta y seguridad" })[
      key
    ] ?? key,
  ),
}));

describe("área de ajustes", () => {
  it("el esqueleto de carga se anuncia una sola vez como ocupado", async () => {
    const { getByLabelText, container } = render(await SettingsLoading());
    expect(getByLabelText("Cargando ajustes…")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
  });

  it("cada pantalla se titula «<Pantalla> · Ajustes»", async () => {
    await expect(settingsMetadata("account")).resolves.toEqual({ title: "Cuenta y seguridad · Ajustes" });
  });
});
