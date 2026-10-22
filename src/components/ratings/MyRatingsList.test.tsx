import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import catalogEs from "../../../messages/es/catalog.json";
import { MyRatingsList } from "./MyRatingsList";
import { RATING_VIEW_MODE_STORAGE_KEY } from "./rating-view-mode";
import { MY_RATING_STAR_VALUES, type MyRatingEntry, type MyRatingsFacets, type MyRatingsListResponse } from "@/lib/api/schemas";

// openspec: add-my-ratings-library (design D4–D7).

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ priority }: { priority?: boolean }) => <span data-testid="cover" data-priority={String(Boolean(priority))} />,
}));

const mocks = vi.hoisted(() => ({
  getMyRatings: vi.fn(),
  getRatings: vi.fn(),
  deleteRating: vi.fn(),
  saveRating: vi.fn(),
  highlightRating: vi.fn(),
  unhighlightRating: vi.fn(),
}));
vi.mock("@/lib/api/ratings", () => ({ getMyRatings: mocks.getMyRatings }));
vi.mock("@/lib/api/social", () => ({
  getRatings: mocks.getRatings,
  deleteRating: mocks.deleteRating,
  saveRating: mocks.saveRating,
  highlightRating: mocks.highlightRating,
  unhighlightRating: mocks.unhighlightRating,
}));

const t = ratingsEs;
const detail = catalogEs.album.relation.detail;

function uuid(n: number) {
  return `550e8400-e29b-41d4-a716-4466554400${String(n).padStart(2, "0")}`;
}

function entry(n: number, title: string, stars: number, detailedScore: number | null, year = 1987): MyRatingEntry {
  return {
    id: uuid(n),
    targetType: "release-group",
    stars,
    detailedScore,
    updatedAt: "2026-10-01T10:00:00.000Z",
    target: { id: uuid(n + 50), title, coverThumbUrl: null, artistName: "Heart", artistId: uuid(90), year },
  };
}

function song(n: number, title: string, stars: number, detailedScore: number | null): MyRatingEntry {
  return {
    id: uuid(n),
    targetType: "recording",
    stars,
    detailedScore,
    updatedAt: "2026-10-01T10:00:00.000Z",
    target: { id: uuid(n + 50), title, coverThumbUrl: null, artistName: "Heart", artistId: uuid(90), year: 1976 },
  };
}

// Facetas coherentes con las entradas (sin filtros): cubos de estrellas y cantidad por tipo.
function facetsFor(items: MyRatingEntry[], years: number[] = [2012, 1987]): MyRatingsFacets {
  const albums = items.filter((item) => item.targetType === "release-group").length;
  return {
    years,
    stars: MY_RATING_STAR_VALUES.map((value) => ({ value, count: items.filter((item) => item.stars === value).length })),
    types: { "release-group": albums, recording: items.length - albums },
  };
}

function page(items: MyRatingEntry[], overrides: Partial<MyRatingsListResponse> = {}): MyRatingsListResponse {
  const albums = items.filter((item) => item.targetType === "release-group").length;
  return {
    items,
    page: 1,
    pageSize: 30,
    hasNext: false,
    total: items.length,
    counts: { "release-group": albums, recording: items.length - albums },
    facets: facetsFor(items),
    ...overrides,
  };
}

const safe = entry(1, "Safe and Sound", 5, 99, 2012);
const bad = entry(2, "Bad Animals", 4.5, 86);
const girl = entry(3, "There’s the Girl", 3, null);

function renderList(initial: MyRatingsListResponse, initialFilters?: Parameters<typeof MyRatingsList>[0]["initialFilters"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <MyRatingsList initial={initial} initialFilters={initialFilters} />
    </QueryClientProvider>,
  );
}

