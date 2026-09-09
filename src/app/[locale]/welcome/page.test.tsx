import { beforeEach, describe, expect, it, vi } from "vitest";
import WelcomePage from "./page";
import { TwoDoorOnboarding } from "@/components/onboarding/TwoDoorOnboarding";

const mocks = vi.hoisted(() => ({ resolveSession: vi.fn(), redirect: vi.fn() }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  redirect: (args: unknown) => {
    mocks.redirect(args);
    throw new Error("REDIRECT");
  },
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/components/onboarding/TwoDoorOnboarding", () => ({
  TwoDoorOnboarding: () => null,
}));

const render = () => WelcomePage({ params: Promise.resolve({ locale: "es" }) });

function findType(node: unknown, type: unknown): boolean {
  if (node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((c) => findType(c, type));
  const el = node as { type?: unknown; props?: { children?: unknown } };
  return el.type === type || findType(el.props?.children, type);
}

beforeEach(() => vi.clearAllMocks());

describe("WelcomePage", () => {
  it("redirige al login sin sesión", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    await expect(render()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/auth/login", locale: "es" });
  });

  it("redirige a Inicio si el usuario ya está onboardeado", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { onboardedAt: new Date("2026-01-01") } });
    await expect(render()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/", locale: "es" });
  });

  it("renderiza el flujo de dos puertas si el onboarding está pendiente", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { onboardedAt: null } });
    const tree = await render();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(findType(tree, TwoDoorOnboarding)).toBe(true);
  });
});
