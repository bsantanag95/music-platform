import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CollectionShelf } from "./CollectionShelf";
import { CollectionTabs } from "./CollectionTabs";
import { COLLECTION_VIEW_MODE_STORAGE_KEY } from "./collection-view-mode";
import type { CollectionEntry, CollectionListResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  addCollectionEntry: vi.fn(),
  getMyCollection: vi.fn(),
  getUserCollection: vi.fn(),
  removeCollectionEntry: vi.fn(),
  updateCollectionEntry: vi.fn(),
  updateEntriesAudienceBulk: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-cover /> }));
vi.mock("@/lib/api/collection", () => ({
  addCollectionEntry: mocks.addCollectionEntry,
  getMyCollection: mocks.getMyCollection,
  getUserCollection: mocks.getUserCollection,
  removeCollectionEntry: mocks.removeCollectionEntry,
  updateCollectionEntry: mocks.updateCollectionEntry,
  updateEntriesAudienceBulk: mocks.updateEntriesAudienceBulk,
}));

function installStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    },
  });
}

let seq = 0;
function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    format: "vinyl",
    attributes: ["limited-edition"],
    note: "portada alternativa",
    audience: "followers",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    album: {
      id: `a${seq}`,
      title: `Álbum ${seq}`,
      coverThumbUrl: null,
      artistId: `art${seq}`,
      artistName: `Artista ${seq}`,
    },
    ...overrides,
  };
}

function response(
  entries: CollectionEntry[],
  overrides: Partial<CollectionListResponse> = {},
): CollectionListResponse {
  return {
    entries,
    page: 1,
    pageSize: 20,
    hasNext: false,
    counts: { vinyl: entries.length, cd: 0, cassette: 0, other: 0 },
    ...overrides,
  };
}

function renderShelf(
  initial: CollectionListResponse,
  props: Partial<Parameters<typeof CollectionShelf>[0]> = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <CollectionShelf initial={initial} {...props} />
    </QueryClientProvider>,
  );
}


async function openMenu(user: ReturnType<typeof userEvent.setup>, title = "Álbum 1") {
  await user.click(await screen.findByRole("button", { name: `Acciones de ${title}` }));
}

async function menuEdit(user: ReturnType<typeof userEvent.setup>, title = "Álbum 1") {
  await openMenu(user, title);
  await user.click(screen.getByRole("menuitem", { name: "Editar copia…" }));
}

async function menuRemove(user: ReturnType<typeof userEvent.setup>, title = "Álbum 1") {
  await openMenu(user, title);
  await user.click(screen.getByRole("menuitem", { name: "Quitar" }));
}

