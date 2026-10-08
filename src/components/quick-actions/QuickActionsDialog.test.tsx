import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { QuickActionsDialog } from "./QuickActionsDialog";
import { ApiError } from "@/lib/api/client";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  createListenEntry: vi.fn(),
  createList: vi.fn(),
  createCamino: vi.fn(),
}));

vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
}));
vi.mock("@/lib/api/lists", () => ({ createList: mocks.createList }));
vi.mock("@/lib/api/camino", () => ({ createCamino: mocks.createCamino }));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => null }));
vi.mock("@/components/diary/ListenEntryForm", () => ({
  ListenEntryForm: ({ entryId }: { entryId: string }) => <div data-testid="expand-form">{entryId}</div>,
}));
// Los paneles de las demás acciones tienen sus propias pruebas; aquí solo se comprueba el cableado.
vi.mock("./panels/RatePanel", () => ({ RatePanel: () => <div data-testid="rate-panel" /> }));
vi.mock("./panels/MarkPanel", () => ({
  MarkPanel: ({ kind }: { kind: string }) => <div data-testid={`mark-panel-${kind}`} />,
}));
vi.mock("./panels/CollectionPanel", () => ({ CollectionPanel: () => <div data-testid="collection-panel" /> }));
vi.mock("./panels/JourneyPanel", () => ({ JourneyPanel: () => <div data-testid="journey-panel" /> }));
vi.mock("./panels/AddToListStep", () => ({ AddToListStep: () => <div data-testid="add-to-list-step" /> }));

const albumId = "a1b2c3d4-0000-4000-8000-000000000010";

const searchResponse = {
  type: "album" as const,
  remoteFailed: false,
  total: 1,
  nextOffset: null,
  refine: null,
  results: [
    {
      kind: "release-group" as const,
      id: albumId,
      mbid: null,
      title: "The Dark Side of the Moon",
      artistName: "Pink Floyd",
      category: "studio" as const,
      year: 1973,
      cached: true,
    },
  ],
};

const recordingId = "a1b2c3d4-0000-4000-8000-000000000030";
const songResponse = {
  type: "song" as const,
  remoteFailed: false,
  total: 2,
  nextOffset: null,
  interpretation: null,
  alternatives: [],
  refine: null,
  results: [
    {
      kind: "song" as const,
      key: "time|pink floyd",
      title: "Time",
      artistName: "Pink Floyd",
      recordingId,
      mbid: null,
      albums: [],
      query: "Pink Floyd - Time",
    },
    {
      kind: "song" as const,
      key: "time|hans zimmer",
      title: "Time",
      artistName: "Hans Zimmer",
      recordingId: null,
      mbid: null,
      albums: [],
      query: "Hans Zimmer - Time",
    },
  ],
};

const createdEntry = {
  id: "a1b2c3d4-0000-4000-8000-000000000020",
  listenContext: "first_listen" as const,
  body: null,
  reaction: null,
  audience: "private" as const,
  createdAt: "2026-01-01",
  target: { type: "release-group", id: albumId, title: "The Dark Side of the Moon", subtitle: null, coverThumbUrl: null },
};

