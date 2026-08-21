import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { PrivacySettings } from "./PrivacySettings";

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

describe("PrivacySettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste el cambio a privado", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({
      user: {
        id: "u1",
        username: "ana",
        displayName: null,
        email: "ana@example.com",
        profileVisibility: "private",
      },
    });
    renderWithIntl(<PrivacySettings initialVisibility="public" />);

    await user.click(screen.getByRole("radio", { name: /Privado/ }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/me/profile",
        expect.anything(),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ profileVisibility: "private" }),
        }),
      ),
    );
  });

  it("muestra el error localizado si la persistencia falla", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("AUTH_REQUIRED", 401, "x"));
    renderWithIntl(<PrivacySettings initialVisibility="public" />);

    await user.click(screen.getByRole("radio", { name: /Privado/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Iniciá sesión para realizar esta acción.",
    );
  });
});