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
vi.mock("@/components/auth/AuthForm", () => ({
  AuthForm: ({ passwordAside }: { passwordAside?: React.ReactNode }) => <form>{passwordAside}</form>,
}));
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

  it("los enlaces cruzados conservan la intención de Lámina", async () => {
    const searchParams = Promise.resolve({ lamina: "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f" });
    mocks.resolveSession.mockResolvedValue(null);

    const login = render(await LoginPage({ params: Promise.resolve({ locale: "es" }), searchParams }));
    expect(screen.getByRole("link", { name: "register" })).toHaveAttribute("href", "/auth/register?lamina=8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f");
    login.unmount();

    render(await RegisterPage({ params: Promise.resolve({ locale: "es" }), searchParams }));
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/auth/login?lamina=8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f");
    mocks.resolveSession.mockReset();
  });

  it("la intención de discografía también se conserva y, con sesión, lleva a la propia", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);
    render(await RegisterPage({ params: Promise.resolve({ locale: "es" }), searchParams: Promise.resolve({ discografia: "10000000-0000-4000-8000-000000000001" }) }));
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/auth/login?discografia=10000000-0000-4000-8000-000000000001");

    mocks.resolveSession.mockResolvedValueOnce({ user: { id: "u1", username: "ana" } });
    await expect(
      LoginPage({ params: Promise.resolve({ locale: "es" }), searchParams: Promise.resolve({ discografia: "10000000-0000-4000-8000-000000000001" }) }),
    ).rejects.toThrow('REDIRECT:{"href":"/users/ana/artist/10000000-0000-4000-8000-000000000001?valorar=1","locale":"es"}');
  });

  it("la intención de año se conserva y, con sesión, lleva al año propio", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);
    render(await RegisterPage({ params: Promise.resolve({ locale: "es" }), searchParams: Promise.resolve({ anio: "2026" }) }));
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/auth/login?anio=2026");

    mocks.resolveSession.mockResolvedValueOnce({ user: { id: "u1", username: "ana" } });
    await expect(
      LoginPage({ params: Promise.resolve({ locale: "es" }), searchParams: Promise.resolve({ anio: "2026" }) }),
    ).rejects.toThrow('REDIRECT:{"href":"/users/ana/year/2026","locale":"es"}');
  });

  it("una intención inválida se descarta", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);

    render(await RegisterPage({ params: Promise.resolve({ locale: "es" }), searchParams: Promise.resolve({ lamina: "https://otro.example" }) }));
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/auth/login");
  });

  it("con sesión y la intención va directo a armarla", async () => {
    mocks.resolveSession.mockResolvedValueOnce({ user: { id: "u1" } });

    await expect(
      RegisterPage({ params: Promise.resolve({ locale: "es" }), searchParams: Promise.resolve({ lamina: "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f" }) }),
    ).rejects.toThrow('REDIRECT:{"href":"/me/laminas?desde=8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f","locale":"es"}');
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
