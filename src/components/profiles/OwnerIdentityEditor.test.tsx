import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerIdentityEditor } from "./OwnerIdentityEditor";

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
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

const emptyInitial = { bio: null, pronouns: null, location: null, timezone: null };

beforeEach(() => vi.clearAllMocks());

describe("OwnerIdentityEditor", () => {
  it("guarda los campos recortados vía PATCH", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ user: {} });
    renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

    await user.type(screen.getByLabelText("Bio"), "Colecciono casetes");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const body = JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);
    expect(body).toMatchObject({ bio: "Colecciono casetes" });
    expect(screen.getByRole("status")).toHaveTextContent("Guardado");
  });

  it("el botón guardar arranca deshabilitado sin cambios", () => {
    renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, bio: "hola" }} />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("ante un error conserva el texto y muestra la alerta", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR", 400, "x"));
    renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

    await user.type(screen.getByLabelText("Pronombres"), "elle");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText("Pronombres")).toHaveValue("elle");
  });
});
