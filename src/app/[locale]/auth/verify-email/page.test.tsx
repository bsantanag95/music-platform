import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  findValidVerificationToken: vi.fn(),
}));

vi.mock("@/services/auth/email-verification", () => ({
  findValidVerificationToken: mocks.findValidVerificationToken,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/components/auth/VerifyEmailForm", () => ({
  VerifyEmailForm: ({ token }: { token: string }) => <form data-testid={token} />,
}));

import VerifyEmailPage from "./page";

describe("página de verificación de email", () => {
  it("muestra el estado inválido sin token", async () => {
    render(await VerifyEmailPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "verifyEmailInvalidTitle" })).toBeInTheDocument();
    expect(mocks.findValidVerificationToken).not.toHaveBeenCalled();
  });

  it("muestra el estado inválido con un token vencido o inexistente", async () => {
    mocks.findValidVerificationToken.mockResolvedValueOnce(null);
    render(await VerifyEmailPage({ searchParams: Promise.resolve({ token: "bad" }) }));
    expect(screen.getByRole("heading", { name: "verifyEmailInvalidTitle" })).toBeInTheDocument();
  });

  it("muestra el formulario con un token válido", async () => {
    mocks.findValidVerificationToken.mockResolvedValueOnce({ userId: "u1" });
    render(await VerifyEmailPage({ searchParams: Promise.resolve({ token: "tok" }) }));
    expect(screen.getByTestId("tok")).toBeInTheDocument();
  });
});
