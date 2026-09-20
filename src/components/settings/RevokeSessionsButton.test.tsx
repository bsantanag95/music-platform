import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { RevokeSessionsButton } from "./RevokeSessionsButton";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { apiFetch: vi.fn(), ApiError, push: vi.fn(), refresh: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));

beforeEach(() => vi.clearAllMocks());

describe("RevokeSessionsButton", () => {
  it("pulsar el botón pide confirmación y no cierra nada todavía", async () => {
    const user = userEvent.setup();
    renderWithIntl(<RevokeSessionsButton />);

    await user.click(screen.getByRole("button", { name: "Cerrar todas las sesiones" }));

    expect(await screen.findByRole("dialog", { name: "¿Cerrar todas las sesiones?" })).toBeInTheDocument();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("cancelar no cierra ninguna sesión", async () => {
    const user = userEvent.setup();
    renderWithIntl(<RevokeSessionsButton />);
    await user.click(screen.getByRole("button", { name: "Cerrar todas las sesiones" }));

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.apiFetch).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("confirmar llama a DELETE /api/auth/revoke-all y dirige al inicio de sesión", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ ok: true });
    renderWithIntl(<RevokeSessionsButton />);
    await user.click(screen.getByRole("button", { name: "Cerrar todas las sesiones" }));

    await user.click(await screen.findByRole("button", { name: "Cerrar sesiones" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/auth/revoke-all");
    expect((init as RequestInit).method).toBe("DELETE");
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/auth/login"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("ante un error muestra la alerta y no navega", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<RevokeSessionsButton />);
    await user.click(screen.getByRole("button", { name: "Cerrar todas las sesiones" }));

    await user.click(await screen.findByRole("button", { name: "Cerrar sesiones" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
