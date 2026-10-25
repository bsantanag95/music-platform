import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { WantedShelf } from "./WantedShelf";
import type { WantedEntry, WantedListResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  addCollectionEntry: vi.fn(),
  removeCollectionEntry: vi.fn(),
  addWantedEntries: vi.fn(),
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
vi.mock("@/lib/api/collection", () => ({
  addCollectionEntry: mocks.addCollectionEntry,
  removeCollectionEntry: mocks.removeCollectionEntry,
}));
vi.mock("@/lib/api/wanted", () => ({
  addWantedEntries: mocks.addWantedEntries,
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

function response(entries: WantedEntry[], overrides: Partial<WantedListResponse> = {}): WantedListResponse {
  return { entries, page: 1, pageSize: 20, hasNext: false, total: entries.length, ...overrides };
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

    await menuRemove(user);
    await waitFor(() => expect(mocks.removeWantedEntry).toHaveBeenCalledWith(only.id));
    expect(screen.queryByRole("link", { name: "Álbum 1" })).not.toBeInTheDocument();
  });

  it("Deshacer vuelve a crear la variante quitada con sus datos y su audiencia", async () => {
    const only = entry({ audience: "private" });
    mocks.removeWantedEntry.mockResolvedValue(null);
    mocks.addWantedEntries.mockResolvedValue([{ ...only, id: "restaurada" }]);
    mocks.getMyWantedEntries.mockResolvedValue(response([]));
    const user = userEvent.setup();
    renderShelf(response([only]));

    await menuRemove(user);
    await user.click(await screen.findByRole("button", { name: "Deshacer" }));

    await waitFor(() =>
      expect(mocks.addWantedEntries).toHaveBeenCalledWith({
        releaseGroupId: only.album.id,
        entries: [{ format: "vinyl", attributes: ["limited-edition"], note: "buscando la edición firmada" }],
        audience: "private",
      }),
    );
  });

  it("si quitar falla, el error aparece junto a la entrada", async () => {
    mocks.removeWantedEntry.mockRejectedValue(new Error("caída"));
    const only = entry();
    mocks.getMyWantedEntries.mockResolvedValue(response([only]));
    const user = userEvent.setup();
    renderShelf(response([only]));

    await menuRemove(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos quitarla. Intenta de nuevo.");
    expect(alert.closest("li")).toHaveTextContent("Álbum 1");
  });

  it("Lo conseguí con formato crea la copia, quita la variante y Deshacer revierte las dos", async () => {
    const only = entry({ format: "vinyl", attributes: ["limited-edition"], note: "con OBI" });
    mocks.addCollectionEntry.mockResolvedValue({ id: "copia-1" });
    mocks.removeWantedEntry.mockResolvedValue(null);
    mocks.removeCollectionEntry.mockResolvedValue(null);
    mocks.addWantedEntries.mockResolvedValue([only]);
    mocks.getMyWantedEntries.mockResolvedValue(response([]));
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Lo conseguí" }));
    await waitFor(() =>
      expect(mocks.addCollectionEntry).toHaveBeenCalledWith({
        releaseGroupId: only.album.id,
        format: "vinyl",
        attributes: ["limited-edition"],
        note: "con OBI",
      }),
    );
    expect(mocks.removeWantedEntry).toHaveBeenCalledWith(only.id);

    await user.click(await screen.findByRole("button", { name: "Deshacer" }));
    await waitFor(() => expect(mocks.removeCollectionEntry).toHaveBeenCalledWith("copia-1"));
    expect(mocks.addWantedEntries).toHaveBeenCalledWith(
      expect.objectContaining({ releaseGroupId: only.album.id, audience: only.audience }),
    );
  });

  it("Lo conseguí sin formato pide el formato antes de crear la copia", async () => {
    const only = entry({ format: null, attributes: ["colored-vinyl"] });
    mocks.addCollectionEntry.mockResolvedValue({ id: "copia-2" });
    mocks.removeWantedEntry.mockResolvedValue(null);
    mocks.getMyWantedEntries.mockResolvedValue(response([]));
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Lo conseguí" }));
    expect(mocks.addCollectionEntry).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "CD" }));
    // "Vinilo de color" no aplica a un CD: no viaja.
    await waitFor(() =>
      expect(mocks.addCollectionEntry).toHaveBeenCalledWith(expect.objectContaining({ format: "cd", attributes: [] })),
    );
  });

  it("si la variante no se puede quitar, borra la copia recién creada y avisa", async () => {
    const only = entry();
    mocks.addCollectionEntry.mockResolvedValue({ id: "copia-3" });
    mocks.removeWantedEntry.mockRejectedValue(new Error("caída"));
    mocks.removeCollectionEntry.mockResolvedValue(null);
    mocks.getMyWantedEntries.mockResolvedValue(response([only]));
    const user = userEvent.setup();
    renderShelf(response([only]));

    await user.click(screen.getByRole("button", { name: "Lo conseguí" }));
    expect(await screen.findByText("No pudimos pasarla a tu colección. Intenta de nuevo.")).toBeInTheDocument();
    expect(mocks.removeCollectionEntry).toHaveBeenCalledWith("copia-3");
    expect(screen.getByRole("link", { name: "Álbum 1" })).toBeInTheDocument();
  });

  it("muestra Ya tienes cuando el álbum está en la colección", () => {
    renderShelf(
      response([
        entry({ owned: [{ format: "cd", attributes: ["remaster"] }, { format: "vinyl", attributes: [] }] }),
        entry({ owned: [] }),
      ]),
    );
    expect(screen.getAllByText(/Ya tienes:/)).toHaveLength(1);
    expect(screen.getByText(/Ya tienes:/)).toHaveTextContent("Ya tienes: CD · Remasterizada (+1)");
  });

  it("edita el formato y los atributos de una entrada llamando a updateWantedEntry", async () => {
    const only = entry({ format: "vinyl", attributes: [] });
    mocks.updateWantedEntry.mockResolvedValue({ ...only, format: "cd" });
    const user = userEvent.setup();
    renderShelf(response([only]));

    await menuEdit(user);
    await user.click(screen.getByLabelText("CD"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mocks.updateWantedEntry).toHaveBeenCalledWith(
        only.id,
        expect.objectContaining({ format: "cd" }),
      ),
    );
  });

  it("muestra la audiencia de cada entrada y permite cambiarla al editar", async () => {
    const only = entry({ audience: "followers" });
    mocks.updateWantedEntry.mockResolvedValue({ ...only, audience: "private" });
    const user = userEvent.setup();
    renderShelf(response([only]));

    expect(screen.getByText(/Seguidores/)).toBeInTheDocument();
    await menuEdit(user);
    await user.click(screen.getByLabelText("Privado"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mocks.updateWantedEntry).toHaveBeenCalledWith(
        only.id,
        expect.objectContaining({ audience: "private" }),
      ),
    );
  });

  it("editar y elegir 'Cualquier formato' envía format: null", async () => {
    const only = entry({ format: "vinyl", attributes: [] });
    mocks.updateWantedEntry.mockResolvedValue({ ...only, format: null });
    const user = userEvent.setup();
    renderShelf(response([only]));

    await menuEdit(user);
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

    await menuEdit(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(mocks.updateWantedEntry).not.toHaveBeenCalled();
  });
});
