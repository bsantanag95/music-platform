import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import authEs from "../../../messages/es/auth.json";
import { EmailVerificationNotice } from "./EmailVerificationNotice";

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

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

describe("EmailVerificationNotice", () => {
  it("no renderiza nada si el email ya está verificado", () => {
    renderWithIntl(<EmailVerificationNotice verified />);
    expect(screen.queryByText(authEs.verifyEmailBannerTitle)).not.toBeInTheDocument();
  });

  it("muestra el aviso y reenvía", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValueOnce({ ok: true });
    renderWithIntl(<EmailVerificationNotice verified={false} />);
    expect(screen.getByText(authEs.verifyEmailBannerTitle)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: authEs.verifyEmailResend }));
    expect(await screen.findByText(authEs.verifyEmailResent)).toBeInTheDocument();
  });

  it("maneja que el email ya esté verificado al reenviar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValueOnce(new mocks.ApiError("EMAIL_ALREADY_VERIFIED"));
    renderWithIntl(<EmailVerificationNotice verified={false} />);
    await user.click(screen.getByRole("button", { name: authEs.verifyEmailResend }));
    expect(await screen.findByText(authEs.verifyEmailAlreadyVerified)).toBeInTheDocument();
  });

  it("muestra el título y descripción de bienvenida con variante welcome", () => {
    renderWithIntl(<EmailVerificationNotice verified={false} variant="welcome" />);
    expect(screen.getByText(authEs.verifyEmailWelcomeTitle)).toBeInTheDocument();
    expect(screen.getByText(authEs.verifyEmailWelcomeDescription)).toBeInTheDocument();
  });

  it("muestra el título y descripción compactos con variante home", () => {
    renderWithIntl(<EmailVerificationNotice verified={false} variant="home" />);
    expect(screen.getByText(authEs.verifyEmailHomeTitle)).toBeInTheDocument();
    expect(screen.getByText(authEs.verifyEmailHomeDescription)).toBeInTheDocument();
  });

  it("no renderiza nada con variante welcome si el email está verificado", () => {
    renderWithIntl(<EmailVerificationNotice verified variant="welcome" />);
    expect(screen.queryByText(authEs.verifyEmailWelcomeTitle)).not.toBeInTheDocument();
  });

  it("no renderiza nada con variante home si el email está verificado", () => {
    renderWithIntl(<EmailVerificationNotice verified variant="home" />);
    expect(screen.queryByText(authEs.verifyEmailHomeTitle)).not.toBeInTheDocument();
  });
});