// Margen para esperas que cruzan un debounce o un refetch: con la suite entera corriendo en paralelo
// el segundo por defecto de `waitFor` se queda corto.
const SLOW = { timeout: 4000 };
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;
const mode = (name: string) => screen.getByRole("radio", { name });
// Barra del histograma de estrellas y segmento de tipo (reemplazan a los selectores de estrellas y tipo).
const bar = (value: string, count: string) => screen.getByRole("button", { name: `${value} estrellas: ${count}` });
const segment = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) });
const titles = () => screen.getAllByRole("article").map((row) => row.querySelector("a")?.textContent);

// El entorno de test no expone un `localStorage` funcional: se instala uno en memoria. La mayoría de
// estas pruebas miran las filas de Detallada, así que parten con esa preferencia guardada; el
// defecto (Gráfico) se prueba aparte con el almacenamiento vacío.
function installStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
      clear: () => map.clear(),
    } as unknown as Storage,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/es/me/ratings");
  installStorage({ [RATING_VIEW_MODE_STORAGE_KEY]: "detailed" });
});

describe("MyRatingsList", () => {
  it("muestra el total y una fila por valoración, en el orden recibido", () => {
    renderList(page([safe, bad, girl]));
    expect(screen.getByText("3 valoraciones")).toBeInTheDocument();
    expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]);
    expect(screen.getByRole("button", { name: "99/100" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.untunedAction })).toHaveTextContent(t.untuned);
    expect(mocks.getMyRatings).not.toHaveBeenCalled();
  });

  it("sin valoraciones dice que está vacío y enlaza a Explorar", () => {
    renderList(page([], { facets: facetsFor([], []) }));
    expect(screen.getByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText("Sin valoraciones")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.emptyCta })).toHaveAttribute("href", "/search");
    expect(screen.queryByRole("button", { name: t.clearFilters })).not.toBeInTheDocument();
  });

  it("el selector de año ofrece solo los años con valoraciones", () => {
    renderList(page([safe, bad]));
    const years = Array.from(select(t.yearFilterLabel).options).map((option) => option.value);
    expect(years).toEqual(["", "2012", "1987"]);
  });

  it("las opciones de orden son mejor nota, peor nota, más reciente y título", () => {
    renderList(page([safe]));
    expect(Array.from(select(t.sortLabel).options).map((option) => option.textContent)).toEqual([
      t.sortBest,
      t.sortWorst,
      t.sortRecent,
      t.sortTitle,
    ]);
    expect(select(t.sortLabel)).toHaveValue("best");
  });

  it("cambiar el orden pide la lista con ese orden y lo refleja en la URL", async () => {
    mocks.getMyRatings.mockResolvedValue(page([girl, bad, safe]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(select(t.sortLabel), { target: { value: "worst" } });

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 30, expect.objectContaining({ sort: "worst" })));
    await waitFor(() => expect(titles()).toEqual(["There’s the Girl", "Bad Animals", "Safe and Sound"]));
    expect(window.location.search).toBe("?sort=worst");
  });

  it("filtrar por año pide ese año, lo refleja en la URL y deshabilita la década", async () => {
    mocks.getMyRatings.mockResolvedValue(page([bad, girl]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(select(t.yearFilterLabel), { target: { value: "1987" } });

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 30, expect.objectContaining({ year: 1987 })));
    await waitFor(() => expect(titles()).toEqual(["Bad Animals", "There’s the Girl"]));
    expect(window.location.search).toBe("?year=1987");
    expect(select(t.decadeFilterLabel)).toBeDisabled();
  });

  it("estrellas, tipo y década se combinan en una sola consulta", async () => {
    mocks.getMyRatings.mockResolvedValue(page([girl]));
    renderList(page([safe, bad, girl]));

    fireEvent.click(bar("3,0", "1 valoración"));
    fireEvent.click(segment(t.sectionAlbums));
    fireEvent.change(select(t.decadeFilterLabel), { target: { value: "1980" } });

    await waitFor(() =>
      expect(mocks.getMyRatings).toHaveBeenLastCalledWith(
        1,
        30,
        expect.objectContaining({ stars: 3, type: "release-group", decade: 1980 }),
      ),
    );
    expect(window.location.search).toBe("?stars=3&type=release-group&decade=1980");
  });

  it("los filtros iniciales de la URL preseleccionan los controles", () => {
    renderList(page([bad, girl]), { year: 1987, sort: "recent" });
    expect(select(t.yearFilterLabel)).toHaveValue("1987");
    expect(select(t.sortLabel)).toHaveValue("recent");
    expect(select(t.decadeFilterLabel)).toBeDisabled();
    expect(mocks.getMyRatings).not.toHaveBeenCalled();
  });

  it("sin resultados con filtros ofrece limpiarlos y restaura la lista", async () => {
    mocks.getMyRatings.mockResolvedValueOnce(page([], { total: 0 })).mockResolvedValue(page([safe, bad, girl]));
    renderList(page([safe, bad, girl]));

    fireEvent.click(bar("1,0", "sin valoraciones"));
    expect(await screen.findByText(t.noResultsTitle)).toBeInTheDocument();
    expect(screen.queryByText(t.emptyTitle)).not.toBeInTheDocument();
    // Cabecera honesta y un único "Limpiar filtros" (el del estado vacío).
    expect(screen.getByText("Ningún resultado")).toBeInTheDocument();
    expect(screen.queryByText("Sin valoraciones")).not.toBeInTheDocument();
    expect(screen.queryByText("sin álbumes")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: t.clearFilters })).toHaveLength(1);
    // El conmutador de modo sigue a mano para quien filtra sin resultados.
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t.clearFilters }));

    await waitFor(() => expect(titles()).toHaveLength(3));
    expect(bar("1,0", "sin valoraciones")).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: t.clearFilters })).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("'Cargar más' pide la página siguiente, suma las filas y lo anuncia", async () => {
    mocks.getMyRatings.mockResolvedValue(page([girl], { page: 2, hasNext: false, total: 3 }));
    renderList(page([safe, bad], { hasNext: true, total: 3 }));

    fireEvent.click(screen.getByRole("button", { name: t.loadMore }));

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(2, 30, expect.any(Object)));
    await waitFor(() => expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]));
    expect(screen.queryByRole("button", { name: t.loadMore })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 valoración más cargada"));
  });

  it("un error al cargar muestra el aviso", async () => {
    mocks.getMyRatings.mockRejectedValue(new Error("red"));
    renderList(page([safe, bad]));

    fireEvent.change(select(t.sortLabel), { target: { value: "title" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadError);
  });

  it("borrar una valoración quita su fila, baja el total y lo anuncia", async () => {
    mocks.deleteRating.mockResolvedValue(null);
    mocks.getRatings.mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } });
    renderList(page([safe, bad]));

    fireEvent.click(screen.getByRole("button", { name: "86/100" }));
    fireEvent.click(screen.getByRole("button", { name: detail.delete }));
    fireEvent.click(await screen.findByRole("button", { name: detail.deleteConfirm }));

    await waitFor(() => expect(titles()).toEqual(["Safe and Sound"]));
    expect(screen.getByText("1 valoración")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(t.deletedAnnouncement);
  });

  it("editar una fila no la reordena (queda en su lugar hasta reordenar o recargar)", async () => {
    mocks.saveRating.mockResolvedValue({});
    renderList(page([safe, bad, girl]));

    // 4,5★ · 86 → 5★ pasaría a competir con "Safe and Sound", pero la fila no se mueve.
    fireEvent.click(screen.getAllByRole("radio", { name: "5,0 estrellas" })[1]!);

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalled());
    // La fila editada perdió su puntaje (incoherente con 5★) y ahora es una de las dos "Sin afinar".
    await waitFor(() => expect(screen.getAllByRole("button", { name: t.untunedAction })).toHaveLength(2));
    expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]);
  });

  it("agrupa por tipo: secciones Álbumes y Canciones con su contador", () => {
    renderList(page([safe, bad, song(4, "Barracuda", 4, 80)]));
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([`${t.sectionAlbums}2`, `${t.sectionSongs}1`]);
    expect(screen.getByText("2 álbumes")).toBeInTheDocument();
    expect(screen.getByText("1 canción")).toBeInTheDocument();
  });

  it("una sección sin valoraciones se omite", () => {
    renderList(page([song(4, "Barracuda", 4, 80)]));
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([`${t.sectionSongs}1`]);
  });

  it("'Sin agrupar' pide group=none, quita los encabezados y lo refleja en la URL", async () => {
    mocks.getMyRatings.mockResolvedValue(page([song(4, "Barracuda", 5, 97), safe]));
    renderList(page([safe, song(4, "Barracuda", 5, 97)]));

    fireEvent.change(select(t.groupLabel), { target: { value: "none" } });

    await waitFor(
      () => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 30, expect.objectContaining({ group: "none" })),
      SLOW,
    );
    await waitFor(() => expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0), SLOW);
    expect(titles()).toEqual(["Barracuda", "Safe and Sound"]);
    expect(window.location.search).toBe("?group=none");
  });

  it("los selectores muestran su nombre visible", () => {
    renderList(page([safe]));
    for (const name of [t.yearFilterLabel, t.decadeFilterLabel, t.sortLabel, t.groupLabel]) {
      expect(screen.getAllByText(name).some((node) => node.tagName === "SPAN" && node.getAttribute("aria-hidden") === "true"), name).toBe(true);
    }
  });

  it("'Por artista' pide group=artist y lo refleja en la URL", async () => {
    mocks.getMyRatings.mockResolvedValue(page([safe]));
    renderList(page([safe, bad]));

    fireEvent.change(select(t.groupLabel), { target: { value: "artist" } });

    await waitFor(() =>
      expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 30, expect.objectContaining({ group: "artist" })),
    );
    expect(window.location.search).toBe("?group=artist");
  });

  it("agrupado por artista: una sección por artista con Álbumes y Canciones separados y su contador", () => {
    const mann = (n: number, title: string) => ({
      ...entry(n, title, 4, 80),
      target: { ...entry(n, title, 4, 80).target, artistName: "Aimee Mann", artistId: uuid(95) },
    });
    renderList(
      page([mann(7, "Bachelor No. 2"), safe, bad, song(4, "Barracuda", 4, 80)], undefined),
      { group: "artist" },
    );

    const h2 = screen.getAllByRole("heading", { level: 2 });
    // Todo está cargado (sin página siguiente): cada artista lleva su contador exacto.
    expect(h2.map((heading) => heading.textContent)).toEqual(["Aimee Mann1", "Heart3"]);
    expect(within(h2[1]!).getByRole("link", { name: "Heart" })).toBeInTheDocument();

    const h3 = screen.getAllByRole("heading", { level: 3 });
    expect(h3.map((heading) => heading.textContent)).toEqual([t.sectionAlbums, t.sectionAlbums, t.sectionSongs]);
  });

  it("agrupado por artista con más páginas por cargar: sin contador de artista y con la nota de orden", () => {
    renderList(page([safe, bad], { hasNext: true, total: 5 }), { group: "artist" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Heart"]);
    expect(screen.getByText(t.artistOrderNote)).toBeInTheDocument();
  });

  it("agrupado por artista: lo sin artista va al final como 'Sin artista', sin enlace", () => {
    const noArtist = {
      ...song(4, "Barracuda", 4, 80),
      target: { ...song(4, "Barracuda", 4, 80).target, artistName: null, artistId: null },
    };
    renderList(page([safe, noArtist]), { group: "artist" });
    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2.map((heading) => heading.textContent)).toEqual(["Heart1", `${t.sectionNoArtist}1`]);
    expect(within(h2[1]!).queryByRole("link")).toBeNull();
  });

  it("por artista: las filas no repiten el artista ni el tipo, y conservan el año", () => {
    renderList(page([safe, song(4, "Barracuda", 4, 80)]), { group: "artist" });
    const rows = screen.getAllByRole("article");
    for (const row of rows) {
      expect(row).not.toHaveTextContent("Heart");
      expect(row).not.toHaveTextContent(t.typeAlbum);
      expect(row).not.toHaveTextContent(t.typeSong);
    }
    expect(rows[0]).toHaveTextContent("2012");
  });

  it("por tipo: las filas muestran el artista pero no el tipo", () => {
    renderList(page([safe, song(4, "Barracuda", 4, 80)]));
    for (const row of screen.getAllByRole("article")) {
      expect(row).toHaveTextContent("Heart");
      expect(row).not.toHaveTextContent(t.typeAlbum);
      expect(row).not.toHaveTextContent(t.typeSong);
    }
  });

  it("sin agrupar: las filas muestran artista y tipo", () => {
    renderList(page([safe, song(4, "Barracuda", 4, 80)]), { group: "none" });
    const rows = screen.getAllByRole("article");
    expect(rows[0]).toHaveTextContent(`Heart·${t.typeAlbum}`);
    expect(rows[1]).toHaveTextContent(`Heart·${t.typeSong}`);
  });

  it("modo Índice por artista: sin artista ni tipo en la fila, con el año", () => {
    renderList(page([safe]), { group: "artist" });
    fireEvent.click(mode(t.viewMode.index));
    const row = screen.getByRole("link", { name: /Safe and Sound/ }).closest("li")!;
    expect(row).not.toHaveTextContent("Heart");
    expect(row).not.toHaveTextContent(t.typeAlbum);
    expect(row).toHaveTextContent("2012");
  });

  it("modo Índice sin agrupar: artista, tipo y año", () => {
    renderList(page([safe]), { group: "none" });
    fireEvent.click(mode(t.viewMode.index));
    const row = screen.getByRole("link", { name: /Safe and Sound/ }).closest("li")!;
    expect(row).toHaveTextContent("Heart");
    expect(row).toHaveTextContent(`${t.typeAlbum} · 2012`);
  });

  it("el filtro de tipo ofrece Todo, Álbumes y Canciones, sin artistas, y ya no hay selectores de tipo ni estrellas", () => {
    renderList(page([safe, song(4, "Barracuda", 4, 80)]));
    const group = screen.getByRole("group", { name: t.typeFilterLabel });
    expect(within(group).getAllByRole("button").map((button) => button.textContent)).toEqual([
      `${t.typeSegmentAll}2`,
      `${t.sectionAlbums}1`,
      `${t.sectionSongs}1`,
    ]);
    expect(screen.queryByLabelText(t.typeFilterLabel, { selector: "select" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(t.starsFilterLabel, { selector: "select" })).not.toBeInTheDocument();
  });

  it("buscar pide q tras una pausa y lo refleja en la URL", async () => {
    mocks.getMyRatings.mockResolvedValue(page([bad]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(screen.getByLabelText(t.searchPlaceholder), { target: { value: "bad" } });

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 30, expect.objectContaining({ q: "bad" })), SLOW);
    await waitFor(() => expect(titles()).toEqual(["Bad Animals"]), SLOW);
    expect(window.location.search).toBe("?q=bad");
  });

  it("los filtros iniciales q y group preseleccionan los controles", () => {
    renderList(page([bad]), { q: "bad", group: "none" });
    expect(screen.getByLabelText(t.searchPlaceholder)).toHaveValue("bad");
    expect(select(t.groupLabel)).toHaveValue("none");
    expect(mocks.getMyRatings).not.toHaveBeenCalled();
  });

  it("sin preferencia guardada abre en modo Gráfico (la pared de carátulas)", () => {
    installStorage();
    renderList(page([safe, girl]));
    expect(mode(t.viewMode.graphic)).toBeChecked();
    expect(screen.getAllByTestId("rating-overlay")).toHaveLength(2);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("una preferencia guardada distinta del defecto manda sobre Gráfico", () => {
    installStorage({ [RATING_VIEW_MODE_STORAGE_KEY]: "index" });
    renderList(page([safe]));
    expect(mode(t.viewMode.index)).toBeChecked();
    expect(screen.queryAllByTestId("rating-overlay")).toHaveLength(0);
  });

  it("el modo de visualización no viaja en la URL", () => {
    renderList(page([safe]));
    fireEvent.click(mode(t.viewMode.index));
    expect(window.location.search).toBe("");
  });

  it("modo Índice: filas de texto sin carátula con la nota a la derecha", () => {
    renderList(page([safe, bad]));
    fireEvent.click(mode(t.viewMode.index));
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryAllByTestId("cover")).toHaveLength(0);
    expect(screen.getByRole("link", { name: /Safe and Sound/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar la nota de Safe and Sound" })).toHaveTextContent("99/100");
  });

  it("modo Gráfico: una carátula por valoración con la nota en el overlay", () => {
    renderList(page([safe, girl]));
    fireEvent.click(mode(t.viewMode.graphic));
    expect(screen.getAllByTestId("rating-overlay")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Safe and Sound, Heart, Álbum, 5,0 estrellas, 99/100" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `There’s the Girl, Heart, Álbum, 3,0 estrellas, ${t.untuned}` })).toBeInTheDocument();
  });

  it("el contenedor no cambia de ancho al cambiar de modo (el ancho lo fija la página)", () => {
    const { container } = renderList(page([safe]));
    const root = container.firstElementChild as HTMLElement;
    const widthOf = () => root.className.split(" ").filter((name) => name.startsWith("max-w-"));
    expect(widthOf()).toEqual([]);
    fireEvent.click(mode(t.viewMode.graphic));
    expect(widthOf()).toEqual([]);
    fireEvent.click(mode(t.viewMode.index));
    expect(widthOf()).toEqual([]);
  });

  it("la cabecera cuenta resultados con filtros y conserva el total al solo ordenar", async () => {
    mocks.getMyRatings.mockResolvedValue(page([bad]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(select(t.sortLabel), { target: { value: "worst" } });
    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalled());
    expect(screen.queryByText(/resultado/)).not.toBeInTheDocument();

    fireEvent.click(bar("4,5", "1 valoración"));
    expect(await screen.findByText("1 resultado")).toBeInTheDocument();
    expect(screen.getByText("1 álbum")).toBeInTheDocument();
  });

  it("las carátulas de las seis primeras valoraciones se piden con prioridad", () => {
    const many = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => entry(n, `Disco ${n}`, 4, 80));
    renderList(page(many));
    const flags = screen.getAllByTestId("cover").map((cover) => cover.getAttribute("data-priority"));
    expect(flags).toEqual(["true", "true", "true", "true", "true", "true", "false", "false"]);
  });

  it("modo Índice sin agrupar: el artista va en su propia línea bajo sm y en línea desde sm", () => {
    renderList(page([safe]), { group: "none" });
    fireEvent.click(mode(t.viewMode.index));
    const artist = screen.getByText("Heart");
    expect(artist.className).toContain("block");
    expect(artist.className).toContain("sm:inline");
    expect(screen.getByRole("link", { name: /Safe and Sound/ }).className).toContain("sm:truncate");
  });

  it("el conmutador de modo no aparece sin valoraciones", () => {
    renderList(page([]));
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("desde la pared, 'Editar nota' abre el diálogo y afinar actualiza el overlay en su lugar", async () => {
    mocks.saveRating.mockResolvedValue({});
    mocks.getRatings.mockResolvedValue({
      own: { id: uuid(2), stars: 4.5, detailedScore: 88, createdAt: "", updatedAt: "2026-10-02T10:00:00.000Z" },
      aggregate: { count: 1, averageStars: null, averageDetailedScore: null },
    });
    renderList(page([safe, bad]));
    fireEvent.click(mode(t.viewMode.graphic));

    fireEvent.click(screen.getByRole("button", { name: "Editar la nota de Bad Animals" }));
    fireEvent.change(await screen.findByRole("slider"), { target: { value: "88" } });
    fireEvent.click(screen.getByRole("button", { name: detail.save }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", uuid(52), { detailedScore: 88 }));
    await waitFor(() => expect(screen.getByText("88/100")).toBeInTheDocument());
    expect(screen.getAllByTestId("rating-overlay")).toHaveLength(2);
  });

  it("borrar una canción baja el total y el contador de su tipo", async () => {
    mocks.deleteRating.mockResolvedValue(null);
    mocks.getRatings.mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } });
    renderList(page([safe, song(4, "Barracuda", 4, 80)]));

    fireEvent.click(screen.getByRole("button", { name: "80/100" }));
    fireEvent.click(screen.getByRole("button", { name: detail.delete }));
    fireEvent.click(await screen.findByRole("button", { name: detail.deleteConfirm }));

    await waitFor(() => expect(screen.getByText("1 valoración")).toBeInTheDocument());
    expect(screen.getByText("1 álbum")).toBeInTheDocument();
    expect(screen.getByText("sin canciones")).toBeInTheDocument();
    // La sección "Canciones" desaparece (el segmento de tipo sigue ahí, con 0).
    expect(screen.queryByRole("heading", { name: new RegExp(t.sectionSongs) })).not.toBeInTheDocument();
  });

  it("afinar desde la fila actualiza el puntaje sin reordenar", async () => {
    mocks.saveRating.mockResolvedValue({});
    mocks.getRatings.mockResolvedValue({
      own: { id: uuid(2), stars: 4.5, detailedScore: 88, createdAt: "", updatedAt: "2026-10-02T10:00:00.000Z" },
      aggregate: { count: 1, averageStars: null, averageDetailedScore: null },
    });
    renderList(page([safe, bad, girl]));

    fireEvent.click(screen.getByRole("button", { name: "86/100" }));
    fireEvent.change(await screen.findByRole("slider"), { target: { value: "88" } });
    fireEvent.click(screen.getByRole("button", { name: detail.save }));

    await waitFor(() => expect(screen.getByRole("button", { name: "88/100" })).toBeInTheDocument());
    expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]);
  });
  it("el resumen muestra el promedio y diez barras con su cantidad", () => {
    renderList(page([safe, bad, girl]));
    // (5 + 4,5 + 3) / 3 = 4,1666… → "4,2"
    expect(screen.getByText("Promedio 4,2★")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: t.histogramLabel });
    expect(within(group).getAllByRole("button")).toHaveLength(10);
    expect(bar("5,0", "1 valoración")).toHaveAttribute("aria-pressed", "false");
    expect(bar("2,0", "sin valoraciones")).toBeInTheDocument();
  });

  it("pulsar una barra filtra por esas estrellas y volver a pulsarla quita el filtro", async () => {
    mocks.getMyRatings.mockResolvedValue(page([bad], { facets: facetsFor([safe, bad, girl]) }));
    renderList(page([safe, bad, girl]));

    fireEvent.click(bar("4,5", "1 valoración"));

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 30, expect.objectContaining({ stars: 4.5 })));
    expect(window.location.search).toBe("?stars=4.5");
    expect(bar("4,5", "1 valoración")).toHaveAttribute("aria-pressed", "true");
    // Las demás barras conservan su cantidad (la faceta ignora su propio filtro) y el promedio es el filtrado.
    expect(bar("5,0", "1 valoración")).toBeInTheDocument();
    expect(screen.getByText("Promedio 4,5★")).toBeInTheDocument();

    mocks.getMyRatings.mockResolvedValue(page([safe, bad, girl]));
    fireEvent.click(bar("4,5", "1 valoración"));

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(bar("4,5", "1 valoración")).toHaveAttribute("aria-pressed", "false");
  });

  it("un segmento de tipo filtra y 'Todo' lo quita; el activo no se desactiva al pulsarlo", async () => {
    const barracuda = song(4, "Barracuda", 4, 80);
    mocks.getMyRatings.mockResolvedValue(page([barracuda], { facets: facetsFor([safe, barracuda]) }));
    renderList(page([safe, barracuda]));

    fireEvent.click(segment(t.sectionSongs));

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 30, expect.objectContaining({ type: "recording" })));
    expect(window.location.search).toBe("?type=recording");
    expect(segment(t.sectionSongs)).toHaveAttribute("aria-pressed", "true");

    mocks.getMyRatings.mockClear();
    fireEvent.click(segment(t.sectionSongs));
    expect(mocks.getMyRatings).not.toHaveBeenCalled();

    mocks.getMyRatings.mockResolvedValue(page([safe, barracuda]));
    fireEvent.click(segment(t.typeSegmentAll));
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("sin valoraciones no hay histograma ni promedio", () => {
    renderList(page([], { facets: facetsFor([], []) }));
    expect(screen.queryByRole("group", { name: t.histogramLabel })).not.toBeInTheDocument();
    expect(screen.queryByText(/Promedio/)).not.toBeInTheDocument();
  });

  it("con un filtro de estrellas activo y sin resultados el histograma sigue visible para quitarlo", async () => {
    mocks.getMyRatings.mockResolvedValue(page([], { total: 0, facets: facetsFor([safe, bad, girl]) }));
    renderList(page([safe, bad, girl]));

    fireEvent.click(bar("1,0", "sin valoraciones"));

    expect(await screen.findByText(t.noResultsTitle)).toBeInTheDocument();
    expect(bar("1,0", "sin valoraciones")).toHaveAttribute("aria-pressed", "true");
  });

  it("cambiar las estrellas de una fila ajusta el histograma y el promedio sin reordenar", async () => {
    mocks.saveRating.mockResolvedValue({});
    renderList(page([safe, bad, girl]));
    expect(bar("5,0", "1 valoración")).toBeInTheDocument();

    // "Bad Animals" 4,5★ → 5★: el cubo de 5★ pasa a 2 y el de 4,5★ a 0.
    fireEvent.click(screen.getAllByRole("radio", { name: "5,0 estrellas" })[1]!);

    await waitFor(() => expect(bar("5,0", "2 valoraciones")).toBeInTheDocument());
    expect(bar("4,5", "sin valoraciones")).toBeInTheDocument();
    // (5 + 5 + 3) / 3 = 4,333… → "4,3"
    expect(screen.getByText("Promedio 4,3★")).toBeInTheDocument();
    expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]);
  });

  it("borrar una canción baja su barra y el segmento de canciones", async () => {
    mocks.deleteRating.mockResolvedValue(null);
    mocks.getRatings.mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } });
    renderList(page([safe, song(4, "Barracuda", 4, 80)]));
    expect(segment(t.sectionSongs)).toHaveTextContent(`${t.sectionSongs}1`);

    fireEvent.click(screen.getByRole("button", { name: "80/100" }));
    fireEvent.click(screen.getByRole("button", { name: detail.delete }));
    fireEvent.click(await screen.findByRole("button", { name: detail.deleteConfirm }));

    await waitFor(() => expect(bar("4,0", "sin valoraciones")).toBeInTheDocument());
    expect(segment(t.sectionSongs)).toHaveTextContent(`${t.sectionSongs}0`);
    expect(segment(t.sectionAlbums)).toHaveTextContent(`${t.sectionAlbums}1`);
  });
});
