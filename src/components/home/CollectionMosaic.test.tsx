import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { CollectionMosaic, mosaicTiles } from "./CollectionMosaic";
import type { FeaturedCollection } from "@/services/discovery/discovery";

vi.mock("next-intl/server", () => ({ getLocale: vi.fn().mockResolvedValue("es") }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

function collection(i: number): FeaturedCollection {
  return {
    id: `c${i}`,
    title: `Colección ${i}`,
    description: `Descripción ${i}`,
    itemCount: 10 + i,
    coverThumbs: [],
    source: "curated",
    templateKey: null,
    periodKey: null,
    family: "discovery",
  };
}

async function renderMosaic(count: number) {
  const element = await CollectionMosaic({
    collections: Array.from({ length: count }, (_, i) => collection(i + 1)),
    curatorUsername: "exploracion",
    itemsLabel: (n) => `${n} álbumes`,
    labelledBy: "home-collections",
  });
  return render(<>{element}</>);
}

describe("mosaicTiles", () => {
  it("con seis o más: destacada, cuatro medianas y una a lo ancho", () => {
    expect(mosaicTiles(8)).toEqual(["featured", "medium", "medium", "medium", "medium", "wide"]);
  });

  it("con cinco: destacada y cuatro medianas, sin huecos", () => {
    expect(mosaicTiles(5)).toEqual(["featured", "medium", "medium", "medium", "medium"]);
  });

  it("con cuatro o menos: todas medianas", () => {
    expect(mosaicTiles(4)).toEqual(["medium", "medium", "medium", "medium"]);
    expect(mosaicTiles(1)).toEqual(["medium"]);
  });
});

describe("CollectionMosaic", () => {
  it("muestra como máximo seis colecciones y la primera destacada", async () => {
    await renderMosaic(8);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0]!.className).toContain("lg:col-span-2");
    expect(items[5]!.className).toContain("lg:col-span-4");
    expect(screen.queryByText("Colección 7")).not.toBeInTheDocument();
  });

  it("en pantallas angostas es una fila con desplazamiento horizontal", async () => {
    await renderMosaic(4);

    const list = screen.getByRole("list");
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).toContain("snap-x");
    expect(list.className).not.toContain("flex-col");
  });

  it("enlaza cada colección a la lista pública de la cuenta curadora", async () => {
    await renderMosaic(1);

    expect(screen.getByRole("link").getAttribute("href")).toContain("exploracion");
    expect(screen.getByText("11 álbumes")).toBeInTheDocument();
  });

  it("sin colecciones no renderiza nada", async () => {
    const element = await CollectionMosaic({
      collections: [],
      curatorUsername: "exploracion",
      itemsLabel: (n) => `${n}`,
      labelledBy: "x",
    });
    expect(element).toBeNull();
  });
});
