import { beforeEach, describe, expect, it, vi } from "vitest";
import WelcomePage from "./page";
import { WelcomeFlow } from "@/components/onboarding/WelcomeFlow";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  redirect: vi.fn(),
  resolveAudience: vi.fn(),
  exploreEnabled: vi.fn(),
}));

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
vi.mock("@/services/auth/email-verification", () => ({ isEmailVerified: () => false }));
vi.mock("@/services/social/default-audience", () => ({ resolveNewContentAudience: mocks.resolveAudience }));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: mocks.exploreEnabled }));
vi.mock("@/components/onboarding/WelcomeFlow", () => ({
  WelcomeFlow: () => null,
}));
vi.mock("@/components/auth/EmailVerificationNotice", () => ({
  EmailVerificationNotice: () => null,
}));

const render = () => WelcomePage({ params: Promise.resolve({ locale: "es" }) });

function findElement(node: unknown, type: unknown): { props: Record<string, unknown> } | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  const el = node as { type?: unknown; props?: Record<string, unknown> };
  if (el.type === type) return { props: el.props ?? {} };
  return findElement(el.props?.children, type);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveAudience.mockImplementation(async (_id: string, type: string) => (type === "diary" ? "private" : "public"));
  mocks.exploreEnabled.mockReturnValue(true);
});

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

  it("renderiza el flujo de tres pasos si el onboarding está pendiente", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1", onboardedAt: null, emailVerifiedAt: null } });
    const tree = await render();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(findElement(tree, WelcomeFlow)).not.toBeNull();
  });

  it("pasa las audiencias efectivas y si Explorar está activo", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1", onboardedAt: null, emailVerifiedAt: null } });
    mocks.exploreEnabled.mockReturnValue(false);
    const tree = await render();
    expect(mocks.resolveAudience).toHaveBeenCalledWith("u1", "favorite");
    expect(mocks.resolveAudience).toHaveBeenCalledWith("u1", "diary");
    expect(findElement(tree, WelcomeFlow)?.props).toMatchObject({
      favoriteAudience: "public",
      diaryAudience: "private",
      exploreEnabled: false,
    });
  });

  it("entrega el aviso de verificación de email al flujo", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1", onboardedAt: null, emailVerifiedAt: null } });
    const tree = await render();
    const notice = findElement(tree, WelcomeFlow)?.props.notice;
    expect(findElement(notice, EmailVerificationNotice)).not.toBeNull();
  });
});
