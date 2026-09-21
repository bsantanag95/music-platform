import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ChangeUsernameDialog } from "./ChangeUsernameDialog";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError, refresh: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

function availability(result: { available: boolean; reason: string | null }) {
  mocks.apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/me/account/username/availability")) return { valid: true, ...result };
    return { username: "besan_music", nextChangeAt: "2026-10-21T12:00:00.000Z" };
  });
}

function setup(props: Partial<Parameters<typeof ChangeUsernameDialog>[0]> = {}) {
  const onChanged = vi.fn();
  const onClose = vi.fn();
  renderWithIntl(
    <ChangeUsernameDialog
      open
      onClose={onClose}
      currentUsername="besantanag95"
      nextChangeAt={null}
      onChanged={onChanged}
      {...props}
    />,
  );
  return { onChanged, onClose, user: userEvent.setup() };
}

const submitButton = () => screen.getByRole("button", { name: "Cambiar usuario" });

beforeEach(() => vi.clearAllMocks());

describe("ChangeUsernameDialog", () => {
  it("un usuario válido y disponible muestra 'Disponible' y su enlace nuevo, y habilita el botón", async () => {
    availability({ available: true, reason: null });
    const { user } = setup();

    await user.type(screen.getByLabelText("Usuario nuevo"), "besan_music");

    expect(await screen.findByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText("Tu enlace nuevo: /users/besan_music")).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it("valida el formato en el cliente, sin consultar al servidor", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText("Usuario nuevo"), "hola.mundo");

    expect(await screen.findByText("Solo letras, números y guion bajo (sin puntos ni espacios)")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("muy corto y el mismo usuario también se explican sin ir al servidor", async () => {
    const { user } = setup();
    const input = screen.getByLabelText("Usuario nuevo");

    await user.type(input, "ab");
    expect(await screen.findByText("Mínimo 3 caracteres")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "besantanag95");
    expect(await screen.findByText("Ese ya es tu usuario")).toBeInTheDocument();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("un usuario en uso muestra el motivo y deja el botón deshabilitado", async () => {
    availability({ available: false, reason: "taken" });
    const { user } = setup();

    await user.type(screen.getByLabelText("Usuario nuevo"), "fran");

    expect(await screen.findByText("Ese usuario no está disponible")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("avisa del enfriamiento, la redirección y el color del monograma", () => {
    setup();
    expect(screen.getByText("Podés cambiarlo una vez cada 30 días.")).toBeInTheDocument();
    expect(
      screen.getByText("Durante 30 días /users/besantanag95 redirige a tu perfil nuevo y nadie más puede tomar ese usuario."),
    ).toBeInTheDocument();
    expect(screen.getByText("El color de tu monograma cambia, porque se calcula desde el usuario.")).toBeInTheDocument();
  });

  it("confirmar cambia el usuario, refresca y muestra cuándo se puede volver a cambiar", async () => {
    availability({ available: true, reason: null });
    const { user, onChanged } = setup();
    await user.type(screen.getByLabelText("Usuario nuevo"), "besan_music");
    await screen.findByText("Disponible");

    await user.click(submitButton());

    expect(await screen.findByRole("status")).toHaveTextContent("Tu usuario ahora es @besan_music");
    const put = mocks.apiFetch.mock.calls.find(([path]) => path === "/api/me/account/username")!;
    expect((put[2] as RequestInit).method).toBe("PUT");
    expect(JSON.parse((put[2] as RequestInit).body as string)).toEqual({ username: "besan_music" });
    expect(onChanged).toHaveBeenCalledWith("besan_music", "2026-10-21T12:00:00.000Z");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("dentro del enfriamiento no deja escribir y explica hasta cuándo", () => {
    setup({ nextChangeAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() });
    expect(screen.getByText(/Ya cambiaste tu usuario hace poco/)).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario nuevo")).toBeDisabled();
    expect(submitButton()).toBeDisabled();
  });

  it("un error del servidor al guardar se muestra localizado y permite reintentar", async () => {
    mocks.apiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/me/account/username/availability")) return { valid: true, available: true, reason: null };
      throw new mocks.ApiError("USERNAME_CHANGE_COOLDOWN");
    });
    const { user } = setup();
    await user.type(screen.getByLabelText("Usuario nuevo"), "besan_music");
    await screen.findByText("Disponible");

    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Solo podés cambiar tu usuario una vez cada 30 días.");
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it("cancelar cierra sin cambiar nada", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
});
