import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ArtistJourneySection } from "./ArtistJourneySection";
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

vi.mock("@/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...rest }, children),
    useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
  };
});
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
  { id: "s1", mbid: null, title: "Studio One", category: "studio", firstReleaseDate: null, firstReleaseYear: 1990, createdAt: "2026-01-01T00:00:00.000Z" },
];

function journey(over: Partial<ArtistJourneyDetail> = {}): ArtistJourneyDetail {
  return {
    artistId: "artist-1",
    state: "in_progress",
    activatedAt: "2026-01-01T00:00:00.000Z",
    progress: { selectedCount: 4, listenedCount: 2 },
    albums: [],
    ...over,
  };
}

function renderSection(over: Partial<Parameters<typeof ArtistJourneySection>[0]> = {}) {
  return renderWithIntl(
    <ArtistJourneySection
      artistId="artist-1"
      artistName="Deep Purple"
      authenticated
      initialJourney={null}
      albums={albums}
      categoryLabels={categoryLabels}
      {...over}
    />,
  );
}

describe("ArtistJourneySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin sesión, enlaza a iniciar sesión", () => {
    renderSection({ authenticated: false });
    expect(screen.getByRole("link", { name: "Iniciar sesión para armar tu recorrido" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });

  it("sin recorrido activo, 'Armar recorrido' abre el modal de inicio sin llamar al servidor", async () => {
    const user = userEvent.setup();
    renderSection();
    expect(mocks.activateArtistJourney).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Armar recorrido" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.activateArtistJourney).not.toHaveBeenCalled();
  });

  it("guardar en el modal activa, guarda la selección y navega a la gestión", async () => {
    const user = userEvent.setup();
    mocks.activateArtistJourney.mockResolvedValueOnce(journey());
    mocks.setArtistJourneySelection.mockResolvedValueOnce(journey());
    renderSection();
    await user.click(screen.getByRole("button", { name: "Armar recorrido" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(mocks.activateArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(mocks.setArtistJourneySelection).toHaveBeenCalledWith("artist-1", ["s1"]);
    expect(mocks.push).toHaveBeenCalledWith("/me/artist-journeys/artist-1");
  });

  it("cancelar en el modal lo cierra sin llamar al servidor", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: "Armar recorrido" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.activateArtistJourney).not.toHaveBeenCalled();
  });

  it("con un recorrido en curso, es de solo lectura y enlaza a la gestión", () => {
    renderSection({ initialJourney: journey() });
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gestionar recorrido" })).toHaveAttribute(
      "href",
      "/me/artist-journeys/artist-1",
    );
    expect(screen.queryByRole("button", { name: "Archivar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("con selección vacía, muestra el aviso en vez de la barra de progreso", () => {
    renderSection({ initialJourney: journey({ progress: { selectedCount: 0, listenedCount: 0 } }) });
    expect(screen.getByText("Todavía no seleccionaste ningún álbum.")).toBeInTheDocument();
  });

  it("un recorrido completo muestra el estado completo", () => {
    renderSection({ initialJourney: journey({ state: "complete" }) });
    expect(screen.getByText("Completo")).toBeInTheDocument();
  });
});
