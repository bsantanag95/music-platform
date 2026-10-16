import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { encodeId } from "@/lib/slug";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { parseExploreListParams } from "@/services/discovery/explore-params";
import { CollectionRail } from "./CollectionRail";
import { DecadeHistogram } from "./DecadeHistogram";
import { ExploreFilterBar } from "./ExploreFilterBar";
import { FamilyGrid } from "./FamilyGrid";

// jsdom no implementa ResizeObserver ni matchMedia (el riel desplazable los usa para las flechas y el movimiento).
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

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
  const tile = (key: string, covers: string[] = []) => ({
    key,
    label: key,
    href: `/explore?familia=${key}`,
    covers,
  });
  const cover = (n: number) => `https://coverartarchive.org/release-group/${n}/front-250`;

  it("enlaza cada familia y deja las secundarias tras el desplegable", () => {
    renderWithIntl(
      <FamilyGrid
        heading="Explorar por género"
        families={[tile("rock", [cover(1)]), tile("jazz")]}
        moreFamilies={[tile("world")]}
        moreLabel="1 familia más"
        lessLabel="Ver menos"
      />,
    );
    expect(screen.getByRole("link", { name: /rock/ })).toHaveAttribute("href", "/es/explore?familia=rock");
    const toggle = screen.getByRole("button", { name: /1 familia más/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /world/ })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole("link", { name: /world/ })).toHaveAttribute("href", "/es/explore?familia=world");
    expect(screen.getByRole("button", { name: /Ver menos/ })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("FamilyGrid: tarjeta visual", () => {
  const cover = (n: number) => `https://coverartarchive.org/release-group/${n}/front-250`;
  const family = (key: string, covers: string[]) => ({ key, label: key, href: `/explore?familia=${key}`, covers });
  const imagesIn = (name: RegExp) => screen.getByRole("link", { name }).querySelectorAll("img").length;

  it("muestra un mosaico con tantas carátulas como haya, hasta cuatro", () => {
    renderWithIntl(
      <FamilyGrid
        heading="Explorar por género"
        families={[
          family("rock", [1, 2, 3, 4, 5].map(cover)),
          family("jazz", [1, 2, 3].map(cover)),
          family("blues", [1, 2].map(cover)),
          family("pop", [1].map(cover)),
        ]}
      />,
    );

    expect(imagesIn(/rock/)).toBe(4);
    expect(imagesIn(/jazz/)).toBe(3);
    expect(imagesIn(/blues/)).toBe(2);
    expect(imagesIn(/pop/)).toBe(1);
  });

  it("con tres carátulas la primera ocupa las dos filas", () => {
    renderWithIntl(<FamilyGrid heading="Explorar por género" families={[family("jazz", [1, 2, 3].map(cover))]} />);

    const cells = screen.getByRole("link", { name: /jazz/ }).querySelectorAll("[aria-hidden] > div");
    expect(cells[0]).toHaveClass("row-span-2");
    expect(cells[1]).not.toHaveClass("row-span-2");
  });

  it("una familia sin carátulas es una tarjeta plana con su nombre y sigue enlazando", () => {
    renderWithIntl(<FamilyGrid heading="Explorar por género" families={[family("latin", [])]} />);

    const link = screen.getByRole("link", { name: /latin/ });
    expect(link).toHaveAttribute("href", "/es/explore?familia=latin");
    expect(link.querySelectorAll("img")).toHaveLength(0);
  });

  it("no muestra número de álbumes ni barra de tamaño", () => {
    const { container } = renderWithIntl(
      <FamilyGrid heading="Explorar por género" families={[family("rock", [1, 2].map(cover))]} />,
    );

    expect(screen.queryByText(/álbum/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{2,}/)).not.toBeInTheDocument();
    // La barra era un `span` con el ancho en porcentaje; las imágenes de `next/image` llevan su propio estilo.
    expect(container.querySelector("span[style*='width']")).toBeNull();
  });

  it("las carátulas son decorativas: el enlace se nombra solo con la familia", () => {
    renderWithIntl(<FamilyGrid heading="Explorar por género" families={[family("rock", [1, 2].map(cover))]} />);

    expect(screen.getByRole("link", { name: "rock" })).toBeInTheDocument();
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
          { id: "c1", title: "Esenciales", description: "Para empezar", itemCount: 12, coverThumbs: [], source: "curated", templateKey: null, periodKey: null, family: "discovery" },
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
        heading="Descubre"
        collections={[{ id: "c1", title: "Cumplen años", description: null, itemCount: 12, coverThumbs: [], source: "template", templateKey: "anniversaries", periodKey: "2026-10", family: "ephemeris" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
        seeAll={{ href: "/explore/collections", label: "Ver todas" }}
      />,
    );
    expect(container.querySelector("section")).toHaveAttribute("id", "descubre-por-datos");
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute("href", "/es/explore/collections");
  });

  const generated = {
    id: "00000000-0000-4000-8000-0000000000c1",
    title: "Cumplen años en octubre",
    description: null,
    itemCount: 12,
    coverThumbs: [],
    source: "template" as const,
    templateKey: "anniversaries",
    periodKey: "2026-10",
    family: "ephemeris" as const,
  };

  it("una colección generada se muestra con el título del idioma y enlaza a su ruta bajo Explorar (es)", () => {
    renderWithIntl(<CollectionRail heading="Colecciones" collections={[generated]} curatorUsername="exploracion" itemsLabel={String} />);

    const card = screen.getByRole("link", { name: /Cumplen años en octubre de 2026/ });
    expect(card).toHaveAttribute("href", `/es/explore/collections/cumplen-anos-en-octubre-de-2026-${encodeId(generated.id)}`);
    expect(card.getAttribute("href")).not.toContain("exploracion");
  });

  it("la misma colección en inglés: título y slug en inglés, sin la cuenta curadora en la URL", () => {
    renderWithIntl(
      <CollectionRail heading="Collections" collections={[generated]} curatorUsername="exploracion" itemsLabel={String} />,
      "en",
    );

    const card = screen.getByRole("link", { name: /Anniversaries in October 2026/ });
    // El prefijo de locale lo pone el `Link` de la app (en estas pruebas está fijo en es); lo que importa es el slug.
    expect(card.getAttribute("href")).toContain(`/explore/collections/anniversaries-in-october-2026-${encodeId(generated.id)}`);
    expect(card.getAttribute("href")).not.toContain("exploracion");
  });

  it("una colección curada conserva su título y su ruta de lista", () => {
    renderWithIntl(
      <CollectionRail
        heading="Selección editorial"
        collections={[{ ...generated, id: "00000000-0000-4000-8000-0000000000c2", title: "Mejores debuts", source: "curated", templateKey: null, periodKey: null, family: "discovery" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
      />,
      "en",
    );

    const card = screen.getByRole("link", { name: /Mejores debuts/ });
    expect(card.getAttribute("href")).toContain("/users/exploracion/lists/mejores-debuts-");
  });

  it("una generada con plantilla desconocida muestra su título guardado", () => {
    renderWithIntl(
      <CollectionRail
        heading="Colecciones"
        collections={[{ ...generated, templateKey: "ya-no-existe", periodKey: "evergreen" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
      />,
      "en",
    );

    expect(screen.getByRole("link", { name: /Cumplen años en octubre/ })).toBeInTheDocument();
  });

  it("muestra la familia de toda colección, venga de plantilla o de la mano de alguien", () => {
    renderWithIntl(
      <CollectionRail
        heading="Colecciones"
        collections={[
          { id: "a", title: "Cumplen años en octubre", description: null, itemCount: 12, coverThumbs: [], source: "template", templateKey: "anniversaries", periodKey: "2026-10", family: "ephemeris" },
          { id: "b", title: "Mejores debuts", description: null, itemCount: 20, coverThumbs: [], source: "curated", templateKey: null, periodKey: null, family: "discovery" },
        ]}
        curatorUsername="exploracion"
        itemsLabel={String}
        familyLabel={(family) => `Familia ${family}`}
      />,
    );
    // La familia es lo que distingue una colección de otra; el origen no se muestra (ADR 0038).
    expect(within(screen.getByRole("link", { name: /Cumplen años/ })).getByText("Familia ephemeris")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /Mejores debuts/ })).getByText("Familia discovery")).toBeInTheDocument();
  });

  it("la frase de contexto va bajo el título y sustituye a la descripción", () => {
    renderWithIntl(
      <CollectionRail
        heading="Colecciones"
        collections={[{ ...generated, description: "Descripción larga" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
        contextFor={() => "Cumplen años en octubre de 2026 · de 20 a 70 años"}
      />,
    );

    const card = screen.getByRole("link", { name: /Cumplen años en octubre de 2026/ });
    expect(within(card).getByText("Cumplen años en octubre de 2026 · de 20 a 70 años")).toBeInTheDocument();
    expect(within(card).queryByText("Descripción larga")).toBeNull();
  });

  it("una colección sin frase de contexto conserva su descripción", () => {
    renderWithIntl(
      <CollectionRail
        heading="Colecciones"
        collections={[{ ...generated, description: "Descripción larga" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
        contextFor={() => undefined}
      />,
    );

    expect(screen.getByText("Descripción larga")).toBeInTheDocument();
  });

  it("con `compact` usa la rejilla de tarjetas densas, sin descripción", () => {
    const { container } = renderWithIntl(
      <CollectionRail
        heading="Anteriores"
        collections={[{ ...generated, description: "Descripción larga" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
        compact
      />,
    );

    expect(container.querySelector("ul")?.className).toContain("xl:grid-cols-6");
    expect(screen.queryByText("Descripción larga")).toBeNull();
  });

  it("con `bare` pinta solo la rejilla, sin sección ni encabezado", () => {
    const { container } = renderWithIntl(
      <CollectionRail heading="Vigentes" collections={[generated]} curatorUsername="exploracion" itemsLabel={String} bare />,
    );

    expect(container.querySelector("section")).toBeNull();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getByRole("link", { name: /Cumplen años en octubre/ })).toBeInTheDocument();
  });

  it("con un mensaje de vacío y sin colecciones lo muestra en lugar de omitirse", () => {
    renderWithIntl(
      <CollectionRail
        heading="Anteriores"
        collections={[]}
        curatorUsername="exploracion"
        itemsLabel={String}
        emptyMessage={<span>No hay anteriores de este tipo</span>}
      />,
    );

    expect(screen.getByText("No hay anteriores de este tipo")).toBeInTheDocument();
  });

  it("en disposición de riel desplazable ofrece las flechas y una sola fila", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      title: `Colección ${i}`,
      description: null,
      itemCount: 8,
      coverThumbs: [],
      source: "curated" as const,
      templateKey: null,
      periodKey: null,
      family: "discovery" as const,
    }));
    renderWithIntl(
      <CollectionRail
        id="colecciones"
        heading="Colecciones"
        collections={many}
        curatorUsername="exploracion"
        itemsLabel={String}
        layout="scroll"
      />,
    );

    // Las 10 caben en la fila desplazable y la lista queda asociada al título de la sección.
    expect(screen.getAllByRole("link", { name: /Colección/ })).toHaveLength(10);
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-labelledby", "colecciones-heading");
    expect(list.className).toContain("overflow-x-auto");
    // Seis de un vistazo (5 desde `lg`): con tarjetas anchas solo se veían 3, menos que los dos riles de 6 que
    // este reemplaza. El resto queda a un desplazamiento.
    const items = screen.getAllByRole("listitem");
    expect(items[0]!.className).toContain("xl:w-[calc((100%-5rem)/6)]");
    expect(items[0]!.className).toContain("lg:w-[calc((100%-4rem)/5)]");
    expect(screen.getByRole("heading", { name: "Colecciones" })).toHaveAttribute("id", "colecciones-heading");
  });

  it("en el riel la tarjeta omite la descripción, que sí aparece en la rejilla", () => {
    const withDescription = [
      { id: "c1", title: "Discos de culto", description: "Los que no sonaron en la radio", itemCount: 9, coverThumbs: [], source: "curated" as const, templateKey: null, periodKey: null, family: "discovery" as const },
    ];
    const view = renderWithIntl(
      <CollectionRail heading="Colecciones" collections={withDescription} curatorUsername="exploracion" itemsLabel={String} layout="scroll" />,
    );
    expect(screen.queryByText("Los que no sonaron en la radio")).toBeNull();
    view.unmount();

    renderWithIntl(
      <CollectionRail heading="Colecciones" collections={withDescription} curatorUsername="exploracion" itemsLabel={String} />,
    );
    expect(screen.getByText("Los que no sonaron en la radio")).toBeInTheDocument();
  });

  it("la rejilla no desplaza: la usan la página de colecciones y el archivo", () => {
    renderWithIntl(
      <CollectionRail
        heading="Anteriores"
        collections={[{ id: "a", title: "Vencida", description: null, itemCount: 8, coverThumbs: [], source: "template", templateKey: "anniversaries", periodKey: "2026-09", family: "ephemeris" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
      />,
    );
    expect(screen.getByRole("list").className).toContain("grid");
    expect(screen.getByRole("list").className).not.toContain("overflow-x-auto");
  });

  it("muestra la nota extra bajo el conteo (el archivo indica hasta cuándo estuvo vigente)", () => {
    renderWithIntl(
      <CollectionRail
        heading="Anteriores"
        collections={[{ id: "a", title: "Cumplen años en septiembre", description: null, itemCount: 12, coverThumbs: [], source: "template", templateKey: "anniversaries", periodKey: "2026-10", family: "ephemeris" }]}
        curatorUsername="exploracion"
        itemsLabel={String}
        noteFor={() => "Hasta el 1 oct 2026"}
      />,
    );
    expect(screen.getByText("Hasta el 1 oct 2026")).toBeInTheDocument();
  });
});
