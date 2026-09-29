import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { EMPTY_DISCOGRAPHY_MARKS, type ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import type { DiscographySection } from "@/services/catalog/discography-sections";
import { ArtistDiscography, GRID_PAGE_SIZE, sortDiscographyRows, titleCollator } from "./ArtistDiscography";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/services/catalog/artist-discography-view", () => ({
  EMPTY_DISCOGRAPHY_MARKS: { listened: [], stars: {}, detailedScores: {}, favorites: [], pending: [], lists: {} },
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const d = catalogEs.artist.discography;
const ARTIST = "a1";

function item(id: string, overrides: Partial<ArtistDiscographyItem> = {}): ArtistDiscographyItem {
  return {
    id,
    title: `Disco ${id}`,
    year: 1970,
    coverThumbUrl: `https://example.com/${id}.jpg`,
    coverResolved: true,
    section: "main",
    kinds: ["album"],
    isEp: false,
    community: { average: null, count: 0 },
    primaryArtist: null,
    ...overrides,
  };
}

function sections(counts: Partial<Record<DiscographySection, number>>) {
  return (Object.entries(counts) as [DiscographySection, number][]).map(([key, count]) => ({
    key,
    items: Array.from({ length: count }, (_, i) => item(`${key}-${i}`, { section: key })),
  }));
}

function renderDiscography(props: Partial<Parameters<typeof ArtistDiscography>[0]> = {}) {
  return renderWithIntl(
    <ArtistDiscography
      artistId={ARTIST}
      sections={sections({ main: 19, live: 95, compilations: 40, singles: 48, other: 16, appearances: 1 })}
      activeSection="main"
      bestRatedId={null}
      marks={null}
      {...props}
    />,
  );
}

// La vista elegida persiste en `localStorage`: una instancia fresca por test evita que un
// test que cambia a tabla afecte a los siguientes (mismo patrón que ArtistJourneyList).
function installStorage(throwing = false) {
  const map = new Map<string, string>();
  const fail = () => {
    throw new Error("almacenamiento bloqueado");
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: throwing
      ? { getItem: fail, setItem: fail, removeItem: fail, clear: fail }
      : {
          getItem: (k: string) => map.get(k) ?? null,
          setItem: (k: string, v: string) => void map.set(k, v),
          removeItem: (k: string) => void map.delete(k),
          clear: () => map.clear(),
        },
  });
}

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ArtistDiscography", () => {
  it("selector de secciones con su cantidad, en orden, con Principal activa y sin parámetro", () => {
    renderDiscography();
    const nav = screen.getByRole("navigation", { name: d.sectionsLabel });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Principal19", "En vivo95", "Recopilatorios40", "Sencillos48", "Otros16", "Apariciones1"]);
    expect(links[0]).toHaveAttribute("href", `/artist/${ARTIST}`);
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).toHaveAttribute("href", `/artist/${ARTIST}?section=live`);
  });

  it("vista por defecto: grilla en Principal y tabla en las demás", () => {
    const { unmount } = renderDiscography();
    expect(screen.getByRole("button", { name: d.viewGrid })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    unmount();
    renderDiscography({ activeSection: "live" });
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("la elección de vista se recuerda por sección", () => {
    const { unmount } = renderDiscography();
    fireEvent.click(screen.getByRole("button", { name: d.viewTable }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    unmount();
    renderDiscography();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(window.localStorage.getItem("artist-discography-view:main")).toBe("table");
  });

  it("sin almacenamiento disponible usa la vista por defecto sin error", () => {
    installStorage(true);
    renderDiscography();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: d.viewTable }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("grilla: etiqueta EP, Mejor valorado y marcas personales", () => {
    renderDiscography({
      sections: [{ key: "main", items: [item("ep", { isEp: true }), item("dsotm", { community: { average: 4.6, count: 40 } })] }],
      bestRatedId: "dsotm",
      marks: { ...EMPTY_DISCOGRAPHY_MARKS, listened: ["ep"], stars: { dsotm: 4.5 }, favorites: ["dsotm"], pending: ["ep"] },
    });
    const ep = screen.getByText("Disco ep").closest("a")!;
    expect(within(ep).getByText(d.ep)).toBeInTheDocument();
    expect(within(ep).getByText(d.listened)).toBeInTheDocument();
    const best = screen.getByText("Disco dsotm").closest("a")!;
    expect(within(best).getByText(`★ ${d.bestRated}`)).toBeInTheDocument();
    expect(within(best).getByText("Tu nota: 4,5")).toBeInTheDocument();
    // Favorito y Pendiente, con texto accesible.
    expect(within(best).getByText(d.favorite)).toBeInTheDocument();
    expect(within(ep).getByText(d.pendingMark)).toBeInTheDocument();
  });

  it("grilla: muestra 48 discos y 'Mostrar más' agrega los siguientes", () => {
    renderDiscography({ sections: sections({ main: 300 }) });
    expect(screen.getAllByRole("listitem").filter((li) => li.querySelector("img"))).toHaveLength(GRID_PAGE_SIZE);
    fireEvent.click(screen.getByRole("button", { name: d.showMore }));
    expect(screen.getAllByRole("listitem").filter((li) => li.querySelector("img"))).toHaveLength(GRID_PAGE_SIZE * 2);
  });

  it("tabla: tipo traducido, media con umbral y artista principal en Apariciones", () => {
    renderDiscography({
      sections: [
        { key: "live", items: [item("p", { kinds: ["album", "live"], community: { average: 4.3, count: 41 } }), item("u", { kinds: ["album", "live"], community: { average: null, count: 3 } })] },
        { key: "appearances", items: [item("f", { kinds: ["single"], primaryArtist: { id: "o", name: "Otra banda" } })] },
      ],
      activeSection: "live",
    });
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]!).getAllByText("en vivo").length).toBeGreaterThan(0);
    expect(within(rows[0]!).getAllByText(/★ 4,3 \(41\)/).length).toBeGreaterThan(0);
    // Menos de 5 valoraciones: "—" con el texto accesible, sin "< 5 notas".
    expect(within(rows[1]!).getAllByText(d.fewRatingsLabel).length).toBeGreaterThan(0);
    expect(screen.queryByText(/notas/)).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: d.columns.average })).toBeInTheDocument();
  });

  it("tabla: la etiqueta de tipo va junto al título solo si no es álbum, sin columna Tipo", () => {
    renderDiscography({
      sections: [{ key: "main", items: [item("studio"), item("ep", { kinds: ["ep"], isEp: true })] }],
      activeSection: "main",
    });
    fireEvent.click(screen.getByRole("button", { name: d.viewTable }));
    const rowOf = (title: string) => screen.getAllByRole("row").find((row) => row.textContent?.includes(title));
    const studio = rowOf("Disco studio");
    const ep = rowOf("Disco ep");
    expect(within(studio!).queryByText(d.kinds.album)).not.toBeInTheDocument();
    expect(within(ep!).getAllByText(d.kinds.ep).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).not.toContain("Tipo");
  });

  it("tabla de Apariciones indica el artista principal", () => {
    renderDiscography({
      sections: [{ key: "appearances", items: [item("f", { kinds: ["single"], primaryArtist: { id: "o", name: "Otra banda" } })] }],
      activeSection: "appearances",
    });
    expect(screen.getByText("de Otra banda")).toBeInTheDocument();
  });

  it("sin discos muestra el aviso vacío", () => {
    renderDiscography({ sections: [], activeSection: "main" });
    expect(screen.getByText(d.empty)).toBeInTheDocument();
  });
});

