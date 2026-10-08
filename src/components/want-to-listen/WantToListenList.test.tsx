import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { WantToListenList } from "./WantToListenList";
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
};

describe("WantToListenList", () => {
  beforeEach(() => {
    installStorage();
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
    expect(await screen.findAllByRole("button", { name: "Agregar al Recorrido" })).toHaveLength(2);
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

    expect(await screen.findByRole("link", { name: "Ya está en tu Recorrido" })).toHaveAttribute(
      "href",
      "/me/artist-journeys/a1",
    );
    expect(screen.getAllByRole("button", { name: "Agregar al Recorrido" })).toHaveLength(1);
  });

  it("activar un recorrido lo marca como agregado sin volver a consultar", async () => {
    mocks.activateArtistJourney.mockResolvedValue({});
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(await screen.findByRole("button", { name: "Agregar al Recorrido" }));

    expect(mocks.activateArtistJourney).toHaveBeenCalledWith("a1");
    expect(await screen.findByRole("link", { name: "Ya está en tu Recorrido" })).toBeInTheDocument();
    expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledTimes(1);
  });

  it("'Cargar más' pide solo los artistas nuevos, en una petición", async () => {
    const next: WantToListenEntry = {
      id: "e9",
      targetType: "artist",
      createdAt: "2025-12-01T00:00:00Z",
      target: { id: "a9", title: "Queen", coverThumbUrl: null },
    };
    mocks.getMyWantToListen.mockResolvedValue({ items: [next], page: 2, pageSize: 20, hasNext: false });
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
    expect(screen.queryByRole("button", { name: "Agregar al Recorrido" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toBeInTheDocument();
  });

  it("estado vacío cuando no hay entradas", () => {
    renderWithIntl(
      <WantToListenList initial={{ items: [], page: 1, pageSize: 20, hasNext: false }} />,
    );
    expect(screen.getByText("Todavía no agregaste nada")).toBeInTheDocument();
  });
});
