import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { parseExploreListParams } from "@/services/discovery/explore-params";
import { CollectionRail } from "./CollectionRail";
import { DecadeHistogram } from "./DecadeHistogram";
import { ExploreFilterBar } from "./ExploreFilterBar";
import { FamilyGrid } from "./FamilyGrid";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode; scroll?: boolean }) => {
    // `scroll` es una prop del `Link` de next-intl, no un atributo de `<a>`.
    const attrs: Record<string, unknown> = { ...rest };
    delete attrs.scroll;
    return (
      <a href={`/es${href}`} {...attrs}>
        {children}
      </a>
    );
  },
  useRouter: () => ({ replace: vi.fn() }),
}));

const categoryLabels = {
  studio: "De estudio",
  single_ep: "Singles y EPs",
  compilation: "Compilaciones",
  live_other: "Directos y otros",
};

describe("DecadeHistogram", () => {
  const decades = [2000, 1990, 1970].map((decade, i) => ({
    decade,
    count: (i + 1) * 10,
    href: `/explore?decada=${decade}`,
    countLabel: String((i + 1) * 10),
    ariaLabel: `${decade}s: ${(i + 1) * 10} álbumes`,
  }));

  it("dibuja las columnas en orden cronológico, cada una con su nombre accesible", () => {
    renderWithIntl(<DecadeHistogram heading="Explorar por década" decades={decades} earlierLabel="Antes" />);
    const [columns] = screen.getAllByRole("list");
    const links = within(columns!).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("aria-label"))).toEqual([
      "1970s: 30 álbumes",
      "1990s: 20 álbumes",
      "2000s: 10 álbumes",
    ]);
    expect(links[0]).toHaveAttribute("href", "/es/explore?decada=1970");
  });

  it("saca del gráfico las décadas iniciales con muy pocos álbumes", () => {
    const column = (decade: number, count: number) => ({
      decade,
      count,
      href: `/explore?decada=${decade}`,
      countLabel: String(count),
      ariaLabel: `${decade}s`,
    });
    renderWithIntl(
      <DecadeHistogram
        heading="Explorar por década"
        decades={[column(1900, 2), column(1910, 5), column(1960, 500), column(2010, 10000)]}
        earlierLabel="Antes"
      />,
    );
    const earlier = screen.getByText("Antes").parentElement!;
    expect(within(earlier).getAllByRole("link").map((a) => a.getAttribute("aria-label"))).toEqual(["1900s", "1910s"]);
  });

  it("no renderiza nada sin décadas", () => {
    const { container } = renderWithIntl(<DecadeHistogram heading="Explorar por década" decades={[]} earlierLabel="Antes" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FamilyGrid", () => {
  const tile = (key: string, count: number) => ({
    key,
    label: key,
    href: `/explore?familia=${key}`,
    count,
    countLabel: `${count} álbumes`,
  });

  it("enlaza cada familia y deja las secundarias tras el desplegable", () => {
    renderWithIntl(
      <FamilyGrid
        heading="Explorar por género"
        families={[tile("rock", 100), tile("jazz", 20)]}
        moreFamilies={[tile("world", 2)]}
        moreLabel="1 familia más"
        lessLabel="Ver menos"
      />,
    );
    expect(screen.getByRole("link", { name: /rock/ })).toHaveAttribute("href", "/es/explore?familia=rock");
    expect(screen.getByText("20 álbumes")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /1 familia más/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /world/ })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole("link", { name: /world/ })).toHaveAttribute("href", "/es/explore?familia=world");
    expect(screen.getByRole("button", { name: /Ver menos/ })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("ExploreFilterBar", () => {
  it("marca el tipo actual y sus enlaces conservan el orden y vuelven a la página 1", () => {
    renderWithIntl(
      <ExploreFilterBar
        baseHref="/explore?decada=1990"
        params={parseExploreListParams({ tipo: "studio", orden: "az", page: "3" })}
        categoryLabels={categoryLabels}
      />,
    );
    expect(screen.getByRole("link", { name: "De estudio" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/es/explore?decada=1990&orden=az");
    expect(screen.getByRole("link", { name: "Compilaciones" })).toHaveAttribute(
      "href",
      "/es/explore?decada=1990&tipo=compilation&orden=az",
    );
  });

  it("con hideSort no dibuja el selector de orden pero conserva el tipo", () => {
    renderWithIntl(
      <ExploreFilterBar
        baseHref="/explore?proximos=1"
        params={parseExploreListParams({ tipo: "studio" })}
        categoryLabels={categoryLabels}
        hideSort
      />,
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "De estudio" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Compilaciones" })).toHaveAttribute(
      "href",
      "/es/explore?proximos=1&tipo=compilation",
    );
  });

  it("sin hideSort dibuja el selector de orden", () => {
    renderWithIntl(
      <ExploreFilterBar baseHref="/explore?decada=1990" params={parseExploreListParams({})} categoryLabels={categoryLabels} />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

describe("CollectionRail", () => {
  it("enlaza cada colección con su descripción y número de álbumes", () => {
    renderWithIntl(
      <CollectionRail
        heading="Colecciones destacadas"
        collections={[
          { id: "c1", title: "Esenciales", description: "Para empezar", itemCount: 12, coverThumbs: [], source: "curated", family: null },
        ]}
        curatorUsername="exploracion"
        itemsLabel={(count) => `${count} álbumes`}
      />,
    );
    const card = screen.getByRole("link", { name: /Esenciales/ });
    expect(card.getAttribute("href")).toContain("/es/");
    expect(within(card).getByText("Para empezar")).toBeInTheDocument();
    expect(within(card).getByText("12 álbumes")).toBeInTheDocument();
  });

  it("no renderiza nada sin colecciones", () => {
    const { container } = renderWithIntl(
      <CollectionRail heading="Colecciones" collections={[]} curatorUsername="exploracion" itemsLabel={String} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("usa el ancla y el enlace «Ver todas» que recibe", () => {
    const { container } = renderWithIntl(
      <CollectionRail
        id="descubre-por-datos"
        heading="Descubre por datos"
        collections={[{ id: "c1", title: "Cumplen años", description: null, itemCount: 12, coverThumbs: [], source: "template", family: "ephemeris" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
        seeAll={{ href: "/explore/collections", label: "Ver todas" }}
      />,
    );
    expect(container.querySelector("section")).toHaveAttribute("id", "descubre-por-datos");
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute("href", "/es/explore/collections");
  });

  it("muestra la familia de una colección automática y no la de una curada", () => {
    renderWithIntl(
      <CollectionRail
        heading="Colecciones"
        collections={[
          { id: "a", title: "Cumplen años en octubre", description: null, itemCount: 12, coverThumbs: [], source: "template", family: "ephemeris" },
          { id: "b", title: "Mejores debuts", description: null, itemCount: 20, coverThumbs: [], source: "curated", family: null },
        ]}
        curatorUsername="exploracion"
        itemsLabel={String}
        familyLabel={(family) => `Familia ${family}`}
      />,
    );
    expect(within(screen.getByRole("link", { name: /Cumplen años/ })).getByText("Familia ephemeris")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /Mejores debuts/ })).queryByText(/Familia/)).toBeNull();
  });

  it("muestra la nota extra bajo el conteo (el archivo indica hasta cuándo estuvo vigente)", () => {
    renderWithIntl(
      <CollectionRail
        heading="Anteriores"
        collections={[{ id: "a", title: "Cumplen años en septiembre", description: null, itemCount: 12, coverThumbs: [], source: "template", family: "ephemeris" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
        noteFor={() => "Hasta el 1 oct 2026"}
      />,
    );
    expect(screen.getByText("Hasta el 1 oct 2026")).toBeInTheDocument();
  });
});
