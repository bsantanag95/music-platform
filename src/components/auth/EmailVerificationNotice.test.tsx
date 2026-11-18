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

  // openspec: redesign-signed-in-home-phase1
  it("en línea es una frase con la acción de reenvío, rotulada como aviso", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ ok: true });
    renderWithIntl(<EmailVerificationNotice verified={false} variant="inline" />);
    expect(screen.getByRole("status", { name: authEs.verifyEmailHomeTitle })).toHaveTextContent(authEs.verifyEmailHomeDescription);
    await user.click(screen.getByRole("button", { name: authEs.verifyEmailResend }));
    expect(await screen.findByText(authEs.verifyEmailResent)).toBeInTheDocument();
  });

  it("no renderiza nada con variante welcome si el email está verificado", () => {
    renderWithIntl(<EmailVerificationNotice verified variant="welcome" />);
    expect(screen.queryByText(authEs.verifyEmailWelcomeTitle)).not.toBeInTheDocument();
  });

  it("no renderiza nada en línea si el email está verificado", () => {
    renderWithIntl(<EmailVerificationNotice verified variant="inline" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
