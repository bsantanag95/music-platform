import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AuthForm } from "./AuthForm";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  push: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

describe("AuthForm", () => {
  it("un alta exitosa lleva a /welcome (onboarding de dos puertas)", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();
    mocks.apiFetch.mockResolvedValueOnce({ user: { id: "u1", username: "ana", email: "a@b.c", displayName: null } });
    renderWithIntl(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText("Nombre de usuario"), "ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(mocks.push).toHaveBeenCalledWith("/welcome");
  });

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
