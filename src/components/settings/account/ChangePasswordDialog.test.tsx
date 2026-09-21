import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

function setup(mode: "change" | "create") {
  const onSaved = vi.fn();
  renderWithIntl(<ChangePasswordDialog open onClose={vi.fn()} mode={mode} onSaved={onSaved} />);
  return { onSaved, user: userEvent.setup() };
}

const submit = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apiFetch.mockResolvedValue({ ok: true });
});

describe("ChangePasswordDialog: cambiar", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>, next = "nueva-clave-1", repeat = next) {
    await user.type(screen.getByLabelText("Tu contraseña actual"), "actual-123");
    await user.type(screen.getByLabelText("Contraseña nueva"), next);
    await user.type(screen.getByLabelText("Repetí la contraseña nueva"), repeat);
  }

  it("valida en línea el largo mínimo y que coincidan", async () => {
    const { user } = setup("change");

    await user.type(screen.getByLabelText("Contraseña nueva"), "corta");
    expect(screen.getByText("Mínimo 8 caracteres")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Contraseña nueva"));
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva-clave-1");
    await user.type(screen.getByLabelText("Repetí la contraseña nueva"), "otra-clave-9");
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(submit("Cambiar contraseña")).toBeDisabled();
  });

  it("envía la actual y la nueva, con el cierre de las otras sesiones marcado por defecto", async () => {
    const { user, onSaved } = setup("change");
    await fill(user);

    expect(screen.getByLabelText("Cerrar mis otras sesiones (recomendado)")).toBeChecked();
    await user.click(submit("Cambiar contraseña"));

    expect(await screen.findByRole("status")).toHaveTextContent("Contraseña actualizada. Cerramos tus otras sesiones.");
    const [path, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/me/account/password");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      currentPassword: "actual-123",
      newPassword: "nueva-clave-1",
      revokeOtherSessions: true,
      locale: "es",
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("desmarcar la opción no cierra las otras sesiones", async () => {
    const { user } = setup("change");
    await fill(user);
    await user.click(screen.getByLabelText("Cerrar mis otras sesiones (recomendado)"));
    await user.click(submit("Cambiar contraseña"));

    expect(await screen.findByRole("status")).toHaveTextContent("Contraseña actualizada.");
    const [, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string).revokeOtherSessions).toBe(false);
  });

  it("una contraseña actual incorrecta se muestra localizada y conserva lo demás", async () => {
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INVALID_CREDENTIALS"));
    const { user } = setup("change");
    await fill(user);

    await user.click(submit("Cambiar contraseña"));

    expect(await screen.findByRole("alert")).toHaveTextContent("El usuario, email o contraseña no son correctos.");
    expect(screen.getByLabelText("Contraseña nueva")).toHaveValue("nueva-clave-1");
  });

  it("una contraseña igual a la actual se rechaza con su mensaje", async () => {
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("PASSWORD_REUSED"));
    const { user } = setup("change");
    await fill(user);
    await user.click(submit("Cambiar contraseña"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("ChangePasswordDialog: crear (cuenta de Google)", () => {
  it("no pide la contraseña actual y crea la contraseña", async () => {
    const { user, onSaved } = setup("create");
    expect(screen.queryByLabelText("Tu contraseña actual")).not.toBeInTheDocument();
    expect(screen.getByText(/Así vas a poder entrar con tu email y contraseña/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva-clave-1");
    await user.type(screen.getByLabelText("Repetí la contraseña nueva"), "nueva-clave-1");
    await user.click(submit("Crear contraseña"));

    expect(await screen.findByRole("status")).toHaveTextContent("Ahora podés entrar con email y contraseña");
    const [, , init] = mocks.apiFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ newPassword: "nueva-clave-1", locale: "es" });
    expect(onSaved).toHaveBeenCalled();
  });

  it("con la sesión antigua ofrece confirmar con Google", async () => {
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("REAUTH_REQUIRED"));
    const { user } = setup("create");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva-clave-1");
    await user.type(screen.getByLabelText("Repetí la contraseña nueva"), "nueva-clave-1");

    await user.click(submit("Crear contraseña"));

    expect(await screen.findByRole("link", { name: "Confirmar con Google" })).toHaveAttribute(
      "href",
      "/api/auth/google/start?intent=reauth&locale=es",
    );
  });
});
