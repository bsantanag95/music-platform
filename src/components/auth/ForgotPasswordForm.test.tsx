import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import authEs from "../../../messages/es/auth.json";
import errorsEs from "../../../messages/es/errors.json";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

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
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

describe("ForgotPasswordForm", () => {
  it("muestra el mensaje genérico tras enviar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValueOnce({ ok: true });
    renderWithIntl(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: authEs.forgotSubmit }));
    expect(await screen.findByText(authEs.forgotSent)).toBeInTheDocument();
  });

  it("valida el email antes de enviar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockClear();
    renderWithIntl(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "no-es-email");
    await user.click(screen.getByRole("button", { name: authEs.forgotSubmit }));
    expect(screen.getByRole("alert")).toHaveTextContent(authEs.validation);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("mapea RATE_LIMITED al namespace de errores", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("RATE_LIMITED"));
    renderWithIntl(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: authEs.forgotSubmit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(errorsEs.RATE_LIMITED.description);
  });
});
