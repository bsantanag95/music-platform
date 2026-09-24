import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ArtistJourneyStartModal } from "./ArtistJourneyStartModal";
import type { ArtistJourneyDetail, ReleaseGroup } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  activateArtistJourney: vi.fn(),
  setArtistJourneySelection: vi.fn(),
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
  activateArtistJourney: mocks.activateArtistJourney,
  setArtistJourneySelection: mocks.setArtistJourneySelection,
}));

const categoryLabels = {
  studio: "Estudio",
  single_ep: "Sencillos / EP",
  compilation: "Compilados",
  live_other: "En vivo / Misceláneo",
};

const albums: ReleaseGroup[] = [
  { id: "s1", mbid: null, title: "Studio One", category: "studio", firstReleaseDate: null, firstReleaseYear: 1990, createdAt: "2026-01-01T00:00:00.000Z", coverThumbUrl: null, coverResolved: false },
  { id: "s2", mbid: null, title: "Studio Two", category: "studio", firstReleaseDate: null, firstReleaseYear: 1995, createdAt: "2026-01-01T00:00:00.000Z", coverThumbUrl: null, coverResolved: false },
  { id: "l1", mbid: null, title: "Live One", category: "live_other", firstReleaseDate: null, firstReleaseYear: 2000, createdAt: "2026-01-01T00:00:00.000Z", coverThumbUrl: null, coverResolved: false },
];

function journey(over: Partial<ArtistJourneyDetail> = {}): ArtistJourneyDetail {
  return {
    artistId: "artist-1",
    state: "in_progress",
    activatedAt: "2026-01-01T00:00:00.000Z",
    progress: { selectedCount: 2, listenedCount: 0 },
    albums: [],
    ...over,
  };
}

function renderModal(onClose = vi.fn()) {
  const utils = renderWithIntl(
    <ArtistJourneyStartModal
      artistId="artist-1"
      artistName="Deep Purple"
      albums={albums}
      categoryLabels={categoryLabels}
      onClose={onClose}
    />,
  );
  return { ...utils, onClose };
}

describe("ArtistJourneyStartModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preselecciona los álbumes de estudio; el resto de grupos arranca colapsado", () => {
    renderModal();
    expect(screen.getByRole("checkbox", { name: "Incluir Studio One en el recorrido" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" })).toBeChecked();
    expect(screen.queryByText("Live One")).not.toBeInTheDocument();
  });

  it("cancelar cierra el modal sin llamar al servidor", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
    expect(mocks.activateArtistJourney).not.toHaveBeenCalled();
  });

  it("guardar activa el recorrido, guarda la selección elegida y navega a la gestión", async () => {
    const user = userEvent.setup();
    mocks.activateArtistJourney.mockResolvedValueOnce(journey());
    mocks.setArtistJourneySelection.mockResolvedValueOnce(journey());
    renderModal();
    await user.click(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(mocks.activateArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(mocks.setArtistJourneySelection).toHaveBeenCalledWith("artist-1", ["s1"]);
    expect(mocks.push).toHaveBeenCalledWith("/me/artist-journeys/artist-1");
  });

  it("un error al guardar deja el modal abierto con un aviso", async () => {
    const user = userEvent.setup();
    mocks.activateArtistJourney.mockRejectedValueOnce(new mocks.ApiError("INTERNAL_ERROR"));
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("Escape cierra el modal", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
