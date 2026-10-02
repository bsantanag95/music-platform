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

  async function submitLogin(user: ReturnType<typeof userEvent.setup>) {
    renderWithIntl(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Email o nombre de usuario"), "ana");
    await user.type(screen.getByLabelText("Contraseña"), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  }

  it("un login con idioma preferido distinto lleva a Inicio en ese idioma", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();
    mocks.apiFetch.mockResolvedValueOnce({
      user: { id: "u1", username: "ana", email: "a@b.c", displayName: null, locale: "en" },
    });
    await submitLogin(user);
    expect(mocks.push).toHaveBeenCalledWith("/", { locale: "en" });
  });

  it("un login con el mismo idioma o sin preferencia se queda en el idioma actual", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();
    mocks.apiFetch.mockResolvedValueOnce({
      user: { id: "u1", username: "ana", email: "a@b.c", displayName: null, locale: null },
    });
    await submitLogin(user);
    expect(mocks.push).toHaveBeenCalledWith("/");
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

  it("expone labels, autocomplete y validación accesible por campo", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockClear();
    renderWithIntl(<AuthForm mode="login" />);
    const identifier = screen.getByLabelText("Email o nombre de usuario");
    expect(identifier).toHaveAttribute("autocomplete", "username");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(identifier).toHaveAttribute("aria-invalid", "true");
    expect(identifier).toHaveFocus();
    expect(identifier).toHaveAccessibleDescription("Ingresá tu email o nombre de usuario.");
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription("Ingresá tu contraseña.");
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("el error de un campo se va al volver a escribir en él", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AuthForm mode="login" />);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    const identifier = screen.getByLabelText("Email o nombre de usuario");
    await user.type(identifier, "a");
    expect(identifier).not.toHaveAttribute("aria-invalid");
  });

  it("explica qué falla en el registro (usuario, email y contraseña corta)", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText("Nombre de usuario"), "a b");
    await user.type(screen.getByLabelText("Email"), "no-es-email");
    await user.type(screen.getByLabelText("Contraseña"), "corta");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(screen.getByLabelText("Nombre de usuario")).toHaveAccessibleDescription(
      "Usá solo letras, números y guion bajo (_).",
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Ingresá un email válido, como nombre@ejemplo.com.",
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription("Usá al menos 8 caracteres.");
  });

  it("un usuario ya tomado se muestra en su campo, no como error del formulario", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("USERNAME_TAKEN"));
    renderWithIntl(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText("Nombre de usuario"), "ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    const username = await screen.findByLabelText("Nombre de usuario");
    expect(username).toHaveAccessibleDescription("Elegí otro nombre de usuario.");
    expect(username).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostrar la contraseña alterna con un clic y es operable con teclado", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AuthForm mode="login" />);
    const password = screen.getByLabelText("Contraseña");
    expect(password).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Mostrar contraseña" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("renderiza el enlace de contraseña olvidada junto a la etiqueta", () => {
    renderWithIntl(<AuthForm mode="login" passwordAside={<span>¿Olvidaste?</span>} />);
    expect(screen.getByText("¿Olvidaste?")).toBeInTheDocument();
  });
});
