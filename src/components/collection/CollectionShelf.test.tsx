import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CollectionShelf } from "./CollectionShelf";
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

describe("CollectionShelf", () => {
  beforeEach(() => {
    seq = 0;
    vi.clearAllMocks();
    installStorage();
  });

  it("muestra el encabezado con el conteo por formato y las entradas", () => {
    renderShelf(response([entry(), entry()], { counts: { vinyl: 2, cd: 1, cassette: 0, other: 0 } }));
    expect(screen.getByText(/2 vinilos/)).toBeInTheDocument();
    expect(screen.getByText(/1 CD/)).toBeInTheDocument();
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
    renderShelf(response([entry()]));
    await user.selectOptions(screen.getByLabelText("Filtrar por formato"), "cd");
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("en modo Lista detallada muestra formato, atributos y nota", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    renderShelf(response([entry()]));
    expect(await screen.findByText("Vinilo", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Edición limitada", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("portada alternativa")).toBeInTheDocument();
  });

  it("edita una entrada llamando a updateCollectionEntry", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    const only = entry();
    mocks.updateCollectionEntry.mockResolvedValue({ ...only, format: "cd" });
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Editar" }));
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
    expect(screen.getByText(/1 vinilo/)).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar por álbum o artista" })).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por formato")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByText("Seguidores", { selector: "span" })).not.toBeInTheDocument();
    // el conmutador de modos sí está disponible para el visitante
    expect(screen.getByRole("radiogroup", { name: "Modo de visualización" })).toBeInTheDocument();
  });

  it("en modo lectura, filtrar pide la colección DEL PERFIL con el filtro (no la del visitante)", async () => {
    const user = userEvent.setup();
    mocks.getUserCollection.mockResolvedValue(response([]));
    renderShelf(response([entry()]), { readOnly: true, username: "nick" });

    await user.selectOptions(screen.getByLabelText("Filtrar por formato"), "cd");

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

    await user.click(screen.getByRole("button", { name: "Quitar" }));
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

    await user.click(screen.getByRole("button", { name: "Quitar" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos quitarla. Intenta de nuevo.");
    expect(alert.closest("li")).toHaveTextContent("Álbum 1");
    expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
  });

  it("en el Índice los controles se ven sin hover y no reservan una línea oculta", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "index");
    renderShelf(response([entry()]));
    const edit = await screen.findByRole("button", { name: "Editar" });
    expect(edit.closest("[class*='opacity-0']")).toBeNull();
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
    renderShelf(response([entry()]));

    await user.selectOptions(screen.getByLabelText("Filtrar por formato"), "cd");
    await waitFor(() => expect(window.location.search).toBe("?preview=1&format=cd"));
    window.history.replaceState(null, "", "/");
  });

  it("en Lista detallada agrupada por artista la fila no repite el artista", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    renderShelf(response([entry()]));
    expect(await screen.findByRole("heading", { name: /Artista 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Artista 1" })).toBeNull();
  });

  it("al editar una copia heredada incoherente avisa y guarda sin el atributo de vinilo", async () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "detailed");
    const legacy = entry({ format: "cd", attributes: ["colored-vinyl"] });
    mocks.updateCollectionEntry.mockResolvedValue({ ...legacy, attributes: [] });
    const user = userEvent.setup();
    renderShelf(response([legacy]));

    await user.click(await screen.findByRole("button", { name: "Editar" }));
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
