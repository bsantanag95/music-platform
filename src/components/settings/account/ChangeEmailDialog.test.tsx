import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ChangeEmailDialog } from "./ChangeEmailDialog";

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

function setup(hasPassword = true) {
  const onRequested = vi.fn();
  const onClose = vi.fn();
  renderWithIntl(
    <ChangeEmailDialog
      open
      onClose={onClose}
      currentEmail="ana@example.com"
      hasPassword={hasPassword}
      onRequested={onRequested}
    />,
  );
  return { onRequested, onClose, user: userEvent.setup() };
}

const submitButton = () => screen.getByRole("button", { name: "Enviar confirmación" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apiFetch.mockResolvedValue({ ok: true });
});

describe("ChangeEmailDialog", () => {
  it("pide el email nuevo y la contraseña actual en una cuenta con contraseña", async () => {
    const { user } = setup();
    expect(screen.getByLabelText("Tu contraseña actual")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email nuevo"), "nuevo@ejemplo.com");
    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText("Tu contraseña actual"), "secreta-123");
    expect(submitButton()).toBeEnabled();
  });

  it("envía el pedido y explica que el email actual no cambia hasta confirmar", async () => {
    const { user, onRequested } = setup();
    await user.type(screen.getByLabelText("Email nuevo"), "nuevo@ejemplo.com");
    await user.type(screen.getByLabelText("Tu contraseña actual"), "secreta-123");

    await user.click(submitButton());

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Enviamos un correo a nuevo@ejemplo.com. Tu email sigue siendo ana@example.com hasta que confirmes.",
    );
    const [path, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/me/account/email");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      newEmail: "nuevo@ejemplo.com",
      locale: "es",
      password: "secreta-123",
    });
    expect(onRequested).toHaveBeenCalledWith("nuevo@ejemplo.com");
  });

  it("valida el formato del email en línea", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Email nuevo"), "no-es-email");
    expect(screen.getByText("Escribí un email válido")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("una contraseña incorrecta se muestra localizada y no cierra el diálogo", async () => {
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INVALID_CREDENTIALS"));
    const { user } = setup();
    await user.type(screen.getByLabelText("Email nuevo"), "nuevo@ejemplo.com");
    await user.type(screen.getByLabelText("Tu contraseña actual"), "mala");

    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("El usuario, email o contraseña no son correctos.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("un email de otra cuenta se rechaza con su mensaje", async () => {
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("EMAIL_TAKEN"));
    const { user } = setup();
    await user.type(screen.getByLabelText("Email nuevo"), "fran@example.com");
    await user.type(screen.getByLabelText("Tu contraseña actual"), "secreta-123");
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("una cuenta de Google no pide contraseña", async () => {
    const { user } = setup(false);
    expect(screen.queryByLabelText("Tu contraseña actual")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Email nuevo"), "nuevo@ejemplo.com");
    expect(submitButton()).toBeEnabled();
    await user.click(submitButton());

    const [, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).not.toHaveProperty("password");
  });

  it("con sesión antigua en una cuenta de Google ofrece 'Confirmar con Google'", async () => {
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("REAUTH_REQUIRED"));
    const { user } = setup(false);
    await user.type(screen.getByLabelText("Email nuevo"), "nuevo@ejemplo.com");

    await user.click(submitButton());

    const link = await screen.findByRole("link", { name: "Confirmar con Google" });
    expect(link).toHaveAttribute("href", "/api/auth/google/start?intent=reauth&locale=es");
  });
});
