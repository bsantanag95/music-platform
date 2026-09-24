import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { WantedShelf } from "./WantedShelf";
import type { WantedEntry, WantedListResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  getMyWantedEntries: vi.fn(),
  removeWantedEntry: vi.fn(),
  updateWantedEntry: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-cover /> }));
vi.mock("@/lib/api/wanted", () => ({
  getMyWantedEntries: mocks.getMyWantedEntries,
  removeWantedEntry: mocks.removeWantedEntry,
  updateWantedEntry: mocks.updateWantedEntry,
}));

let seq = 0;
function entry(overrides: Partial<WantedEntry> = {}): WantedEntry {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    format: "vinyl",
    attributes: ["limited-edition"],
    note: "buscando la edición firmada",
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

function response(entries: WantedEntry[], overrides: Partial<WantedListResponse> = {}): WantedListResponse {
  return { entries, page: 1, pageSize: 20, hasNext: false, ...overrides };
}

function renderShelf(
  initial: WantedListResponse,
  props: Partial<Parameters<typeof WantedShelf>[0]> = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <WantedShelf initial={initial} {...props} />
    </QueryClientProvider>,
  );
}

describe("WantedShelf", () => {
  beforeEach(() => {
    seq = 0;
    vi.clearAllMocks();
  });

  it("muestra las entradas de deseo con formato, atributos y nota", () => {
    renderShelf(response([entry()]));
    expect(screen.getByRole("link", { name: "Álbum 1" })).toBeInTheDocument();
    expect(screen.getByText("Vinilo", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Edición limitada", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("buscando la edición firmada")).toBeInTheDocument();
  });

  it("una entrada sin formato muestra 'Cualquier formato'", () => {
    renderShelf(response([entry({ format: null, attributes: [], note: null })]));
    expect(screen.getByText("Cualquier formato", { selector: "span" })).toBeInTheDocument();
  });

  it("wishlist vacía muestra el estado vacío con CTA al catálogo", () => {
    renderShelf(response([]));
    expect(
      screen.getByText("Todavía no agregaste discos a tu búsqueda"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar en el catálogo" })).toHaveAttribute(
      "href",
      "/search",
    );
  });

  it("búsqueda sin resultados muestra el estado filtrado-vacío", async () => {
    const user = userEvent.setup();
    mocks.getMyWantedEntries.mockResolvedValue(response([]));
    renderShelf(response([entry()]));
    await user.type(screen.getByPlaceholderText("Buscar por álbum o artista"), "nada");
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("quita una entrada de deseo llamando a removeWantedEntry", async () => {
    const only = entry();
    mocks.removeWantedEntry.mockResolvedValue(null);
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(mocks.removeWantedEntry).toHaveBeenCalledWith(only.id));
    expect(screen.queryByRole("link", { name: "Álbum 1" })).not.toBeInTheDocument();
  });

  it("edita el formato y los atributos de una entrada llamando a updateWantedEntry", async () => {
    const only = entry({ format: "vinyl", attributes: [] });
    mocks.updateWantedEntry.mockResolvedValue({ ...only, format: "cd" });
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByLabelText("CD"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mocks.updateWantedEntry).toHaveBeenCalledWith(
        only.id,
        expect.objectContaining({ format: "cd" }),
      ),
    );
  });

  it("editar y elegir 'Cualquier formato' envía format: null", async () => {
    const only = entry({ format: "vinyl", attributes: [] });
    mocks.updateWantedEntry.mockResolvedValue({ ...only, format: null });
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByLabelText("Cualquier formato"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mocks.updateWantedEntry).toHaveBeenCalledWith(
        only.id,
        expect.objectContaining({ format: null }),
      ),
    );
  });

  it("cancelar la edición no llama a updateWantedEntry", async () => {
    const only = entry();
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(mocks.updateWantedEntry).not.toHaveBeenCalled();
  });
});
