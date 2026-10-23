import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { WantToListenList } from "./WantToListenList";
import { OWN_DATA_CHANGED_EVENT } from "@/components/quick-actions/quick-actions-changes";
import type { WantToListenEntry, WantToListenListResponse } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const mocks = vi.hoisted(() => ({
  getMyWantToListen: vi.fn(),
  removeFromWantToListen: vi.fn(),
  getArtistJourneyStatuses: vi.fn(),
  activateArtistJourney: vi.fn(),
  toggleWantToListen: vi.fn(),
  createListenEntry: vi.fn(),
  deleteListenEntry: vi.fn(),
}));

vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
}));
vi.mock("@/components/lists/AddToListPanel", () => ({
  AddToListPanel: ({ target, onClose }: { target: { type: string; id: string }; onClose: () => void }) => (
    <div data-testid="add-to-list" data-target={`${target.type}:${target.id}`}>
      <button type="button" onClick={onClose}>
        cerrar panel
      </button>
    </div>
  ),
}));

vi.mock("@/lib/api/artist-journeys", () => ({
  getArtistJourneyStatuses: mocks.getArtistJourneyStatuses,
  activateArtistJourney: mocks.activateArtistJourney,
}));

vi.mock("@/lib/api/want-to-listen", () => ({
  getMyWantToListen: mocks.getMyWantToListen,
  removeFromWantToListen: mocks.removeFromWantToListen,
  toggleWantToListen: mocks.toggleWantToListen,
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

const artistEntry: WantToListenEntry = {
  id: "e1",
  targetType: "artist",
  createdAt: "2026-01-02T00:00:00Z",
  target: { id: "a1", title: "Pink Floyd", coverThumbUrl: null },
};

const albumEntry: WantToListenEntry = {
  id: "e2",
  targetType: "release-group",
  createdAt: "2026-01-01T00:00:00Z",
  target: { id: "rg1", title: "The Dark Side of the Moon", coverThumbUrl: null },
};

const initial: WantToListenListResponse = {
  items: [artistEntry, albumEntry],
  page: 1,
  pageSize: 20,
  hasNext: false,
  counts: { artist: 1, "release-group": 1 },
};

describe("WantToListenList", () => {
  beforeEach(() => {
    installStorage();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
    mocks.getArtistJourneyStatuses.mockResolvedValue([]);
  });

  it("separa artistas y álbumes en secciones propias", () => {
    renderWithIntl(<WantToListenList initial={initial} />);
    expect(screen.getByRole("heading", { name: "Artistas (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Álbumes (1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("arranca en modo Detallada y cambia a Índice y Gráfico", async () => {
    renderWithIntl(<WantToListenList initial={initial} />);
    expect(screen.getByRole("radio", { name: "Detallada", checked: true })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Índice" }));
    expect(screen.getByRole("radio", { name: "Índice", checked: true })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Gráfico" }));
    expect(screen.getByRole("radio", { name: "Gráfico", checked: true })).toBeInTheDocument();
  });

  it("sin artistas no hace ninguna petición de recorridos", () => {
    renderWithIntl(<WantToListenList initial={{ ...initial, items: [albumEntry] }} />);
    expect(mocks.getArtistJourneyStatuses).not.toHaveBeenCalled();
  });

  it("'Cargar más' pide solo los artistas nuevos, en una petición", async () => {
    const next: WantToListenEntry = {
      id: "e9",
      targetType: "artist",
      createdAt: "2025-12-01T00:00:00Z",
      target: { id: "a9", title: "Queen", coverThumbUrl: null },
    };
    mocks.getMyWantToListen.mockResolvedValue({
      items: [next],
      page: 2,
      pageSize: 20,
      hasNext: false,
      counts: { artist: 2, "release-group": 1 },
    });
    renderWithIntl(<WantToListenList initial={{ ...initial, hasNext: true }} />);
    await waitFor(() => expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() => expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledTimes(2));
    expect(mocks.getArtistJourneyStatuses).toHaveBeenLastCalledWith(["a9"]);
  });

  it("si falla la consulta de recorridos oculta la acción sin romper la lista", async () => {
    mocks.getArtistJourneyStatuses.mockRejectedValue(new Error("x"));
    renderWithIntl(<WantToListenList initial={initial} />);
    await waitFor(() => expect(mocks.getArtistJourneyStatuses).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Completar discografía" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toBeInTheDocument();
  });

  it("estado vacío con enlace a la búsqueda cuando no hay entradas", () => {
    renderWithIntl(
      <WantToListenList
        initial={{ items: [], page: 1, pageSize: 20, hasNext: false, counts: { artist: 0, "release-group": 0 } }}
      />,
    );
    expect(screen.getByText("Todavía no agregaste nada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar en el catálogo" })).toHaveAttribute("href", "/search");
  });

  // openspec: refine-want-to-listen-page-phase1
  // openspec: redesign-want-to-listen-toolbar
  it("los encabezados muestran el total del servidor aunque falten páginas", () => {
    renderWithIntl(
      <WantToListenList initial={{ ...initial, hasNext: true, counts: { artist: 12, "release-group": 30 } }} />,
    );
    expect(screen.getByRole("heading", { name: "Artistas (12)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Álbumes (30)" })).toBeInTheDocument();
  });

  it("los segmentos muestran las cantidades y filtrar por tipo pide la primera página y escribe la URL", async () => {
    mocks.getMyWantToListen.mockResolvedValue({ ...initial, items: [artistEntry] });
    renderWithIntl(<WantToListenList initial={initial} />);
    const group = screen.getByRole("group", { name: "Tipo" });
    expect(within(group).getByRole("button", { name: /^Todo\s*2$/ })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(within(group).getByRole("button", { name: /^Artistas\s*1$/ }));

    expect(mocks.getMyWantToListen).toHaveBeenCalledWith(1, 20, { type: "artist" });
    expect(window.location.search).toBe("?type=artist");
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Álbumes/ })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Artistas (1)" })).toBeInTheDocument();
  });

  it("un tipo sin entradas queda deshabilitado", () => {
    renderWithIntl(
      <WantToListenList initial={{ ...initial, items: [albumEntry], counts: { artist: 0, "release-group": 1 } }} />,
    );
    expect(screen.getByRole("button", { name: /^Artistas\s*0$/ })).toBeDisabled();
  });

  it("cambiar el orden lo pide al servidor y lo deja en la URL", async () => {
    mocks.getMyWantToListen.mockResolvedValue(initial);
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Orden" }), "alpha");

    expect(mocks.getMyWantToListen).toHaveBeenCalledWith(1, 20, { sort: "alpha" });
    expect(window.location.search).toBe("?sort=alpha");
  });

  it("una respuesta vieja no pisa a la más nueva", async () => {
    let resolveOld: (value: unknown) => void = () => {};
    mocks.getMyWantToListen
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce({ ...initial, items: [albumEntry] });
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: /^Artistas\s*1$/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Álbumes\s*1$/ }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Pink Floyd" })).not.toBeInTheDocument());

    resolveOld({ ...initial, items: [artistEntry] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("link", { name: "Pink Floyd" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("al avisar un cambio desde el diálogo global vuelve a pedir la primera página con los filtros", async () => {
    const added: WantToListenEntry = {
      id: "e7",
      targetType: "release-group",
      createdAt: "2026-01-05T00:00:00Z",
      target: { id: "rg7", title: "Wish You Were Here", coverThumbUrl: null },
    };
    mocks.getMyWantToListen.mockResolvedValue({
      ...initial,
      items: [added, ...initial.items],
      counts: { artist: 1, "release-group": 2 },
    });
    renderWithIntl(<WantToListenList initial={initial} initialFilters={{ sort: "oldest" }} />);

    act(() => window.dispatchEvent(new Event(OWN_DATA_CHANGED_EVENT)));

    expect(await screen.findByRole("link", { name: "Wish You Were Here" })).toBeInTheDocument();
    expect(mocks.getMyWantToListen).toHaveBeenCalledWith(1, 20, { sort: "oldest" });
    expect(screen.getByRole("heading", { name: "Álbumes (2)" })).toBeInTheDocument();
  });


  // openspec: redesign-want-to-listen-views
  const openMenu = async (title: string) => {
    await userEvent.click(screen.getByRole("button", { name: `Acciones para ${title}` }));
    return screen.getByRole("menu");
  };

  it("pide el estado de recorrido de todos los artistas en una sola petición y lo ofrece en el menú", async () => {
    const second: WantToListenEntry = {
      id: "e3",
      targetType: "artist",
      createdAt: "2026-01-03T00:00:00Z",
      target: { id: "a2", title: "Radiohead", coverThumbUrl: null },
    };
    mocks.getArtistJourneyStatuses.mockResolvedValue(["a2"]);
    renderWithIntl(<WantToListenList initial={{ ...initial, items: [artistEntry, second, albumEntry] }} />);

    await waitFor(() => expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledWith(["a1", "a2"]));
    expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Discografía en curso")).toBeInTheDocument();

    let menu = await openMenu("Pink Floyd");
    expect(within(menu).getByRole("menuitem", { name: "Completar discografía" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    menu = await openMenu("Radiohead");
    expect(within(menu).getByRole("menuitem", { name: "Ver tu discografía" })).toHaveAttribute(
      "href",
      "/me/artist-journeys/a2",
    );
  });

  it("sin el estado del lote el menú no ofrece la discografía", async () => {
    mocks.getArtistJourneyStatuses.mockReturnValue(new Promise(() => {}));
    renderWithIntl(<WantToListenList initial={initial} />);
    const menu = await openMenu("Pink Floyd");
    expect(within(menu).queryByRole("menuitem", { name: /discografía/ })).not.toBeInTheDocument();
  });

  it("completar discografía desde el menú lo activa y muestra la etiqueta", async () => {
    mocks.activateArtistJourney.mockResolvedValue({});
    renderWithIntl(<WantToListenList initial={initial} />);
    await waitFor(() => expect(mocks.getArtistJourneyStatuses).toHaveBeenCalled());
    const menu = await openMenu("Pink Floyd");

    await userEvent.click(await within(menu).findByRole("menuitem", { name: "Completar discografía" }));

    expect(mocks.activateArtistJourney).toHaveBeenCalledWith("a1");
    expect(await screen.findByText("Discografía en curso")).toBeInTheDocument();
    expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledTimes(1);
  });

  it("Escape cierra el menú y devuelve el foco al botón", async () => {
    renderWithIntl(<WantToListenList initial={initial} />);
    await openMenu("Pink Floyd");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acciones para Pink Floyd" })).toHaveFocus();
  });

  it("quitar es inmediato y Deshacer vuelve a anotar", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    mocks.toggleWantToListen.mockResolvedValue(artistEntry);
    mocks.getMyWantToListen.mockResolvedValue(initial);
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(within(await openMenu("Pink Floyd")).getByRole("menuitem", { name: "Quitar de Pendientes" }));

    expect(mocks.removeFromWantToListen).toHaveBeenCalledWith({ type: "artist", id: "a1" });
    expect(screen.queryByRole("heading", { name: /Artistas/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Quitaste Pink Floyd");

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(mocks.toggleWantToListen).toHaveBeenCalledWith({ type: "artist", id: "a1" });
    expect(await screen.findByRole("link", { name: "Pink Floyd" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Ya lo escuché registra la escucha, saca la entrada y Deshacer borra la escucha", async () => {
    mocks.createListenEntry.mockResolvedValue({ id: "l1" });
    mocks.deleteListenEntry.mockResolvedValue(null);
    mocks.toggleWantToListen.mockResolvedValue(albumEntry);
    mocks.getMyWantToListen.mockResolvedValue(initial);
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: "Ya escuché The Dark Side of the Moon" }));

    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: "rg1" });
    expect(screen.queryByRole("link", { name: "The Dark Side of the Moon" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("The Dark Side of the Moon quedó en tu Diario");

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(mocks.deleteListenEntry).toHaveBeenCalledWith("l1");
    expect(mocks.toggleWantToListen).toHaveBeenCalledWith({ type: "release-group", id: "rg1" });
    expect(await screen.findByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("Ya lo escuché también está en el menú", async () => {
    mocks.createListenEntry.mockResolvedValue({ id: "l2" });
    renderWithIntl(<WantToListenList initial={initial} />);
    await userEvent.click(within(await openMenu("Pink Floyd")).getByRole("menuitem", { name: "Ya lo escuché" }));
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "artist", id: "a1" });
  });

  it("quitar la última entrada del tipo filtrado vuelve a Todo", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    mocks.getMyWantToListen.mockResolvedValue({
      ...initial,
      items: [albumEntry],
      counts: { artist: 0, "release-group": 1 },
    });
    renderWithIntl(
      <WantToListenList initial={{ ...initial, items: [artistEntry] }} initialFilters={{ type: "artist" }} />,
    );

    await userEvent.click(within(await openMenu("Pink Floyd")).getByRole("menuitem", { name: "Quitar de Pendientes" }));

    expect(mocks.getMyWantToListen).toHaveBeenCalledWith(1, 20, {});
    expect(await screen.findByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("si Deshacer falla lo dice y ya no ofrece Deshacer", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    mocks.toggleWantToListen.mockRejectedValue(new Error("x"));
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(within(await openMenu("Pink Floyd")).getByRole("menuitem", { name: "Quitar de Pendientes" }));
    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(await screen.findByText("No pudimos deshacer. Intenta de nuevo.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
  });

  it.each([
    ["Detallada", "detailed"],
    ["Índice", "index"],
    ["Gráfico", "graphic"],
  ])("si quitar falla en %s, el aviso va junto a esa entrada y la entrada sigue", async (_label, mode) => {
    window.localStorage.setItem("music-platform:want-to-listen-view-mode", mode);
    mocks.removeFromWantToListen.mockRejectedValue(new Error("x"));
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(
      within(await openMenu("The Dark Side of the Moon")).getByRole("menuitem", { name: "Quitar de Pendientes" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos guardar el cambio. Intenta de nuevo.");
    expect(screen.getByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("Añadir a una lista abre el panel de esa entrada", async () => {
    renderWithIntl(<WantToListenList initial={initial} />);
    await userEvent.click(
      within(await openMenu("The Dark Side of the Moon")).getByRole("menuitem", { name: "Añadir a una lista" }),
    );
    expect(screen.getByTestId("add-to-list")).toHaveAttribute("data-target", "release-group:rg1");
    await userEvent.click(screen.getByRole("button", { name: "cerrar panel" }));
    expect(screen.queryByTestId("add-to-list")).not.toBeInTheDocument();
  });

  it("muestra año y tipo del álbum, la foto del artista y cuánto hace que se anotó", () => {
    renderWithIntl(
      <WantToListenList
        initial={{
          ...initial,
          items: [
            { ...artistEntry, target: { ...artistEntry.target, coverThumbUrl: "/uploads/pf.webp" } },
            {
              ...albumEntry,
              target: { ...albumEntry.target, artistName: "Pink Floyd", year: 1973, category: "studio" },
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Pink Floyd · 1973 · Álbum de estudio")).toBeInTheDocument();
    expect(screen.getAllByTestId("cover")).toHaveLength(2);
    expect(screen.getAllByText(/^anotado /)).toHaveLength(2);
  });

  it("Índice es una tabla con encabezados", () => {
    window.localStorage.setItem("music-platform:want-to-listen-view-mode", "index");
    renderWithIntl(<WantToListenList initial={initial} />);
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    expect(within(tables[1]!).getByRole("columnheader", { name: "Año" })).toBeInTheDocument();
    expect(within(tables[0]!).queryByRole("columnheader", { name: "Año" })).not.toBeInTheDocument();
  });

  it("el menú y Deshacer crecen a 44 px con puntero grueso", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    renderWithIntl(<WantToListenList initial={initial} />);
    expect(screen.getByRole("button", { name: "Acciones para Pink Floyd" }).className).toContain(
      "[@media(pointer:coarse)]:size-11",
    );
    expect(screen.getByRole("radio", { name: "Detallada" }).className).toContain("[@media(pointer:coarse)]:min-h-11");
    const menu = await openMenu("Pink Floyd");
    for (const item of within(menu).getAllByRole("menuitem")) {
      expect(item.className).toContain("[@media(pointer:coarse)]:min-h-11");
    }
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Quitar de Pendientes" }));
    expect(screen.getByRole("button", { name: "Deshacer" }).className).toContain("[@media(pointer:coarse)]:min-h-11");
  });
});
