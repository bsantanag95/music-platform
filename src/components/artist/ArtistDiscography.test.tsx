import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { EMPTY_DISCOGRAPHY_MARKS, type ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import type { DiscographySection } from "@/services/catalog/discography-sections";
import {
  ArtistDiscography,
  DECADE_SEPARATORS_MIN,
  GRID_PAGE_SIZE,
  discographyBlocks,
  sectionFromSearch,
  sortDiscographyRows,
  titleCollator,
} from "./ArtistDiscography";

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

  it("grilla: EP en su bloque, Mejor valorado y marcas personales", () => {
    renderDiscography({
      sections: [{ key: "main", items: [item("ep", { isEp: true }), item("dsotm", { community: { average: 4.6, count: 40 } })] }],
      bestRatedId: "dsotm",
      marks: { ...EMPTY_DISCOGRAPHY_MARKS, listened: ["ep"], stars: { dsotm: 4.5 }, favorites: ["dsotm"], pending: ["ep"] },
    });
    const ep = screen.getByText("Disco ep").closest("a")!;
    // Con álbumes y EP, el EP va en su bloque y no lleva etiqueta propia.
    const epBlock = screen.getByRole("region", { name: new RegExp(`^${d.blocks.eps}`) });
    expect(within(epBlock).getByText("Disco ep")).toBeInTheDocument();
    expect(within(ep).queryByText(d.ep)).not.toBeInTheDocument();
    expect(within(ep).getByText(d.listened)).toBeInTheDocument();
    const best = screen.getByText("Disco dsotm").closest("a")!;
    expect(within(best).getByText(`★ ${d.bestRated}`)).toBeInTheDocument();
    expect(within(best).getByText("Tu nota: 4,5")).toBeInTheDocument();
    // Favorito y Pendiente, con texto accesible.
    expect(within(best).getByText(d.favorite)).toBeInTheDocument();
    expect(within(ep).getByText(d.pendingMark)).toBeInTheDocument();
  });

  describe("Principal ordenada (refine-artist-page-phase2)", () => {
    const studio = (id: string, year: number, overrides: Partial<ArtistDiscographyItem> = {}) =>
      item(id, { year, ...overrides });

    it("parte Principal en Álbumes y EP solo si tiene los dos", () => {
      const albums = [studio("a", 1980)];
      const eps = [studio("e", 1979, { isEp: true })];
      expect(discographyBlocks("main", [...eps, ...albums]).map((b) => [b.key, b.items.length])).toEqual([
        ["albums", 1],
        ["eps", 1],
      ]);
      expect(discographyBlocks("main", albums).map((b) => b.key)).toEqual(["main"]);
      expect(discographyBlocks("live", [...eps, ...albums]).map((b) => b.key)).toEqual(["live"]);
    });

    it("grilla: Álbumes primero y EP debajo, cada uno con su cantidad", () => {
      renderDiscography({
        sections: [{ key: "main", items: [studio("e1", 1979, { isEp: true }), studio("a1", 1980), studio("a2", 1981)] }],
      });
      const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
      expect(headings).toEqual([`${d.blocks.albums}2`, `${d.blocks.eps}1`]);
    });

    it("una Principal solo de EP no se parte y conserva la etiqueta EP", () => {
      renderDiscography({ sections: [{ key: "main", items: [studio("e1", 1979, { isEp: true })] }] });
      expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
      expect(screen.getByText(d.ep)).toBeInTheDocument();
    });

    it("tabla de Principal: un grupo por bloque", () => {
      renderDiscography({
        sections: [{ key: "main", items: [studio("e1", 1979, { isEp: true }), studio("a1", 1980)] }],
      });
      fireEvent.click(screen.getByRole("button", { name: d.viewTable }));
      const groups = screen.getAllByRole("rowheader").map((h) => h.textContent);
      expect(groups).toEqual([`${d.blocks.albums} · 1`, `${d.blocks.eps} · 1`]);
    });

    it("disco sin carátula: título y año en el cuadro en lugar del vinilo", () => {
      renderDiscography({
        sections: [{ key: "main", items: [studio("sin", 1983, { coverThumbUrl: null, title: "Christmas EP" })] }],
      });
      const tile = screen.getByTestId("title-tile");
      expect(tile).toHaveTextContent("Christmas EP1983");
      expect(tile).toHaveAttribute("aria-hidden", "true");
    });

    it(`separa por décadas desde ${DECADE_SEPARATORS_MIN} discos y no antes`, () => {
      const many = Array.from({ length: DECADE_SEPARATORS_MIN }, (_, i) => studio(`d${i}`, 1978 + i * 2));
      const { unmount } = renderDiscography({ sections: [{ key: "live", items: many }] , activeSection: "live" });
      fireEvent.click(screen.getByRole("button", { name: d.viewGrid }));
      expect(screen.getAllByText(/^Años /).map((el) => el.textContent)).toEqual(["Años 70", "Años 80", "Años 90", "Años 2000"]);
      unmount();
      renderDiscography({ sections: [{ key: "main", items: many.slice(0, DECADE_SEPARATORS_MIN - 1) }] });
      expect(screen.queryByText(/^Años /)).not.toBeInTheDocument();
    });

    it("los discos sin año van bajo 'Sin año'", () => {
      const many = [
        ...Array.from({ length: DECADE_SEPARATORS_MIN }, (_, i) => studio(`d${i}`, 1990 + i)),
        studio("x", 0, { year: null }),
      ];
      renderDiscography({ sections: [{ key: "main", items: many }] });
      expect(screen.getByText(d.noYear)).toBeInTheDocument();
    });
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

  describe("cambio de sección sin ida al servidor (refine-artist-page-phase1)", () => {
    it("muestra la sección en el cliente y la escribe en la URL", () => {
      const push = vi.spyOn(window.history, "pushState");
      renderDiscography();
      const nav = screen.getByRole("navigation", { name: d.sectionsLabel });
      fireEvent.click(within(nav).getByRole("link", { name: /En vivo/ }));
      expect(push).toHaveBeenCalledWith(null, "", `/es/artist/${ARTIST}?section=live`);
      expect(within(nav).getByRole("link", { name: /En vivo/ })).toHaveAttribute("aria-current", "page");
      // En vivo se abre en tabla: 95 filas más el encabezado.
      expect(screen.getAllByRole("row")).toHaveLength(96);
    });

    it("volver a la sección por defecto deja la URL sin parámetro", () => {
      const push = vi.spyOn(window.history, "pushState");
      renderDiscography({ activeSection: "live" });
      fireEvent.click(screen.getByRole("link", { name: /Principal/ }));
      expect(push).toHaveBeenCalledWith(null, "", `/es/artist/${ARTIST}`);
    });

    it("un clic con Ctrl deja que el navegador abra la pestaña nueva", () => {
      const push = vi.spyOn(window.history, "pushState");
      renderDiscography();
      fireEvent.click(screen.getByRole("link", { name: /En vivo/ }), { ctrlKey: true });
      expect(push).not.toHaveBeenCalled();
    });

    it("'atrás' recupera la sección de la URL", () => {
      renderDiscography({ activeSection: "live" });
      window.history.replaceState(null, "", "/es/artist/a1");
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      expect(screen.getByRole("link", { name: /Principal/ })).toHaveAttribute("aria-current", "page");
    });

    it("una sección desconocida o vacía cae en la primera", () => {
      const list = sections({ main: 2, live: 1 });
      expect(sectionFromSearch("?section=live", list)).toBe("live");
      expect(sectionFromSearch("?section=nada", list)).toBe("main");
      expect(sectionFromSearch("", sections({ live: 1 }))).toBe("live");
    });
  });

  describe("columnas de la tabla según los datos (refine-artist-page-phase1)", () => {
    const headers = () => screen.getAllByRole("columnheader").map((h) => h.textContent);

    it("sin sesión no muestra 'Tú' y sin medias no muestra 'Media'", () => {
      renderDiscography({ sections: [{ key: "live", items: [item("x")] }], activeSection: "live" });
      expect(headers()).not.toContain(d.columns.you);
      expect(headers()).not.toContain(d.columns.average);
    });

    it("con sesión y algún disco sobre el umbral muestra las dos", () => {
      renderDiscography({
        sections: [{ key: "live", items: [item("x"), item("y", { community: { average: 4.2, count: 9 } })] }],
        activeSection: "live",
        marks: EMPTY_DISCOGRAPHY_MARKS,
      });
      expect(headers()).toEqual(expect.arrayContaining([d.columns.you, d.columns.average]));
    });
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

  // openspec: define-detailed-score, D10 — el orden "Tú" desempata por puntaje detallado propio.
  describe("desempate por puntaje detallado en Tú", () => {
    const rated = [
      { title: "Setenta y dos", year: 2000, stars: 4, score: 72 },
      { title: "Media", year: 2002, stars: 4.5, score: 95 },
      { title: "Sin nota", year: 2005, stars: null, score: null },
      { title: "Cuatro liso", year: 2004, stars: 4, score: null },
      { title: "Setenta y ocho", year: 2003, stars: 4, score: 78 },
    ];
    const byStars = (row: (typeof rated)[number]) => row.stars;
    const byScore = (row: (typeof rated)[number]) => row.score;
    const title = (row: (typeof rated)[number]) => row.title;

    it("descendente pone 4,5★ primero y desempata por puntaje, con los sin puntaje y sin nota al final", () => {
      expect(sortDiscographyRows(rated, byStars, "desc", titleCollator("es"), byScore).map(title)).toEqual([
        "Media",
        "Setenta y ocho",
        "Setenta y dos",
        "Cuatro liso",
        "Sin nota",
      ]);
    });

    it("ascendente invierte estrellas y puntaje y deja los sin valor al final", () => {
      expect(sortDiscographyRows(rated, byStars, "asc", titleCollator("es"), byScore).map(title)).toEqual([
        "Setenta y dos",
        "Setenta y ocho",
        "Cuatro liso",
        "Media",
        "Sin nota",
      ]);
    });
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

describe("filtro personal (refine-artist-page-phase3)", () => {
  const discs = [item("a", { year: 1970 }), item("b", { year: 1971 }), item("c", { year: 1972 })];
  const card = (title: string) => screen.getByText(title).closest("li")!;

  it("sin sesión o sin marcas no se ofrece", () => {
    const { unmount } = renderDiscography({ sections: [{ key: "main", items: discs }] });
    expect(screen.queryByRole("group", { name: d.filter.label })).not.toBeInTheDocument();
    unmount();
    renderDiscography({ sections: [{ key: "main", items: discs }], marks: EMPTY_DISCOGRAPHY_MARKS });
    expect(screen.queryByRole("group", { name: d.filter.label })).not.toBeInTheDocument();
  });

  it("'Sin valorar' atenúa los valorados y 'Tuyos' los que no tienen marcas, sin esconder ninguno", () => {
    renderDiscography({
      sections: [{ key: "main", items: discs }],
      marks: { ...EMPTY_DISCOGRAPHY_MARKS, stars: { a: 4 }, pending: ["b"] },
    });
    const group = screen.getByRole("group", { name: d.filter.label });
    expect(within(group).getByRole("button", { name: new RegExp(`^${d.filter.unrated}\\s*2$`) })).toBeInTheDocument();
    fireEvent.click(within(group).getByRole("button", { name: new RegExp(`^${d.filter.unrated}\\s*2$`) }));
    expect(card("Disco a")).toHaveClass("opacity-35");
    expect(card("Disco b")).not.toHaveClass("opacity-35");
    fireEvent.click(within(group).getByRole("button", { name: new RegExp(`^${d.filter.yours}\\s*2$`) }));
    expect(card("Disco c")).toHaveClass("opacity-35");
    expect(card("Disco a")).not.toHaveClass("opacity-35");
    for (const title of ["Disco a", "Disco b", "Disco c"]) expect(screen.getByText(title)).toBeVisible();
  });

  it("se activa con el evento del panel", () => {
    renderDiscography({ sections: [{ key: "main", items: discs }], marks: { ...EMPTY_DISCOGRAPHY_MARKS, stars: { a: 4 } } });
    act(() => {
      window.dispatchEvent(new CustomEvent("artist-discography-filter", { detail: "unrated" }));
    });
    expect(screen.getByRole("button", { name: new RegExp(`^${d.filter.unrated}\\s*2$`) })).toHaveAttribute("aria-pressed", "true");
  });
});
});
