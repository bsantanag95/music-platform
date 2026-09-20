import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  findValidResetToken: vi.fn(),
  redirect: vi.fn((target: unknown) => {
    throw new Error(`REDIRECT:${JSON.stringify(target)}`);
  }),
}));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/auth/password-reset", () => ({
  findValidResetToken: mocks.findValidResetToken,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  redirect: mocks.redirect,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/components/auth/AuthForm", () => ({ AuthForm: () => <form /> }));
vi.mock("@/components/auth/ForgotPasswordForm", () => ({
  ForgotPasswordForm: () => <form data-testid="forgot-form" />,
}));
vi.mock("@/components/auth/ResetPasswordForm", () => ({
  ResetPasswordForm: ({ token }: { token: string }) => <form data-testid={token} />,
}));

import LoginPage from "./login/page";
import RegisterPage from "./register/page";
import ForgotPasswordPage from "./forgot-password/page";
import ResetPasswordPage from "./reset-password/page";

describe("páginas de autenticación", () => {
  it("redirige login autenticado al home conservando locale", async () => {
    mocks.resolveSession.mockResolvedValueOnce({ user: { id: "u1" } });

    await expect(LoginPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow(
      'REDIRECT:{"href":"/","locale":"en"}',
    );
  });

  it("redirige registro autenticado al home conservando locale", async () => {
    mocks.resolveSession.mockResolvedValueOnce({ user: { id: "u1" } });

    await expect(RegisterPage({ params: Promise.resolve({ locale: "es" }) })).rejects.toThrow(
      'REDIRECT:{"href":"/","locale":"es"}',
    );
  });

  it("mantiene visibles los enlaces cruzados para una persona anónima", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);

    render(await LoginPage({ params: Promise.resolve({ locale: "es" }) }));
    expect(screen.getByRole("link", { name: "register" })).toHaveAttribute("href", "/auth/register");
  });

  it("enlaza al flujo de olvido de contraseña", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);

    render(await LoginPage({ params: Promise.resolve({ locale: "es" }) }));
    expect(screen.getByRole("link", { name: "forgotPassword" })).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    );
  });

  it("muestra el aviso de éxito al volver del reset", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);

    render(
      await LoginPage({
        params: Promise.resolve({ locale: "es" }),
        searchParams: Promise.resolve({ reset: "1" }),
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("resetSuccess");
  });

  it("muestra el botón de Continuar con Google en login con el locale", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);

    render(await LoginPage({ params: Promise.resolve({ locale: "es" }) }));
    const googleLink = screen.getByRole("link", { name: /continueWithGoogle/i });
    expect(googleLink).toHaveAttribute("href", "/api/auth/google/start?locale=es");
  });

  it("muestra el botón de Continuar con Google en registro con el locale", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);

    render(await RegisterPage({ params: Promise.resolve({ locale: "en" }) }));
    const googleLink = screen.getByRole("link", { name: /continueWithGoogle/i });
    expect(googleLink).toHaveAttribute("href", "/api/auth/google/start?locale=en");
  });

  it("la página de olvido renderiza su formulario", async () => {
    render(await ForgotPasswordPage());
    expect(screen.getByTestId("forgot-form")).toBeInTheDocument();
  });

  it("la página de reset muestra estado inválido sin token", async () => {
    render(await ResetPasswordPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "resetInvalidTitle" })).toBeInTheDocument();
  });

  it("la página de reset muestra el formulario con un token válido", async () => {
    mocks.findValidResetToken.mockResolvedValueOnce({ userId: "u1" });
    render(await ResetPasswordPage({ searchParams: Promise.resolve({ token: "tok" }) }));
    expect(screen.getByTestId("tok")).toBeInTheDocument();
  });
});
