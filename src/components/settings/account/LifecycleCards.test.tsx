import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { LifecycleCards } from "./LifecycleCards";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError, assign: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, assign: mocks.assign } });
});
afterEach(() => Object.defineProperty(window, "location", { configurable: true, value: originalLocation }));

function setup(hasPassword = true) {
  renderWithIntl(<LifecycleCards username="ana" hasPassword={hasPassword} />);
  return userEvent.setup();
}

const body = (call = 0) => JSON.parse((mocks.apiFetch.mock.calls[call]![2] as RequestInit).body as string);

describe("LifecycleCards: estructura", () => {
  it("muestra 'Pausar o salir' con desactivar y exportar, y 'Eliminar cuenta' como zona de peligro aparte", () => {
    setup();
    expect(screen.getByText("Pausar o salir")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desactivar…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar mis datos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar mi cuenta…" })).toBeInTheDocument();
    // Eliminar NO comparte tarjeta con las acciones reversibles.
    const pause = screen.getByRole("heading", { name: "Pausar o salir" }).parentElement!;
    expect(within(pause).getByRole("button", { name: "Desactivar…" })).toBeInTheDocument();
    expect(within(pause).queryByRole("button", { name: "Eliminar mi cuenta…" })).not.toBeInTheDocument();
  });
});

describe("desactivar", () => {
  it("el diálogo explica qué se oculta y qué se conserva, y que se reactiva al iniciar sesión", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Desactivar…" }));

    const dialog = await screen.findByRole("dialog", { name: "Desactivar cuenta" });
    expect(within(dialog).getByText("Se oculta")).toBeInTheDocument();
    expect(within(dialog).getByText("Se conserva")).toBeInTheDocument();
    expect(within(dialog).getByText(/«Cuenta desactivada», sin enlace/)).toBeInTheDocument();
    expect(within(dialog).getByText("Para reactivarla, iniciá sesión. No se pierde nada.")).toBeInTheDocument();
  });

  it("pide la contraseña, desactiva y recarga hacia el inicio de sesión", async () => {
    const user = setup();
    mocks.apiFetch.mockResolvedValue({ ok: true });
    await user.click(screen.getByRole("button", { name: "Desactivar…" }));
    const dialog = await screen.findByRole("dialog", { name: "Desactivar cuenta" });
    const submit = within(dialog).getByRole("button", { name: "Desactivar mi cuenta" });
    expect(submit).toBeDisabled();

    await user.type(within(dialog).getByLabelText("Tu contraseña actual"), "secreta-123");
    await user.click(submit);

    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith("/es/auth/login"));
    expect(mocks.apiFetch.mock.calls[0]![0]).toBe("/api/me/account/deactivate");
    expect(body()).toEqual({ password: "secreta-123" });
  });

  it("una contraseña incorrecta se muestra y no navega", async () => {
    const user = setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INVALID_CREDENTIALS"));
    await user.click(screen.getByRole("button", { name: "Desactivar…" }));
    const dialog = await screen.findByRole("dialog", { name: "Desactivar cuenta" });
    await user.type(within(dialog).getByLabelText("Tu contraseña actual"), "mala");
    await user.click(within(dialog).getByRole("button", { name: "Desactivar mi cuenta" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("no son correctos");
    expect(mocks.assign).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Tu contraseña actual")).toHaveValue("");
  });

  it("una cuenta de Google no pide contraseña y ofrece confirmar con Google si la sesión es antigua", async () => {
    const user = setup(false);
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("REAUTH_REQUIRED"));
    await user.click(screen.getByRole("button", { name: "Desactivar…" }));
    const dialog = await screen.findByRole("dialog", { name: "Desactivar cuenta" });
    expect(within(dialog).queryByLabelText("Tu contraseña actual")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Desactivar mi cuenta" }));

    expect(body()).toEqual({});
    expect(await within(dialog).findByRole("link", { name: "Confirmar con Google" })).toHaveAttribute(
      "href",
      "/api/auth/google/start?intent=reauth&locale=es",
    );
    expect(mocks.assign).not.toHaveBeenCalled();
  });

  it("cancelar no llama a la API", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Desactivar…" }));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
});

describe("eliminar", () => {
  async function openDelete(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta…" }));
    return screen.findByRole("dialog", { name: "Eliminar cuenta" });
  }

  it("lista lo que se borra, advierte que no se deshace y ofrece desactivar como alternativa", async () => {
    const user = setup();
    const dialog = await openDelete(user);
    expect(within(dialog).getByText("Esto no se puede deshacer.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Se borran tus valoraciones, reseñas y comentarios/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Desactivá la cuenta" })).toBeInTheDocument();
  });

  it("'Desactivá la cuenta' cambia al diálogo de desactivar", async () => {
    const user = setup();
    const dialog = await openDelete(user);
    await user.click(within(dialog).getByRole("button", { name: "Desactivá la cuenta" }));
    expect(await screen.findByRole("dialog", { name: "Desactivar cuenta" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Eliminar cuenta" })).not.toBeInTheDocument();
  });

  it("no habilita el botón hasta escribir el usuario exacto y la contraseña", async () => {
    const user = setup();
    const dialog = await openDelete(user);
    const submit = within(dialog).getByRole("button", { name: "Eliminar para siempre" });
    expect(submit).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/Escribí tu usuario \(ana\)/), "an");
    await user.type(within(dialog).getByLabelText("Tu contraseña actual"), "secreta-123");
    expect(submit).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/Escribí tu usuario/), "a");
    expect(submit).toBeEnabled();
  });

  it("elimina con el usuario y la contraseña y recarga hacia el inicio", async () => {
    const user = setup();
    mocks.apiFetch.mockResolvedValue({ ok: true });
    const dialog = await openDelete(user);
    await user.type(within(dialog).getByLabelText(/Escribí tu usuario/), "ana");
    await user.type(within(dialog).getByLabelText("Tu contraseña actual"), "secreta-123");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar para siempre" }));

    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith("/es"));
    const [path, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/me/account");
    expect((init as RequestInit).method).toBe("DELETE");
    expect(body()).toEqual({ username: "ana", password: "secreta-123" });
  });

  it("una cuenta con historial de moderación muestra el aviso localizado y no navega", async () => {
    const user = setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("ACCOUNT_DELETION_BLOCKED"));
    const dialog = await openDelete(user);
    await user.type(within(dialog).getByLabelText(/Escribí tu usuario/), "ana");
    await user.type(within(dialog).getByLabelText("Tu contraseña actual"), "secreta-123");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar para siempre" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("historial de moderación o editorial");
    expect(mocks.assign).not.toHaveBeenCalled();
    // La alternativa reversible sigue a mano.
    expect(within(dialog).getByRole("button", { name: "Desactivá la cuenta" })).toBeInTheDocument();
  });

  it("una cuenta de Google escribe solo el usuario y no envía contraseña", async () => {
    const user = setup(false);
    mocks.apiFetch.mockResolvedValue({ ok: true });
    const dialog = await openDelete(user);
    expect(within(dialog).queryByLabelText("Tu contraseña actual")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Escribí tu usuario/), "ana");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar para siempre" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(body()).toEqual({ username: "ana" });
  });
});

describe("exportar", () => {
  it("descarga el archivo JSON con el nombre del usuario y la fecha, y lo avisa", async () => {
    const user = setup();
    mocks.apiFetch.mockResolvedValue({ version: 1, exportedAt: "2026-09-21T15:00:00.000Z", account: { username: "ana" } });
    const createUrl = vi.fn(() => "blob:fake");
    const revokeUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await user.click(screen.getByRole("button", { name: "Descargar mis datos" }));

    expect(await screen.findByRole("status")).toHaveTextContent("descargaste tus datos");
    expect(mocks.apiFetch.mock.calls[0]![0]).toBe("/api/me/export");
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith("blob:fake");
    click.mockRestore();
  });

  it("el límite de una exportación por minuto se muestra localizado y no descarga nada", async () => {
    const user = setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("RATE_LIMITED"));
    const createUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl });

    await user.click(screen.getByRole("button", { name: "Descargar mis datos" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(createUrl).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Descargar mis datos" })).toBeEnabled();
  });
});
