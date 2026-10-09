import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AuthForm } from "./AuthForm";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  hardNavigate: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/lib/hard-navigate", () => ({ hardNavigate: mocks.hardNavigate }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

describe("AuthForm", () => {
  it("un alta exitosa lleva a /welcome (onboarding guiado) con una navegación completa", async () => {
    const user = userEvent.setup();
    mocks.hardNavigate.mockClear();
    mocks.apiFetch.mockResolvedValueOnce({ user: { id: "u1", username: "ana", email: "a@b.c", displayName: null } });
    renderWithIntl(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText("Nombre de usuario"), "ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/es/welcome");
    expect(mocks.hardNavigate).toHaveBeenCalledTimes(1);
  });

  async function submitLogin(user: ReturnType<typeof userEvent.setup>) {
    renderWithIntl(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Email o nombre de usuario"), "ana");
    await user.type(screen.getByLabelText("Contraseña"), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  }

  it("un login con idioma preferido distinto lleva a Inicio en ese idioma", async () => {
    const user = userEvent.setup();
    mocks.hardNavigate.mockClear();
    mocks.apiFetch.mockResolvedValueOnce({
      user: { id: "u1", username: "ana", email: "a@b.c", displayName: null, locale: "en" },
    });
    await submitLogin(user);
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/en");
  });

  it("un login con el mismo idioma o sin preferencia se queda en el idioma actual", async () => {
    const user = userEvent.setup();
    mocks.hardNavigate.mockClear();
    mocks.apiFetch.mockResolvedValueOnce({
      user: { id: "u1", username: "ana", email: "a@b.c", displayName: null, locale: null },
    });
    await submitLogin(user);
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/es");
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
    expect(identifier).toHaveAccessibleDescription("Ingresa tu email o nombre de usuario.");
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription("Ingresa tu contraseña.");
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
      "Usa solo letras, números y guion bajo (_).",
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Ingresa un email válido, como nombre@ejemplo.com.",
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription("Usa al menos 8 caracteres.");
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
    expect(username).toHaveAccessibleDescription("Elige otro nombre de usuario.");
    expect(username).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("mantener la sesión iniciada", () => {
    const loginBody = () => JSON.parse(mocks.apiFetch.mock.calls.at(-1)?.[2].body as string) as Record<string, unknown>;

    it("el login ofrece la casilla marcada por defecto, asociada a su etiqueta", () => {
      renderWithIntl(<AuthForm mode="login" />);
      expect(screen.getByLabelText("Mantener la sesión iniciada en este dispositivo")).toBeChecked();
    });

    it("el registro no ofrece la casilla", () => {
      renderWithIntl(<AuthForm mode="register" />);
      expect(screen.queryByLabelText("Mantener la sesión iniciada en este dispositivo")).not.toBeInTheDocument();
    });

    it("con la casilla marcada el login envía remember: true", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValueOnce({ user: { id: "u1", username: "ana", email: "a@b.c", displayName: null } });
      await submitLogin(user);
      expect(loginBody()).toMatchObject({ identifier: "ana", remember: true });
    });

    it("con la casilla desmarcada el login envía remember: false", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValueOnce({ user: { id: "u1", username: "ana", email: "a@b.c", displayName: null } });
      renderWithIntl(<AuthForm mode="login" />);
      await user.type(screen.getByLabelText("Email o nombre de usuario"), "ana");
      await user.type(screen.getByLabelText("Contraseña"), "unaClaveLarga1");
      await user.click(screen.getByLabelText("Mantener la sesión iniciada en este dispositivo"));
      await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
      expect(loginBody()).toMatchObject({ remember: false });
    });

    it("el registro no envía remember", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValueOnce({ user: { id: "u1", username: "ana", email: "a@b.c", displayName: null } });
      renderWithIntl(<AuthForm mode="register" />);
      await user.type(screen.getByLabelText("Nombre de usuario"), "ana");
      await user.type(screen.getByLabelText("Email"), "ana@example.com");
      await user.type(screen.getByLabelText("Contraseña"), "unaClaveLarga1");
      await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
      expect(loginBody()).not.toHaveProperty("remember");
    });

    it("controlada desde fuera avisa del cambio y refleja el valor recibido", async () => {
      const user = userEvent.setup();
      const onRememberChange = vi.fn();
      renderWithIntl(<AuthForm mode="login" remember={false} onRememberChange={onRememberChange} />);
      const checkbox = screen.getByLabelText("Mantener la sesión iniciada en este dispositivo");
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(onRememberChange).toHaveBeenCalledWith(true);
    });
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
