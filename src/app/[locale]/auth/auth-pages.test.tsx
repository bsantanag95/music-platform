import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  redirect: vi.fn((target: unknown) => {
    throw new Error(`REDIRECT:${JSON.stringify(target)}`);
  }),
}));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
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

import LoginPage from "./login/page";
import RegisterPage from "./register/page";

describe("páginas de autenticación", () => {
  it("redirige login autenticado al buscador conservando locale", async () => {
    mocks.resolveSession.mockResolvedValueOnce({ user: { id: "u1" } });

    await expect(LoginPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow(
      'REDIRECT:{"href":"/search","locale":"en"}',
    );
  });

  it("redirige registro autenticado al buscador conservando locale", async () => {
    mocks.resolveSession.mockResolvedValueOnce({ user: { id: "u1" } });

    await expect(RegisterPage({ params: Promise.resolve({ locale: "es" }) })).rejects.toThrow(
      'REDIRECT:{"href":"/search","locale":"es"}',
    );
  });

  it("mantiene visibles los enlaces cruzados para una persona anónima", async () => {
    mocks.resolveSession.mockResolvedValueOnce(null);

    render(await LoginPage({ params: Promise.resolve({ locale: "es" }) }));
    expect(screen.getByRole("link")).toHaveAttribute("href", "/auth/register");
  });
});
