import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import catalogEs from "../../../messages/es/catalog.json";
import { MyRatingsList } from "./MyRatingsList";
import { RATING_VIEW_MODE_STORAGE_KEY } from "./rating-view-mode";
import type { MyRatingEntry, MyRatingsListResponse } from "@/lib/api/schemas";

// openspec: add-my-ratings-library (design D4–D7).

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

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

function page(items: MyRatingEntry[], overrides: Partial<MyRatingsListResponse> = {}): MyRatingsListResponse {
  const albums = items.filter((item) => item.targetType === "release-group").length;
  return {
    items,
    page: 1,
    pageSize: 30,
    hasNext: false,
    total: items.length,
    counts: { "release-group": albums, recording: items.length - albums },
    facets: { years: [2012, 1987] },
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
    renderList(page([], { facets: { years: [] } }));
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

    fireEvent.change(select(t.starsFilterLabel), { target: { value: "3" } });
    fireEvent.change(select(t.typeFilterLabel), { target: { value: "release-group" } });
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

    fireEvent.change(select(t.starsFilterLabel), { target: { value: "1" } });
    expect(await screen.findByText(t.noResultsTitle)).toBeInTheDocument();
    expect(screen.queryByText(t.emptyTitle)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: t.clearFilters })[0]!);

    await waitFor(() => expect(titles()).toHaveLength(3));
    expect(select(t.starsFilterLabel)).toHaveValue("");
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
    for (const name of [t.typeFilterLabel, t.starsFilterLabel, t.yearFilterLabel, t.decadeFilterLabel, t.sortLabel, t.groupLabel]) {
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

  it("agrupado por artista: una sección por artista con Álbumes y Canciones separados, sin contador", () => {
    const mann = (n: number, title: string) => ({
      ...entry(n, title, 4, 80),
      target: { ...entry(n, title, 4, 80).target, artistName: "Aimee Mann", artistId: uuid(95) },
    });
    renderList(
      page([mann(7, "Bachelor No. 2"), safe, bad, song(4, "Barracuda", 4, 80)], undefined),
      { group: "artist" },
    );

    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2.map((heading) => heading.textContent)).toEqual(["Aimee Mann", "Heart"]);
    expect(within(h2[1]!).getByRole("link", { name: "Heart" })).toBeInTheDocument();

    const h3 = screen.getAllByRole("heading", { level: 3 });
    expect(h3.map((heading) => heading.textContent)).toEqual([t.sectionAlbums, t.sectionAlbums, t.sectionSongs]);
  });

  it("agrupado por artista: lo sin artista va al final como 'Sin artista', sin enlace", () => {
    const noArtist = {
      ...song(4, "Barracuda", 4, 80),
      target: { ...song(4, "Barracuda", 4, 80).target, artistName: null, artistId: null },
    };
    renderList(page([safe, noArtist]), { group: "artist" });
    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2.map((heading) => heading.textContent)).toEqual(["Heart", t.sectionNoArtist]);
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

  it("el selector de tipo no ofrece artistas", () => {
    renderList(page([safe]));
    expect(Array.from(select(t.typeFilterLabel).options).map((option) => option.value)).toEqual(["", "release-group", "recording"]);
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
    const { container } = renderList(page([safe, girl]));
    expect(mode(t.viewMode.graphic)).toBeChecked();
    expect(screen.getAllByTestId("rating-overlay")).toHaveLength(2);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect((container.firstElementChild as HTMLElement).className).toContain("max-w-5xl");
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

  it("el contenedor se ensancha solo en modo Gráfico", () => {
    const { container } = renderList(page([safe]));
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("max-w-3xl");
    fireEvent.click(mode(t.viewMode.graphic));
    expect(root.className).toContain("max-w-5xl");
    fireEvent.click(mode(t.viewMode.detailed));
    expect(root.className).toContain("max-w-3xl");
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
    expect(screen.queryByText(t.sectionSongs)).not.toBeInTheDocument();
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
});
