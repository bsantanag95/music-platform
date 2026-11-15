import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { CommunityActivity } from "./CommunityActivity";
import { ActivityCard } from "./ActivityCard";
import { CompactActivityRow, type CompactActivityEntry } from "@/components/feed/CompactActivityRow";

vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const entry: CompactActivityEntry = {
  kind: "rating",
  id: "r1",
  stars: "4.5",
  detailedScore: 86,
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "release-group", id: "a1b2c3d4-0000-4000-8000-000000000001", title: "Loveless", coverThumbUrl: null },
  author: { id: "u1", username: "ana", displayName: "Ana" },
};

function includesType(node: unknown, type: unknown): boolean {
  if (node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((child) => includesType(child, type));
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return true;
  return includesType(element.props?.children, type);
}

describe("CommunityActivity", () => {
  it("por defecto (Inicio con sesión) conserva las filas compactas", async () => {
    const element = await CommunityActivity({ entries: [entry] });

    expect(includesType(element, CompactActivityRow)).toBe(true);
    expect(includesType(element, ActivityCard)).toBe(false);
  });

  it("con layout cards (portada sin sesión) usa tarjetas y la primera va a lo ancho", async () => {
    const element = await CommunityActivity({ entries: [entry, { ...entry, id: "r2" }], layout: "cards" });

    expect(includesType(element, ActivityCard)).toBe(true);
    expect(includesType(element, CompactActivityRow)).toBe(false);
    const cards = (element as { props: { children: { props: { wide: boolean } }[] } }).props.children;
    expect(cards.map((card) => card.props.wide)).toEqual([true, false]);
  });

  it("sin entradas no renderiza nada", async () => {
    expect(await CommunityActivity({ entries: [], layout: "cards" })).toBeNull();
  });
});
