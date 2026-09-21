import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { LanguagePreference } from "./LanguagePreference";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError, replace: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/me/settings/account",
  useRouter: () => ({ replace: mocks.replace }),
}));

beforeEach(() => vi.clearAllMocks());

describe("LanguagePreference", () => {
  it("marca el idioma actual", () => {
    renderWithIntl(<LanguagePreference />, "es");
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");
  });

  it("elegir English lo guarda en la cuenta y navega a la misma pantalla en inglés", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ locale: "en" });
    renderWithIntl(<LanguagePreference />, "es");

    await user.click(screen.getByRole("button", { name: "English" }));

    const [path, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/me/preferences");
    expect((init as RequestInit).method).toBe("PATCH");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ locale: "en" });
    // scroll: false — cambiar de idioma no debe llevar al inicio de la pantalla.
    expect(mocks.replace).toHaveBeenCalledWith("/me/settings/account", { locale: "en", scroll: false });
  });

  it("elegir el idioma actual no hace nada", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguagePreference />, "es");
    await user.click(screen.getByRole("button", { name: "Español" }));
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("si guardar falla no navega y muestra el error localizado", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR"));
    renderWithIntl(<LanguagePreference />, "es");

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
