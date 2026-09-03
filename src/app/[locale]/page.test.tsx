import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { ReactElement, ReactNode } from "react";
import * as auth from "@/services/auth/authorization";
import * as following from "@/services/social/following";
import * as home from "@/services/home/home";
import { FeedPreview } from "@/components/home/FeedPreview";
import { OnboardingPrompt } from "@/components/home/OnboardingPrompt";
import { QuickLinks } from "@/components/home/QuickLinks";
import { AnonHero } from "@/components/home/AnonHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { AnonCta } from "@/components/home/AnonCta";

type PageModule = { default: () => Promise<ReactElement> };
let pageModule: PageModule;

beforeAll(async () => {
  pageModule = (await vi.importActual("./page")) as PageModule;
});

// getTranslations necesita el contexto de request de next-intl, que no existe
// al invocar el componente directo en un test (mismo patrón que
// artist/[id]/page.test.tsx).
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/catalog/SearchForm", () => ({
  SearchForm: () => <div data-testid="search-form" />,
}));

vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/services/social/following", () => ({ listFollowing: vi.fn() }));
vi.mock("@/services/home/home", () => ({
  listCommunityActivity: vi.fn().mockResolvedValue([]),
  listPublicLists: vi.fn().mockResolvedValue([]),
  listFollowingFeedPreview: vi.fn().mockResolvedValue([]),
  listRecentCoverArt: vi.fn().mockResolvedValue([]),
  listHomeReleases: vi.fn().mockResolvedValue([]),
  listPopularComments: vi
    .fn()
    .mockResolvedValue({ artist: [], "release-group": [], recording: [] }),
}));

// Los componentes hijos (CommunityActivity, PublicLists, FeedPreview,
// OnboardingPrompt, QuickLinks) son Server Components async: al no renderizar
// el árbol con testing-library, sus funciones nunca se ejecutan — solo se
// crean como descriptores de elemento. Alcanza con inspeccionar el árbol
// devuelto por Home() buscando el `type` de cada componente.
function includesType(node: unknown, type: unknown): boolean {
  if (node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((child) => includesType(child, type));
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return true;
  return includesType(element.props?.children, type);
}

describe("HomePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("visitante sin sesión: no consulta seguidos ni muestra accesos de usuario", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

    const element = await pageModule.default();

    expect(following.listFollowing).not.toHaveBeenCalled();
    expect(home.listFollowingFeedPreview).not.toHaveBeenCalled();
    expect(includesType(element, QuickLinks)).toBe(false);
    expect(includesType(element, FeedPreview)).toBe(false);
    expect(includesType(element, OnboardingPrompt)).toBe(false);
    expect(includesType(element, AnonHero)).toBe(true);
    expect(includesType(element, HowItWorks)).toBe(true);
    expect(includesType(element, AnonCta)).toBe(true);
  });

  it("usuario con al menos un seguido: pide el preview de feed y no muestra onboarding", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue({
      id: "u1",
      username: "yo",
      displayName: null,
    } as Awaited<ReturnType<typeof auth.getCurrentUser>>);
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [{ id: "u2", username: "seguido", displayName: null, profileVisibility: "public" }],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });

    const element = await pageModule.default();

    expect(home.listFollowingFeedPreview).toHaveBeenCalledWith("u1");
    expect(includesType(element, FeedPreview)).toBe(true);
    expect(includesType(element, OnboardingPrompt)).toBe(false);
    expect(includesType(element, AnonHero)).toBe(false);
    expect(includesType(element, HowItWorks)).toBe(false);
  });

  it("usuario sin seguidos: muestra onboarding y no pide el preview de feed", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue({
      id: "u1",
      username: "yo",
      displayName: null,
    } as Awaited<ReturnType<typeof auth.getCurrentUser>>);
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });

    const element = await pageModule.default();

    expect(home.listFollowingFeedPreview).not.toHaveBeenCalled();
    expect(includesType(element, OnboardingPrompt)).toBe(true);
    expect(includesType(element, FeedPreview)).toBe(false);
    expect(includesType(element, AnonHero)).toBe(false);
  });
});
