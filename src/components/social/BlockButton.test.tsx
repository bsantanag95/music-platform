import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { BlockButton } from "./BlockButton";

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

vi.mock("@/lib/api/client", () => ({
  apiFetch: mocks.apiFetch,
  ApiError: mocks.ApiError,
}));

describe("BlockButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("bloquea tras confirmar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ blocked: true });
    renderWithIntl(<BlockButton username="pato" blocked={false} />);

    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users/pato/block",
        expect.anything(),
        { method: "PUT" },
      ),
    );
    expect(await screen.findByRole("button", { name: "Desbloquear" })).toBeInTheDocument();
  });

  it("no bloquea si se cancela la confirmación", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithIntl(<BlockButton username="pato" blocked={false} />);

    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("desbloquea sin confirmación", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ blocked: false });
    renderWithIntl(<BlockButton username="pato" blocked />);

    await user.click(screen.getByRole("button", { name: "Desbloquear" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users/pato/block",
        expect.anything(),
        { method: "DELETE" },
      ),
    );
    expect(await screen.findByRole("button", { name: "Bloquear" })).toBeInTheDocument();
  });

  it("muestra el error localizado según ApiError.code", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("RELATION_INVALID", 400, "x"));
    renderWithIntl(<BlockButton username="pato" blocked={false} />);

    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede realizar esta operación con tu propio perfil.",
    );
  });
});