import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import type { CaminoDiscoverySummary } from "@/services/camino/discovery";
import { ListsToComplete, matchToComplete } from "./ListsToComplete";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values && "count" in values ? `${key}:${String(values.count)}` : values && "name" in values ? `${key}:${String(values.name)}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/components/discovery/SectionHeader", () => ({
  SectionHeader: ({ heading, seeAll }: { heading: string; seeAll?: { href: string; label: string } }) => (
    <div>
      <h2>{heading}</h2>
      {seeAll ? <a href={seeAll.href}>{seeAll.label}</a> : null}
    </div>
  ),
}));

const camino = (id: string, title: string, over: Partial<CaminoDiscoverySummary> = {}): CaminoDiscoverySummary => ({
  id,
  title,
  kind: "standard",
  owner: { id: "o", username: "eli", displayName: "Eli" },
  itemCount: 10,
  coverThumbs: ["a", "b"],
  trackingCount: 1,
  ...over,
});

describe("ListsToComplete (openspec: separate-lists-to-complete)", () => {
  it("una tarjeta por lista, hasta cuatro, con carátulas, dueño, personas completando y «Completarla»", async () => {
    render(await ListsToComplete({ caminos: ["1", "2", "3", "4", "5"].map((n) => camino(n, `Lista ${n}`)) }));

    expect(screen.getByRole("heading", { level: 2, name: "hub.toComplete" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hub.seeAll" })).toHaveAttribute("href", "/caminos");
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(within(cards[0]!).getAllByTestId("cover")).toHaveLength(4);
    expect(cards[0]).toHaveTextContent("byOwner:Eli");
    expect(cards[0]).toHaveTextContent("trackingCount:1");
    expect(within(cards[0]!).getByRole("link", { name: "community.toComplete.action" }).getAttribute("href")).toContain("/users/eli/lists/");
  });

  it("un recorrido propio lleva a su ruta de caminos", async () => {
    render(await ListsToComplete({ caminos: [camino("j1", "Mi camino", { kind: "custom_journey" })] }));
    expect(screen.getByRole("link", { name: "community.toComplete.action" })).toHaveAttribute("href", "/users/eli/caminos/j1");
  });

  it("sin listas no renderiza nada", async () => {
    expect(await ListsToComplete({ caminos: [] })).toBeNull();
  });
});

describe("matchToComplete", () => {
  const caminos = [camino("1", "Best of Sabrina"), camino("2", "Canciones de café")];

  it("sin texto devuelve todas; con texto, las que lo contienen, sin distinguir mayúsculas ni acentos", () => {
    expect(matchToComplete(caminos, undefined)).toHaveLength(2);
    expect(matchToComplete(caminos, "SABRINA").map((c) => c.id)).toEqual(["1"]);
    expect(matchToComplete(caminos, "cafe").map((c) => c.id)).toEqual(["2"]);
    expect(matchToComplete(caminos, "metal")).toEqual([]);
  });
});
