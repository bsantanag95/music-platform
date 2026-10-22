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
}));

vi.mock("@/lib/api/artist-journeys", () => ({
  getArtistJourneyStatuses: mocks.getArtistJourneyStatuses,
  activateArtistJourney: mocks.activateArtistJourney,
}));

vi.mock("@/lib/api/want-to-listen", () => ({
  getMyWantToListen: mocks.getMyWantToListen,
  removeFromWantToListen: mocks.removeFromWantToListen,
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

  it("quita una entrada en dos pasos y la retira de su sección", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar Pink Floyd de la lista" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar remoción" }));

    expect(mocks.removeFromWantToListen).toHaveBeenCalledWith({ type: "artist", id: "a1" });
    expect(screen.queryByRole("heading", { name: /Artistas/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Álbumes (1)" })).toBeInTheDocument();
  });

  it("pide el estado de recorrido de todos los artistas en una sola petición", async () => {
    const second: WantToListenEntry = {
      id: "e3",
      targetType: "artist",
      createdAt: "2026-01-03T00:00:00Z",
      target: { id: "a2", title: "Radiohead", coverThumbUrl: null },
    };
    renderWithIntl(<WantToListenList initial={{ ...initial, items: [artistEntry, second, albumEntry] }} />);

    await waitFor(() => expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledTimes(1));
    expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledWith(["a1", "a2"]);
    expect(await screen.findAllByRole("button", { name: "Completar discografía" })).toHaveLength(2);
  });

  it("sin artistas no hace ninguna petición de recorridos", () => {
    renderWithIntl(<WantToListenList initial={{ ...initial, items: [albumEntry] }} />);
    expect(mocks.getArtistJourneyStatuses).not.toHaveBeenCalled();
  });

  it("muestra el enlace si el artista ya tiene recorrido y el botón si no", async () => {
    const second: WantToListenEntry = {
      id: "e3",
      targetType: "artist",
      createdAt: "2026-01-03T00:00:00Z",
      target: { id: "a2", title: "Radiohead", coverThumbUrl: null },
    };
    mocks.getArtistJourneyStatuses.mockResolvedValue(["a1"]);
    renderWithIntl(<WantToListenList initial={{ ...initial, items: [artistEntry, second] }} />);

    expect(await screen.findByRole("link", { name: "Ya está en tu discografía" })).toHaveAttribute(
      "href",
      "/me/artist-journeys/a1",
    );
    expect(screen.getAllByRole("button", { name: "Completar discografía" })).toHaveLength(1);
  });

  it("activar un recorrido lo marca como agregado sin volver a consultar", async () => {
    mocks.activateArtistJourney.mockResolvedValue({});
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(await screen.findByRole("button", { name: "Completar discografía" }));

    expect(mocks.activateArtistJourney).toHaveBeenCalledWith("a1");
    expect(await screen.findByRole("link", { name: "Ya está en tu discografía" })).toBeInTheDocument();
    expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledTimes(1);
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

  it("quitar la última entrada del tipo filtrado vuelve a Todo", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    mocks.getMyWantToListen.mockResolvedValue({ ...initial, items: [albumEntry], counts: { artist: 0, "release-group": 1 } });
    renderWithIntl(
      <WantToListenList initial={{ ...initial, items: [artistEntry] }} initialFilters={{ type: "artist" }} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Quitar Pink Floyd de la lista" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar remoción" }));

    expect(mocks.getMyWantToListen).toHaveBeenCalledWith(1, 20, {});
    expect(await screen.findByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("anuncia la entrada quitada", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar The Dark Side of the Moon de la lista" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar remoción" }));

    expect(await screen.findByRole("status")).toHaveTextContent("The Dark Side of the Moon salió de Pendientes");
  });

  it.each([
    ["Detallada", "detailed"],
    ["Índice", "index"],
    ["Gráfico", "graphic"],
  ])("si quitar falla en %s, el aviso va bajo esa entrada y la entrada sigue", async (_label, mode) => {
    window.localStorage.setItem("music-platform:want-to-listen-view-mode", mode);
    mocks.removeFromWantToListen.mockRejectedValue(new Error("x"));
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar The Dark Side of the Moon de la lista" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar remoción" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos quitarlo. Intenta de nuevo.");
    expect(alert.closest("li")).toHaveTextContent("The Dark Side of the Moon");
    expect(screen.getByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("mientras llega el estado de recorrido la acción ocupa su lugar sin estar en el árbol accesible", () => {
    mocks.getArtistJourneyStatuses.mockReturnValue(new Promise(() => {}));
    renderWithIntl(<WantToListenList initial={initial} />);

    expect(screen.queryByRole("button", { name: "Completar discografía" })).not.toBeInTheDocument();
    const reserved = screen.getByText("Completar discografía");
    expect(reserved).toHaveAttribute("aria-hidden", "true");
    expect(reserved.className).toContain("invisible");
  });

  it("los controles crecen a 44 px con puntero grueso", async () => {
    renderWithIntl(<WantToListenList initial={initial} />);
    expect(screen.getByRole("button", { name: "Quitar Pink Floyd de la lista" }).className).toContain(
      "[@media(pointer:coarse)]:min-h-11",
    );
    expect(screen.getByRole("radio", { name: "Detallada" }).className).toContain("[@media(pointer:coarse)]:min-h-11");
    expect((await screen.findByRole("button", { name: "Completar discografía" })).className).toContain(
      "[@media(pointer:coarse)]:min-h-11",
    );
  });
});
