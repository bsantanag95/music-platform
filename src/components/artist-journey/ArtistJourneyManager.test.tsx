import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ArtistJourneyManager } from "./ArtistJourneyManager";
import type { ArtistJourneyDetail } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setArtistJourneySelection: vi.fn(),
  archiveArtistJourney: vi.fn(),
  unarchiveArtistJourney: vi.fn(),
  deleteArtistJourney: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));
vi.mock("@/lib/api/artist-journeys", () => ({
  setArtistJourneySelection: mocks.setArtistJourneySelection,
  archiveArtistJourney: mocks.archiveArtistJourney,
  unarchiveArtistJourney: mocks.unarchiveArtistJourney,
  deleteArtistJourney: mocks.deleteArtistJourney,
}));

const categoryLabels = {
  studio: "Estudio",
  single_ep: "Sencillos / EP",
  compilation: "Compilados",
  live_other: "En vivo / Misceláneo",
};

function journey(over: Partial<ArtistJourneyDetail> = {}): ArtistJourneyDetail {
  return {
    artistId: "artist-1",
    state: "in_progress",
    activatedAt: "2026-01-01T00:00:00.000Z",
    progress: { selectedCount: 1, listenedCount: 0 },
    albums: [
      { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true },
      { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false },
      { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false },
    ],
    ...over,
  };
}

function renderManager(over: Partial<ArtistJourneyDetail> = {}) {
  return renderWithIntl(
    <ArtistJourneyManager
      artistId="artist-1"
      artistName="Deep Purple"
      initialJourney={journey(over)}
      categoryLabels={categoryLabels}
    />,
  );
}

describe("ArtistJourneyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expande estudio por defecto y colapsa el resto", () => {
    renderManager();
    expect(screen.getByText("Studio One")).toBeInTheDocument();
    expect(screen.queryByText("Live One")).not.toBeInTheDocument();
  });

  it("expande un grupo colapsado al activar su encabezado", async () => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole("button", { name: /en vivo/i }));
    expect(screen.getByText("Live One")).toBeInTheDocument();
  });

  it("sin cambios, Guardar está deshabilitado pero muestra que no hay nada pendiente", () => {
    renderManager();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();
  });

  it("al marcar un álbum, el aviso de 'sin cambios' desaparece", async () => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" }));
    expect(screen.queryByText("Sin cambios pendientes")).not.toBeInTheDocument();
  });

  it("marcar un álbum habilita Guardar; guardar envía el conjunto final completo", async () => {
    const user = userEvent.setup();
    mocks.setArtistJourneySelection.mockResolvedValueOnce(
      journey({
        albums: [
          { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true },
          { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: true },
          { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false },
        ],
      }),
    );
    renderManager();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(mocks.setArtistJourneySelection).toHaveBeenCalledWith("artist-1", expect.arrayContaining(["s1", "s2"]));
  });

  it("seleccionar todo un grupo marca todos sus álbumes sin llamar al servidor", async () => {
    const user = userEvent.setup();
    renderManager();
    const group = screen.getByText("Estudio").closest("div")!.parentElement!;
    await user.click(within(group).getByRole("checkbox", { name: /seleccionar todos/i }));
    expect(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" })).toBeChecked();
    expect(mocks.setArtistJourneySelection).not.toHaveBeenCalled();
  });

  it("archivar y desarchivar alternan según el estado actual", async () => {
    const user = userEvent.setup();
    mocks.archiveArtistJourney.mockResolvedValueOnce(journey({ state: "archived" }));
    renderManager();
    await user.click(screen.getByRole("button", { name: "Archivar" }));
    expect(mocks.archiveArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(await screen.findByRole("button", { name: "Desarchivar" })).toBeInTheDocument();
  });

  it("borrar requiere confirmación y redirige al listado", async () => {
    const user = userEvent.setup();
    mocks.deleteArtistJourney.mockResolvedValueOnce(null);
    renderManager();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(mocks.deleteArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(mocks.push).toHaveBeenCalledWith("/me/artist-journeys");
  });
});
