import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import authEs from "../../../messages/es/auth.json";
import errorsEs from "../../../messages/es/errors.json";
import { ChangeEmailForm } from "./ChangeEmailForm";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

describe("ChangeEmailForm", () => {
  it("confirma con el token del enlace y muestra el estado de éxito", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValueOnce({ ok: true, email: "nuevo@ejemplo.com" });
    renderWithIntl(<ChangeEmailForm token="tok" />);

    await user.click(screen.getByRole("button", { name: authEs.changeEmailConfirmButton }));

    expect(await screen.findByText(authEs.changeEmailSuccessTitle)).toBeInTheDocument();
    const [path, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/auth/email/change/confirm");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ token: "tok" });
  });

  it("muestra el error localizado si el enlace venció", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("INVALID_VERIFICATION_TOKEN"));
    renderWithIntl(<ChangeEmailForm token="tok" />);

    await user.click(screen.getByRole("button", { name: authEs.changeEmailConfirmButton }));

    expect(await screen.findByRole("alert")).toHaveTextContent(errorsEs.INVALID_VERIFICATION_TOKEN.description);
  });

  it("muestra el error de email tomado y permite reintentar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("EMAIL_TAKEN"));
    renderWithIntl(<ChangeEmailForm token="tok" />);

    await user.click(screen.getByRole("button", { name: authEs.changeEmailConfirmButton }));

    expect(await screen.findByRole("alert")).toHaveTextContent(errorsEs.EMAIL_TAKEN.description);
    expect(screen.getByRole("button", { name: authEs.changeEmailConfirmButton })).toBeEnabled();
  });
});