// El diálogo no usa react-query (el Header vive fuera de `<Providers>`), así que no hace falta
// un `QueryClientProvider`.
describe("QuickActionsDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("abre en Escucha con el foco en el buscador", async () => {
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    expect(await screen.findByRole("radio", { name: "Escucha" })).toBeChecked();
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
  });

  it("ofrece las nueve acciones como chips", async () => {
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    const group = await screen.findByRole("radiogroup", { name: "Qué quieres hacer" });
    const names = within(group)
      .getAllByRole("radio")
      .map((chip) => chip.textContent);
    expect(names).toEqual([
      "Escucha",
      "Valorar",
      "Favorito",
      "Pendiente",
      "Colección",
      "Recorrido",
      "A lista",
      "Nueva lista",
      "Nuevo Camino",
    ]);
  });

  it("las flechas mueven entre las acciones", async () => {
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    const listen = await screen.findByRole("radio", { name: "Escucha" });
    listen.focus();
    fireEvent.keyDown(listen, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Valorar" })).toBeChecked();
  });

  it("busca, elige un álbum, crea la escucha y ofrece ampliarla", async () => {
    mocks.searchAlbums.mockResolvedValue(searchResponse);
    mocks.createListenEntry.mockResolvedValue(createdEntry);
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);

    await userEvent.type(await screen.findByRole("searchbox"), "dark side");
    await waitFor(() => expect(mocks.searchAlbums).toHaveBeenCalledWith("dark side"), { timeout: 1500 });
    // Álbum es el tipo por defecto: un solo tipo por búsqueda.
    expect(mocks.searchSongs).not.toHaveBeenCalled();
    expect(mocks.searchArtists).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole("button", { name: /The Dark Side of the Moon/ }));

    expect(mocks.createListenEntry).toHaveBeenCalledTimes(1);
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: albumId });
    expect(await screen.findByTestId("expand-form")).toHaveTextContent(createdEntry.id);
  });

  it("con el tipo Canción registra la canción resuelta (la única con grabación)", async () => {
    mocks.searchSongs.mockResolvedValue(songResponse);
    mocks.createListenEntry.mockResolvedValue({
      ...createdEntry,
      target: { ...createdEntry.target, type: "recording", id: recordingId },
    });
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);

    await userEvent.click(await screen.findByRole("radio", { name: "Canción" }));
    await userEvent.type(screen.getByRole("searchbox"), "time");
    await waitFor(() => expect(mocks.searchSongs).toHaveBeenCalledWith("time"), { timeout: 1500 });

    const options = await screen.findAllByRole("button", { name: /Time/ });
    expect(options).toHaveLength(1);
    await userEvent.click(options[0]!);
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "recording", id: recordingId });
  });

  it("con 401 muestra el enlace para iniciar sesión", async () => {
    mocks.searchAlbums.mockResolvedValue(searchResponse);
    mocks.createListenEntry.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);

    await userEvent.type(await screen.findByRole("searchbox"), "dark side");
    await userEvent.click(await screen.findByRole("button", { name: /The Dark Side of the Moon/ }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Iniciar sesión/ })).toHaveAttribute("href", "/auth/login"),
    );
  });

  it("con menos de dos letras no busca", async () => {
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    await userEvent.type(await screen.findByRole("searchbox"), "d");
    expect(await screen.findByText(/al menos dos letras/)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(mocks.searchAlbums).not.toHaveBeenCalled();
  });

  it("cambiar de acción conserva el texto de búsqueda y no registra nada", async () => {
    mocks.searchAlbums.mockResolvedValue(searchResponse);
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);

    await userEvent.type(await screen.findByRole("searchbox"), "dark side");
    await userEvent.click(screen.getByRole("radio", { name: "Valorar" }));

    expect(screen.getByRole("searchbox")).toHaveValue("dark side");
    expect(mocks.createListenEntry).not.toHaveBeenCalled();
  });

  it("Pendiente ofrece álbum y artista pero no canción", async () => {
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Pendiente" }));
    expect(screen.getByRole("radio", { name: "Álbum" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Artista" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Canción" })).not.toBeInTheDocument();
  });

  it("al pasar a Pendiente con Canción seleccionada vuelve a Álbum", async () => {
    mocks.searchAlbums.mockResolvedValue(searchResponse);
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Canción" }));
    await userEvent.type(screen.getByRole("searchbox"), "time");
    await userEvent.click(screen.getByRole("radio", { name: "Pendiente" }));
    expect(screen.getByRole("radio", { name: "Álbum" })).toBeChecked();
  });

  it("elegir un resultado monta el panel de la acción activa", async () => {
    mocks.searchAlbums.mockResolvedValue(searchResponse);
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Favorito" }));
    await userEvent.type(screen.getByRole("searchbox"), "dark side");
    await userEvent.click(await screen.findByRole("button", { name: /The Dark Side of the Moon/ }));
    expect(await screen.findByTestId("mark-panel-favorite")).toBeInTheDocument();
    expect(mocks.createListenEntry).not.toHaveBeenCalled();
  });

  it("Nueva lista no muestra el buscador", async () => {
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Nueva lista" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la lista")).toBeInTheDocument();
  });

  it("tras crear una lista, 'Agregar a esta lista' pasa a A lista con la búsqueda fijada al tipo", async () => {
    mocks.createList.mockResolvedValue({ id: "l1", title: "Para el auto", entityType: "artist" });
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);

    await userEvent.click(await screen.findByRole("radio", { name: "Nueva lista" }));
    await userEvent.click(screen.getByRole("radio", { name: "Artistas" }));
    await userEvent.type(screen.getByLabelText("Nombre de la lista"), "Para el auto");
    await userEvent.click(screen.getByRole("button", { name: "Crear lista" }));
    await userEvent.click(await screen.findByRole("button", { name: "Agregar a esta lista" }));

    expect(screen.getByRole("radio", { name: "A lista" })).toBeChecked();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    // Tipo fijado: no se ofrece el conmutador de tipo de búsqueda.
    expect(screen.queryByRole("radio", { name: "Álbum" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Canción" })).not.toBeInTheDocument();
  });

  it("Colección busca solo álbumes y Recorrido solo artistas, sin conmutador de tipo", async () => {
    mocks.searchArtists.mockResolvedValue({ ...searchResponse, type: "artist", results: [] });
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Canción" }));

    await userEvent.click(screen.getByRole("radio", { name: "Colección" }));
    expect(screen.queryByRole("radio", { name: "Canción" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Artista" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Recorrido" }));
    expect(screen.queryByRole("radio", { name: "Álbum" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox"), "pink");
    await waitFor(() => expect(mocks.searchArtists).toHaveBeenCalledWith("pink"), { timeout: 1500 });
    expect(mocks.searchAlbums).not.toHaveBeenCalled();
  });

  it("elegir un álbum con Colección monta el panel de colección", async () => {
    mocks.searchAlbums.mockResolvedValue(searchResponse);
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("radio", { name: "Colección" }));
    await userEvent.type(screen.getByRole("searchbox"), "dark side");
    await userEvent.click(await screen.findByRole("button", { name: /The Dark Side of the Moon/ }));
    expect(await screen.findByTestId("collection-panel")).toBeInTheDocument();
  });

  it("Nuevo Camino no muestra el buscador y 'Agregar a este Camino' pasa a A lista con álbumes fijados", async () => {
    mocks.createCamino.mockResolvedValue({ id: "c1", title: "Para el auto" });
    renderWithIntl(<QuickActionsDialog onClose={() => {}} />);

    await userEvent.click(await screen.findByRole("radio", { name: "Nuevo Camino" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Nombre del Camino"), "Para el auto");
    await userEvent.click(screen.getByRole("button", { name: "Crear Camino" }));
    await userEvent.click(await screen.findByRole("button", { name: "Agregar a este Camino" }));

    expect(screen.getByRole("radio", { name: "A lista", checked: true })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Canción" })).not.toBeInTheDocument();
    expect(mocks.createCamino).toHaveBeenCalledWith({ title: "Para el auto" });
  });

  it("Escape cierra el diálogo", async () => {
    const onClose = vi.fn();
    renderWithIntl(<QuickActionsDialog onClose={onClose} />);
    // El listener se ata tras montar el portal.
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
