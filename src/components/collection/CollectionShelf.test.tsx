import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CollectionShelf } from "./CollectionShelf";
import { COLLECTION_VIEW_MODE_STORAGE_KEY } from "./collection-view-mode";
import type { CollectionEntry, CollectionListResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
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

  it("en modo lectura no muestra toolbar, selección ni editar", () => {
    mocks.getUserCollection.mockResolvedValue(response([entry()]));
    renderShelf(response([entry()]), { readOnly: true, username: "nick" });
    expect(screen.queryByLabelText("Formato")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    // el conmutador de modos sí está disponible para el visitante
    expect(screen.getByRole("radiogroup", { name: "Modo de visualización" })).toBeInTheDocument();
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
