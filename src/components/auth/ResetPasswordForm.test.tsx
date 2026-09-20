import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import authEs from "../../../messages/es/auth.json";
import errorsEs from "../../../messages/es/errors.json";
import { ResetPasswordForm } from "./ResetPasswordForm";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  push: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

describe("ResetPasswordForm", () => {
  it("no envía si las contraseñas no coinciden", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockClear();
    renderWithIntl(<ResetPasswordForm token="tok" />);
    await user.type(screen.getByLabelText(authEs.newPassword), "unaClaveLarga1");
    await user.type(screen.getByLabelText(authEs.confirmPassword), "otraClaveLarga2");
    await user.click(screen.getByRole("button", { name: authEs.resetSubmit }));
    expect(screen.getByRole("alert")).toHaveTextContent(authEs.passwordMismatch);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("redirige al login tras un reset exitoso", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();
    mocks.apiFetch.mockResolvedValueOnce({ ok: true });
    renderWithIntl(<ResetPasswordForm token="tok" />);
    await user.type(screen.getByLabelText(authEs.newPassword), "unaClaveLarga1");
    await user.type(screen.getByLabelText(authEs.confirmPassword), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: authEs.resetSubmit }));
    expect(mocks.push).toHaveBeenCalledWith("/auth/login?reset=1");
  });

  it("muestra el error de token inválido", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("INVALID_RESET_TOKEN"));
    renderWithIntl(<ResetPasswordForm token="tok" />);
    await user.type(screen.getByLabelText(authEs.newPassword), "unaClaveLarga1");
    await user.type(screen.getByLabelText(authEs.confirmPassword), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: authEs.resetSubmit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      errorsEs.INVALID_RESET_TOKEN.description,
    );
  });

  it("muestra el error de contraseña reusada", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("PASSWORD_REUSED"));
    renderWithIntl(<ResetPasswordForm token="tok" />);
    await user.type(screen.getByLabelText(authEs.newPassword), "unaClaveLarga1");
    await user.type(screen.getByLabelText(authEs.confirmPassword), "unaClaveLarga1");
    await user.click(screen.getByRole("button", { name: authEs.resetSubmit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(errorsEs.PASSWORD_REUSED.description);
  });
});
