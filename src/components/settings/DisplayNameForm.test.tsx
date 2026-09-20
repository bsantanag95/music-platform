import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { DisplayNameForm } from "./DisplayNameForm";

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
  return { apiFetch: vi.fn(), ApiError, refresh: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

beforeEach(() => vi.clearAllMocks());

const bodyOfCall = () => JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);

describe("DisplayNameForm", () => {
  it("muestra el nombre actual y el @usuario como ayuda", () => {
    renderWithIntl(<DisplayNameForm initialDisplayName="Ana" username="ana_p" />);

    expect(screen.getByLabelText("Nombre visible")).toHaveValue("Ana");
    expect(screen.getByText(/@ana_p/)).toBeInTheDocument();
  });

  it("limita el nombre a 50 caracteres", () => {
    renderWithIntl(<DisplayNameForm initialDisplayName={null} username="ana_p" />);
    expect(screen.getByLabelText("Nombre visible")).toHaveAttribute("maxlength", "50");
  });

  it("guardar arranca deshabilitado sin cambios", () => {
    renderWithIntl(<DisplayNameForm initialDisplayName="Ana" username="ana_p" />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("guarda el nombre recortado vía PATCH y refresca el árbol de servidor", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ user: { displayName: "Ana Pérez" } });
    renderWithIntl(<DisplayNameForm initialDisplayName="Ana" username="ana_p" />);

    await user.clear(screen.getByLabelText("Nombre visible"));
    await user.type(screen.getByLabelText("Nombre visible"), "  Ana Pérez  ");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile");
    expect((init as RequestInit).method).toBe("PATCH");
    expect(bodyOfCall()).toEqual({ displayName: "Ana Pérez" });
    expect(await screen.findByRole("status")).toHaveTextContent("Guardado");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    // Tras guardar el botón vuelve a deshabilitarse hasta un cambio nuevo.
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("vaciar el nombre envía cadena vacía y deja el campo vacío", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ user: { displayName: null } });
    renderWithIntl(<DisplayNameForm initialDisplayName="Ana" username="ana_p" />);

    await user.clear(screen.getByLabelText("Nombre visible"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(bodyOfCall()).toEqual({ displayName: "" });
    await waitFor(() => expect(screen.getByLabelText("Nombre visible")).toHaveValue(""));
  });

  it("ante un error conserva el texto, muestra la alerta y no refresca", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR", 400, "x"));
    renderWithIntl(<DisplayNameForm initialDisplayName="Ana" username="ana_p" />);

    await user.type(screen.getByLabelText("Nombre visible"), " Pérez");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre visible")).toHaveValue("Ana Pérez");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
