import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import * as home from "@/services/home/home";
import { AnonymousHome } from "./AnonymousHome";
import { AnonHero } from "./AnonHero";
import { HowItWorks } from "./HowItWorks";
import { AnonCta } from "./AnonCta";
import { QuickLinks } from "./QuickLinks";
import { FeedPreview } from "./FeedPreview";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/services/home/home", () => ({
  listCommunityActivity: vi.fn().mockResolvedValue([]),
  listPublicLists: vi.fn().mockResolvedValue([]),
  listRecentCoverArt: vi.fn().mockResolvedValue([]),
  listPopularComments: vi
    .fn()
    .mockResolvedValue({ artist: [], "release-group": [], recording: [] }),
  listHomeReleases: vi.fn().mockResolvedValue([]),
}));

function includesType(node: unknown, type: unknown): boolean {
  if (node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((child) => includesType(child, type));
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return true;
  return includesType(element.props?.children, type);
}

describe("AnonymousHome", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra hero, carrusel y CTA; nunca accesos ni feed de usuario", async () => {
    const element = await AnonymousHome();

    expect(includesType(element, AnonHero)).toBe(true);
    expect(includesType(element, HowItWorks)).toBe(true);
    expect(includesType(element, AnonCta)).toBe(true);
    expect(includesType(element, QuickLinks)).toBe(false);
    expect(includesType(element, FeedPreview)).toBe(false);
  });

  it("arma el muro del hero con las carátulas recientes y no consulta datos de usuario", async () => {
    vi.mocked(home.listRecentCoverArt).mockResolvedValue(["https://cover/1.jpg"]);

    await AnonymousHome();

    expect(home.listRecentCoverArt).toHaveBeenCalled();
    expect(home.listCommunityActivity).toHaveBeenCalledWith(null, 6);
  });
});
