import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { AnonHero } from "./AnonHero";
import { HeroSampleEntry } from "./HeroSampleEntry";
import { HeroCrate } from "./HeroCrate";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { HERO_SEARCH_EXAMPLES } from "@/lib/config/hero-covers";
import { StarRatingValue } from "@/components/social/StarRatingValue";
import { ScoreBadge } from "@/components/laminas/ScoreBadge";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return { ...actual, preload: vi.fn() };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

type Node = { type?: unknown; props?: Record<string, unknown> & { children?: unknown } };

function find(node: unknown, predicate: (element: Node) => boolean): Node[] {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => find(child, predicate));
  const element = node as Node;
  const own = predicate(element) ? [element] : [];
  return [...own, ...find(element.props?.children, predicate)];
}

describe("AnonHero", () => {
  it("monta el buscador del Header en su variante del hero", async () => {
    const element = await AnonHero();

    const searches = find(element, (el) => el.type === HeaderSearch);
    expect(searches).toHaveLength(1);
    expect(searches[0]!.props?.size).toBe("hero");
  });

  it("muestra la caja de carátulas y la entrada de ejemplo", async () => {
    const element = await AnonHero();

    expect(find(element, (el) => el.type === HeroCrate)).toHaveLength(1);
    expect(find(element, (el) => el.type === HeroSampleEntry)).toHaveLength(1);
  });

  it("las acciones van directo a registro e inicio de sesión, sin diálogo intermedio", async () => {
    const element = await AnonHero();

    const hrefs = find(element, (el) => typeof el.props?.href === "string").map((el) => el.props!.href);
    expect(hrefs).toContain("/auth/register");
    expect(hrefs).toContain("/auth/login");
    expect(find(element, (el) => el.props?.["aria-haspopup"] === "dialog")).toHaveLength(0);
  });

  it("los accesos de ejemplo buscan cada artista en /search", async () => {
    const element = await AnonHero();

    const hrefs = find(element, (el) => typeof el.props?.href === "string").map((el) => el.props!.href);
    for (const name of HERO_SEARCH_EXAMPLES) {
      expect(hrefs).toContain(`/search?${new URLSearchParams({ type: "artist", q: name }).toString()}`);
    }
  });
});

describe("HeroSampleEntry", () => {
  it("lleva un rótulo visible de ejemplo y no muestra usuarios", async () => {
    const element = await HeroSampleEntry();

    const texts = find(element, (el) => typeof el.props?.children === "string").map((el) => el.props!.children);
    expect(texts).toContain("sampleLabel");
    expect(texts.some((text) => String(text).startsWith("@"))).toBe(false);
    expect(find(element, (el) => typeof el.props?.href === "string")).toHaveLength(0);
  });

  it("muestra la nota con la forma de rating-display: estrellas y 92/100, sin escala de color", async () => {
    const element = await HeroSampleEntry();

    const values = find(element, (el) => el.type === StarRatingValue);
    expect(values).toHaveLength(1);
    expect(values[0]!.props).toMatchObject({ detailedScore: 92, showScore: true });
    expect(find(element, (el) => el.type === ScoreBadge)).toHaveLength(0);
  });
});
