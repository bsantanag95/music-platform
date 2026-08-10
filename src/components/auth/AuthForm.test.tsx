import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AuthForm } from "./AuthForm";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

describe("AuthForm", () => {
  it("mapea el código de autenticación al namespace normativo de errores", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("INVALID_CREDENTIALS"));
    renderWithIntl(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Email o nombre de usuario"), "ana");
    await user.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El usuario, email o contraseña no son correctos.");
  });

  it("expone labels, autocomplete y validación accesible", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AuthForm mode="login" />);
    expect(screen.getByLabelText("Email o nombre de usuario")).toHaveAttribute("autocomplete", "username");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