describe("orden de la tabla (extend-album-quick-actions)", () => {
  const rows = [
    item("a", { title: "Aaa", year: 1985, community: { average: 3.9, count: 8 } }),
    item("b", { title: "Bbb", year: null, community: { average: null, count: 2 } }),
    item("c", { title: "Ccc", year: 1981, community: { average: 4.6, count: 12 } }),
  ];
  const titles = () => screen.getAllByRole("row").slice(1).map((row) => within(row).getByRole("link").textContent);

  function renderTable() {
    renderDiscography({
      sections: [{ key: "live", items: rows }],
      activeSection: "live",
      marks: { ...EMPTY_DISCOGRAPHY_MARKS, stars: { a: 4.5 } },
    });
  }

  it("por defecto ordena por año ascendente, con los discos sin año al final", () => {
    renderTable();
    expect(titles()).toEqual(["Ccc", "Aaa", "Bbb"]);
    expect(screen.getByRole("columnheader", { name: d.columns.year })).toHaveAttribute("aria-sort", "ascending");
  });

  it("Tú ordena de tu nota más alta a la más baja, sin nota al final", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: d.columns.you }));
    expect(titles()).toEqual(["Aaa", "Bbb", "Ccc"]);
    expect(screen.getByRole("columnheader", { name: d.columns.you })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: d.columns.year })).toHaveAttribute("aria-sort", "none");
  });

  it("Media ordena descendente y el segundo uso lo invierte, sin valor siempre al final", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: d.columns.average }));
    expect(titles()).toEqual(["Ccc", "Aaa", "Bbb"]);
    fireEvent.click(screen.getByRole("button", { name: d.columns.average }));
    expect(titles()).toEqual(["Aaa", "Ccc", "Bbb"]);
  });

  it("Año dos veces queda del más reciente al más antiguo", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: d.columns.year }));
    expect(titles()).toEqual(["Aaa", "Ccc", "Bbb"]);
  });

  it("Título ordena de la A a la Z y el segundo uso lo invierte", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: d.columns.title }));
    expect(titles()).toEqual(["Aaa", "Bbb", "Ccc"]);
    expect(screen.getByRole("columnheader", { name: d.columns.title })).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("button", { name: d.columns.title }));
    expect(titles()).toEqual(["Ccc", "Bbb", "Aaa"]);
  });
});