describe("CollectionShelf", () => {
  beforeEach(() => {
    seq = 0;
    vi.clearAllMocks();
    installStorage();
  });

  it("muestra el encabezado con el conteo por formato y las entradas", () => {
    renderShelf(response([entry(), entry()], { counts: { vinyl: 2, cd: 1, cassette: 0, other: 0 } }));
    expect(screen.getByRole("radio", { name: "Todo 3" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Vinilo 2" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "CD 1" })).toBeInTheDocument();
    // Un formato sin copias no se muestra.
    expect(screen.queryByRole("radio", { name: "Cassette 0" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Álbum 1" })).toBeInTheDocument();
  });

  it("colección vacía muestra el estado vacío con CTA al catálogo", () => {
    renderShelf(response([]));
    expect(screen.getByText("Todavía no agregaste discos a tu colección")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar en el catálogo" })).toHaveAttribute(
      "href",
      "/search",
    );
  });

  it("filtro sin resultados muestra el estado filtrado-vacío", async () => {
    const user = userEvent.setup();
    mocks.getMyCollection.mockResolvedValue(response([]));
    renderShelf(response([entry()], { counts: { vinyl: 1, cd: 1, cassette: 0, other: 0 } }));
    await user.click(screen.getByRole("radio", { name: "CD 1" }));
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("en modo Lista detallada muestra formato, atributos y nota", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    renderShelf(response([entry()]));
    const row = within(await screen.findByRole("listitem"));
    expect(row.getByText("Vinilo", { selector: "span" })).toBeInTheDocument();
    expect(row.getByText("Edición limitada", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("portada alternativa")).toBeInTheDocument();
    // La fecha de la derecha es la de alta, no la del lanzamiento.
    expect(row.getByText(/^Añadida el /)).toBeInTheDocument();
  });

  it("edita una entrada llamando a updateCollectionEntry", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    const only = entry();
    mocks.updateCollectionEntry.mockResolvedValue({ ...only, format: "cd" });
    const user = userEvent.setup();
    renderShelf(response([only]));

    await menuEdit(user);
    await user.selectOptions(screen.getByLabelText("Formato"), "cd");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    // "Formato" ahora solo existe en el panel de edición (el filtro usa
    // "Filtrar por formato").

    await waitFor(() =>
      expect(mocks.updateCollectionEntry).toHaveBeenCalledWith(
        only.id,
        expect.objectContaining({ format: "cd" }),
      ),
    );
  });

  it("cambia la audiencia en lote desde el modo selección", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    const a = entry();
    const b = entry();
    mocks.updateEntriesAudienceBulk.mockResolvedValue([a.id, b.id]);
    const user = userEvent.setup();
    renderShelf(response([a, b]));

    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    await user.click(screen.getByLabelText("Seleccionar Álbum 1"));
    await user.click(screen.getByLabelText("Seleccionar Álbum 2"));
    await user.click(screen.getByRole("button", { name: "Público" }));

    await waitFor(() =>
      expect(mocks.updateEntriesAudienceBulk).toHaveBeenCalledWith(
        [a.id, b.id],
        "public",
      ),
    );
  });

  it("en modo lectura: conteos, buscador y filtros sí; selección, edición y audiencia no", () => {
    renderShelf(response([entry()]), { readOnly: true, username: "nick" });
    expect(screen.getByRole("radio", { name: "Vinilo 1" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar por álbum o artista" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Filtrar por formato" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Acciones de/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Seguidores", { selector: "span" })).not.toBeInTheDocument();
    // el conmutador de modos sí está disponible para el visitante
    expect(screen.getByRole("radiogroup", { name: "Modo de visualización" })).toBeInTheDocument();
  });

  it("en modo lectura, filtrar pide la colección DEL PERFIL con el filtro (no la del visitante)", async () => {
    const user = userEvent.setup();
    mocks.getUserCollection.mockResolvedValue(response([]));
    renderShelf(response([entry()], { counts: { vinyl: 1, cd: 1, cassette: 0, other: 0 } }), { readOnly: true, username: "nick" });

    await user.click(screen.getByRole("radio", { name: "CD 1" }));

    await waitFor(() =>
      expect(mocks.getUserCollection).toHaveBeenCalledWith(
        "nick",
        expect.objectContaining({ page: 1, format: "cd" }),
      ),
    );
    expect(mocks.getMyCollection).not.toHaveBeenCalled();
    // con un filtro activo el vacío es "sin resultados", no "este usuario no compartió nada"
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByText("Sin colección")).not.toBeInTheDocument();
  });

  it("en modo lectura, los filtros de la URL siembran el buscador y la primera carga", () => {
    renderShelf(response([entry()]), { readOnly: true, username: "nick", initialFilters: { q: "Queen" } });
    expect(screen.getByRole("searchbox", { name: "Buscar por álbum o artista" })).toHaveValue("Queen");
    // La carga inicial ya vino filtrada del servidor: no hay refetch.
    expect(mocks.getUserCollection).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Álbum 1" })).toBeInTheDocument();
  });

  it("en modo lectura sin copias ni filtros: estado vacío del perfil", () => {
    renderShelf(response([]), { readOnly: true, username: "nick" });
    expect(screen.getByText("Sin colección")).toBeInTheDocument();
  });

  it("en la Estantería ofrece Quitar y Deshacer vuelve a crear la copia con sus datos", async () => {
    const only = entry();
    mocks.removeCollectionEntry.mockResolvedValue(null);
    mocks.addCollectionEntry.mockResolvedValue({ ...only, id: "restaurada" });
    mocks.getMyCollection.mockResolvedValue(response([]));
    const user = userEvent.setup();
    renderShelf(response([only]));

    await menuRemove(user);
    await waitFor(() => expect(mocks.removeCollectionEntry).toHaveBeenCalledWith(only.id));
    await user.click(await screen.findByRole("button", { name: "Deshacer" }));

    await waitFor(() =>
      expect(mocks.addCollectionEntry).toHaveBeenCalledWith({
        releaseGroupId: only.album.id,
        format: "vinyl",
        attributes: ["limited-edition"],
        note: "portada alternativa",
        audience: "followers",
      }),
    );
  });

  it("si quitar falla, la copia vuelve y el error aparece junto a ella", async () => {
    mocks.removeCollectionEntry.mockRejectedValue(new Error("caída"));
    const only = entry();
    mocks.getMyCollection.mockResolvedValue(response([only]));
    const user = userEvent.setup();
    renderShelf(response([only]));

    await menuRemove(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos quitarla. Intenta de nuevo.");
    expect(alert.closest("li")).toHaveTextContent("Álbum 1");
    expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
  });

  it("el Índice es una tabla con el menú de acciones en cada fila", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "index");
    renderShelf(response([entry(), entry()]));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByRole("button", { name: "Acciones de Álbum 1" })).toBeInTheDocument();
  });

  it("el menú cambia la audiencia sin abrir la hoja", async () => {
    const only = entry();
    mocks.updateCollectionEntry.mockResolvedValue({ ...only, audience: "public" });
    mocks.getMyCollection.mockResolvedValue(response([{ ...only, audience: "public" }]));
    const user = userEvent.setup();
    renderShelf(response([only]));
    await openMenu(user);
    await user.click(screen.getByRole("menuitemradio", { name: "Público" }));
    await waitFor(() => expect(mocks.updateCollectionEntry).toHaveBeenCalledWith(only.id, { audience: "public" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("la hoja de edición agrupa los atributos y sin opciones de vinilo para un CD", async () => {
    const user = userEvent.setup();
    renderShelf(response([entry({ format: "cd", attributes: [] })]));
    await menuEdit(user);
    const sheet = screen.getByRole("dialog", { name: "Editar copia" });
    expect(within(sheet).getByText("Edición")).toBeInTheDocument();
    expect(within(sheet).getByText("Región y contenido")).toBeInTheDocument();
    expect(within(sheet).queryByText("Vinilo de color")).toBeNull();
  });

  it("muestra el año del álbum junto al artista", () => {
    renderShelf(response([entry({ album: { id: "a9", title: "Appetite", coverThumbUrl: null, artistId: null, artistName: "Guns", year: 1987 } })]));
    expect(screen.getByText("Guns · 1987")).toBeInTheDocument();
  });

  it("quita varias copias en lote tras confirmar", async () => {
    const a = entry();
    const b = entry();
    mocks.removeCollectionEntry.mockResolvedValue(null);
    mocks.getMyCollection.mockResolvedValue(response([]));
    const user = userEvent.setup();
    renderShelf(response([a, b]));

    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar todo" }));
    await user.click(screen.getByRole("button", { name: "Quitar…" }));
    expect(screen.getByText("¿Quitar 2 copias?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar" }));

    await waitFor(() => expect(mocks.removeCollectionEntry).toHaveBeenCalledTimes(2));
    expect(mocks.removeCollectionEntry).toHaveBeenCalledWith(a.id);
    expect(mocks.removeCollectionEntry).toHaveBeenCalledWith(b.id);
  });

  it("en modo selección, tocar la carátula marca la copia sin navegar", async () => {
    const user = userEvent.setup();
    const { container } = renderShelf(response([entry()]));

    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    const coverButton = container.querySelector("li button[aria-hidden]") as HTMLButtonElement;
    await user.click(coverButton);

    expect(screen.getByLabelText("Seleccionar Álbum 1")).toBeChecked();
    expect(coverButton.className).toContain("ring-amber");
  });

  it("escribe los filtros en la URL y conserva la pestaña", async () => {
    window.history.replaceState(null, "", "/es/me/collection?preview=1");
    mocks.getMyCollection.mockResolvedValue(response([]));
    const user = userEvent.setup();
    renderShelf(response([entry()], { counts: { vinyl: 1, cd: 1, cassette: 0, other: 0 } }));

    await user.click(screen.getByRole("radio", { name: "CD 1" }));
    await waitFor(() => expect(window.location.search).toBe("?preview=1&format=cd"));
    window.history.replaceState(null, "", "/");
  });

  it("sin agrupar por defecto: una sola sección sin encabezado", () => {
    renderShelf(response([entry(), entry()]));
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("informa el total a las pestañas y lo descuenta al quitar", async () => {
    const only = entry();
    mocks.removeCollectionEntry.mockResolvedValue(null);
    mocks.getMyCollection.mockResolvedValue(response([], { total: 0 }));
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithIntl(
      <QueryClientProvider client={client}>
        <CollectionTabs active="own" initialTotals={{ own: 1, wanted: 4 }}>
          <CollectionShelf initial={response([only], { total: 1 })} />
        </CollectionTabs>
      </QueryClientProvider>,
    );
    // El mock de `Link` no conserva `role="tab"`: se buscan como enlaces.
    expect(screen.getByRole("link", { name: "Tengo 1" })).toBeInTheDocument();
    await menuRemove(user);
    expect(await screen.findByRole("link", { name: "Tengo 0" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Busco 4" })).toBeInTheDocument();
  });

  it("en Lista detallada agrupada por artista la fila no repite el artista", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    renderShelf(response([entry()]), { initialFilters: { group: "artist" } });
    expect(await screen.findByRole("heading", { name: /Artista 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Artista 1" })).toBeNull();
  });

  it("al editar una copia heredada incoherente avisa y guarda sin el atributo de vinilo", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    const legacy = entry({ format: "cd", attributes: ["colored-vinyl"] });
    mocks.updateCollectionEntry.mockResolvedValue({ ...legacy, attributes: [] });
    const user = userEvent.setup();
    renderShelf(response([legacy]));

    await menuEdit(user);
    expect(screen.getByRole("note")).toHaveTextContent("«Vinilo de color» es solo para vinilo. Se quitará al guardar.");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mocks.updateCollectionEntry).toHaveBeenCalledWith(
        legacy.id,
        expect.objectContaining({ format: "cd", attributes: [] }),
      ),
    );
  });

  it("agrupa por formato en secciones tituladas", () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    renderShelf(
      response([entry({ format: "vinyl" }), entry({ format: "cd" })], {
        counts: { vinyl: 1, cd: 1, cassette: 0, other: 0 },
      }),
      { initialFilters: { group: "format" } },
    );
    expect(screen.getByRole("heading", { name: /Vinilo/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /CD/ })).toBeInTheDocument();
  });
});
