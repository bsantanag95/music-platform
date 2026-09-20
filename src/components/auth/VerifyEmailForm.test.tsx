import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import authEs from "../../../messages/es/auth.json";
import errorsEs from "../../../messages/es/errors.json";
import { VerifyEmailForm } from "./VerifyEmailForm";

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

describe("VerifyEmailForm", () => {
  it("muestra el estado de éxito tras verificar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValueOnce({ ok: true });
    renderWithIntl(<VerifyEmailForm token="tok" />);
    await user.click(screen.getByRole("button", { name: authEs.verifyEmailCta }));
    expect(await screen.findByText(authEs.verifyEmailSuccessTitle)).toBeInTheDocument();
  });

  it("muestra el error de token inválido", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("INVALID_VERIFICATION_TOKEN"));
    renderWithIntl(<VerifyEmailForm token="tok" />);
    await user.click(screen.getByRole("button", { name: authEs.verifyEmailCta }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      errorsEs.INVALID_VERIFICATION_TOKEN.description,
    );
  });
});