describe("sortDiscographyRows", () => {
  const rows = [
    { title: "Zeta", year: 2001 },
    { title: "Vol. 10", year: 1999 },
    { title: "Live", year: 1990 },
    { title: "Ænima", year: 1996 },
    { title: "Live", year: null },
    { title: "Vol. 2", year: 1995 },
    { title: "live", year: 1985 },
  ];
  const byTitle = (row: { title: string }) => row.title;
  const label = (row: { title: string; year: number | null }) => `${row.title} ${row.year ?? "?"}`;

  it("compara títulos según el idioma, con números y ligaduras, y desempata por año", () => {
    expect(sortDiscographyRows(rows, byTitle, "asc", titleCollator("es")).map(label)).toEqual([
      "Ænima 1996",
      "live 1985",
      "Live 1990",
      "Live ?",
      "Vol. 2 1995",
      "Vol. 10 1999",
      "Zeta 2001",
    ]);
  });

  it("al invertir el título, el desempate por año se mantiene ascendente", () => {
    expect(sortDiscographyRows(rows, byTitle, "desc", titleCollator("es")).map(label)).toEqual([
      "Zeta 2001",
      "Vol. 10 1999",
      "Vol. 2 1995",
      "live 1985",
      "Live 1990",
      "Live ?",
      "Ænima 1996",
    ]);
  });
});

describe("buscador de la discografía (add-discography-search)", () => {
  const s = d.search;
  // 20 discos en total: 17 de relleno en Principal y los que interesan en En vivo y Sencillos.
  const searchSections = () => [
    {
      key: "main" as const,
      items: Array.from({ length: 17 }, (_, i) => item(`m${i}`, { title: `Estudio ${i}` })),
    },
    { key: "live" as const, items: [item("l1", { title: "Live: Home Sweet Home Tour", section: "live" })] },
    {
      key: "singles" as const,
      items: [
        item("s1", { title: "Home Sweet Home", section: "singles", year: 1985 }),
        item("s2", { title: "Don’t Go Away Mad", section: "singles", year: 1990 }),
      ],
    },
  ];
  const type = (text: string) => fireEvent.change(screen.getByRole("searchbox", { name: s.label }), { target: { value: text } });

  it("no se ofrece con menos de 20 discos", () => {
    renderDiscography({ sections: sections({ main: 12, live: 7 }) });
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: s.open })).not.toBeInTheDocument();
  });

  it("agrupa las coincidencias de todas las secciones y las pastillas muestran sus conteos", () => {
    renderDiscography({ sections: searchSections() });
    type("home");
    const table = screen.getByRole("table");
    expect(within(table).getByText(d.sections.live)).toBeInTheDocument();
    expect(within(table).getByText(d.sections.singles)).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "Home Sweet Home" })).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "Live: Home Sweet Home Tour" })).toBeInTheDocument();
    expect(within(table).queryByRole("link", { name: "Don’t Go Away Mad" })).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: d.sectionsLabel });
    // El nombre accesible une la sección y su conteo ("Principal0"), igual que las pastillas de sección.
    expect(within(nav).getByRole("button", { name: `${d.sections.main}0` })).toBeDisabled();
    expect(within(nav).getByRole("button", { name: `${d.sections.singles}1` })).toBeEnabled();
    expect(screen.getByText("2 resultados en la discografía")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: d.viewLabel })).not.toBeInTheDocument();
  });

  it("tolera el apóstrofo tipográfico y ofrece el menú de acciones en los resultados", () => {
    renderDiscography({ sections: searchSections() });
    type("dont go");
    expect(screen.getByRole("link", { name: "Don’t Go Away Mad" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: catalogEs.albumActions.open.replace("{title}", "Don’t Go Away Mad") }),
    ).toBeInTheDocument();
  });

  it("Esc vacía la búsqueda y vuelve la sección en grilla", () => {
    renderDiscography({ sections: searchSections() });
    type("home");
    expect(screen.getByRole("table")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("searchbox", { name: s.label }), { key: "Escape" });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: d.viewGrid })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /Estudio 0/ })).toBeInTheDocument();
  });

  it("el botón de borrar también restaura la sección", () => {
    renderDiscography({ sections: searchSections() });
    type("home");
    fireEvent.click(screen.getByRole("button", { name: s.clear }));
    expect(screen.getByRole("searchbox", { name: s.label })).toHaveValue("");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("sin coincidencias ofrece buscar en todo el catálogo", () => {
    renderDiscography({ sections: searchSections() });
    type("zzz");
    expect(screen.getByText(/«zzz»/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: s.searchCatalog })).toHaveAttribute("href", "/search?type=album&q=zzz");
  });

  it("avisa si la discografía todavía se está completando", () => {
    renderDiscography({ sections: searchSections(), discographyComplete: false });
    expect(screen.queryByText(s.incomplete)).not.toBeInTheDocument();
    type("home");
    expect(screen.getByText(s.incomplete)).toBeInTheDocument();
  });
});
