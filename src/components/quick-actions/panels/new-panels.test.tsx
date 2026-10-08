import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ApiError } from "@/lib/api/client";
import { CollectionPanel } from "./CollectionPanel";
import { JourneyPanel } from "./JourneyPanel";
import { NewCaminoPanel } from "./NewCaminoPanel";
import type { PickTarget } from "../types";

const mocks = vi.hoisted(() => ({
  addCollectionEntry: vi.fn(),
  removeCollectionEntry: vi.fn(),
  getArtistJourneyStatuses: vi.fn(),
  activateArtistJourney: vi.fn(),
  createCamino: vi.fn(),
}));

vi.mock("@/lib/api/collection", () => ({
  addCollectionEntry: mocks.addCollectionEntry,
  removeCollectionEntry: mocks.removeCollectionEntry,
}));
vi.mock("@/lib/api/artist-journeys", () => ({
  getArtistJourneyStatuses: mocks.getArtistJourneyStatuses,
  activateArtistJourney: mocks.activateArtistJourney,
}));
vi.mock("@/lib/api/camino", () => ({ createCamino: mocks.createCamino }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

const album: PickTarget = {
  type: "release-group",
  id: "a1b2c3d4-0000-4000-8000-000000000010",
  title: "Dr. Feelgood",
  subtitle: "Mötley Crüe",
};
const artist: PickTarget = {
  type: "artist",
  id: "a1b2c3d4-0000-4000-8000-000000000050",
  title: "Pink Floyd",
  subtitle: null,
};

beforeEach(() => vi.clearAllMocks());

describe("CollectionPanel", () => {
  it("tocar un formato agrega una copia y ofrece Deshacer", async () => {
    mocks.addCollectionEntry.mockResolvedValue({ id: "entry1", format: "vinyl" });
    mocks.removeCollectionEntry.mockResolvedValue(null);
    renderWithIntl(<CollectionPanel target={album} onReset={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Vinilo" }));

    expect(mocks.addCollectionEntry).toHaveBeenCalledTimes(1);
    expect(mocks.addCollectionEntry).toHaveBeenCalledWith({ releaseGroupId: album.id, format: "vinyl" });
    expect(await screen.findByText("Agregado a tu colección (Vinilo): Dr. Feelgood")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(mocks.removeCollectionEntry).toHaveBeenCalledWith("entry1");
    expect(await screen.findByText("Se quitó de tu colección: Dr. Feelgood")).toBeInTheDocument();
  });

  it("ofrece los cuatro formatos y no envía audiencia, atributos ni nota", async () => {
    mocks.addCollectionEntry.mockResolvedValue({ id: "entry2", format: "cassette" });
    renderWithIntl(<CollectionPanel target={album} onReset={() => {}} />);
    for (const name of ["Vinilo", "CD", "Cassette", "Otro"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: "Cassette" }));
    const input = mocks.addCollectionEntry.mock.calls[0]![0];
    expect(Object.keys(input).sort()).toEqual(["format", "releaseGroupId"]);
  });

  it("un error del servidor se muestra sin el mensaje crudo", async () => {
    mocks.addCollectionEntry.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "boom interno"));
    renderWithIntl(<CollectionPanel target={album} onReset={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "CD" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos guardar");
    expect(alert).not.toHaveTextContent("boom interno");
  });

  it("sin sesión ofrece iniciar sesión", async () => {
    mocks.addCollectionEntry.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    renderWithIntl(<CollectionPanel target={album} onReset={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "CD" }));
    expect(await screen.findByRole("link", { name: "Iniciar sesión para continuar" })).toBeInTheDocument();
  });
});

describe("JourneyPanel", () => {
  it("activa el recorrido cuando no existe y enlaza a su gestión", async () => {
    mocks.getArtistJourneyStatuses.mockResolvedValue([]);
    mocks.activateArtistJourney.mockResolvedValue({});
    renderWithIntl(<JourneyPanel target={artist} onReset={() => {}} onNavigate={() => {}} />);

    expect(await screen.findByText("Recorrido activado: Pink Floyd")).toBeInTheDocument();
    expect(mocks.getArtistJourneyStatuses).toHaveBeenCalledWith([artist.id]);
    expect(mocks.activateArtistJourney).toHaveBeenCalledTimes(1);
    expect(mocks.activateArtistJourney).toHaveBeenCalledWith(artist.id);
    expect(screen.getByRole("link", { name: "Ver Recorrido" })).toHaveAttribute(
      "href",
      `/me/artist-journeys/${artist.id}`,
    );
  });

  it("si ya existe lo informa y NO activa nada", async () => {
    mocks.getArtistJourneyStatuses.mockResolvedValue([artist.id]);
    renderWithIntl(<JourneyPanel target={artist} onReset={() => {}} onNavigate={() => {}} />);

    expect(await screen.findByText("Pink Floyd ya está en tu Recorrido")).toBeInTheDocument();
    expect(mocks.activateArtistJourney).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Ver Recorrido" })).toBeInTheDocument();
  });

  it("si la lectura falla no activa nada y muestra el error", async () => {
    mocks.getArtistJourneyStatuses.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<JourneyPanel target={artist} onReset={() => {}} onNavigate={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
    expect(mocks.activateArtistJourney).not.toHaveBeenCalled();
  });

  it("si activar falla muestra el error", async () => {
    mocks.getArtistJourneyStatuses.mockResolvedValue([]);
    mocks.activateArtistJourney.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<JourneyPanel target={artist} onReset={() => {}} onNavigate={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
  });
});

describe("NewCaminoPanel", () => {
  it("sin título no crea el Camino y lo indica", async () => {
    renderWithIntl(<NewCaminoPanel onAddAlbums={() => {}} onNavigate={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Crear Camino" }));
    expect(screen.getByText("El título es obligatorio")).toBeInTheDocument();
    expect(mocks.createCamino).not.toHaveBeenCalled();
  });

  it("crea el Camino SIN audiencia para que aplique la audiencia por defecto", async () => {
    mocks.createCamino.mockResolvedValue({ id: "c1", title: "Para el auto" });
    renderWithIntl(<NewCaminoPanel onAddAlbums={() => {}} onNavigate={() => {}} />);

    await userEvent.type(screen.getByLabelText("Nombre del Camino"), "Para el auto");
    await userEvent.click(screen.getByRole("button", { name: "Crear Camino" }));

    expect(mocks.createCamino).toHaveBeenCalledTimes(1);
    const input = mocks.createCamino.mock.calls[0]![0];
    expect(input).toEqual({ title: "Para el auto" });
    expect("audience" in input).toBe(false);
    expect(await screen.findByText("Camino creado: Para el auto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver Camino" })).toHaveAttribute("href", "/me/caminos/c1");
  });

  it("'Agregar a este Camino' avisa al diálogo", async () => {
    mocks.createCamino.mockResolvedValue({ id: "c1", title: "X" });
    const onAddAlbums = vi.fn();
    renderWithIntl(<NewCaminoPanel onAddAlbums={onAddAlbums} onNavigate={() => {}} />);
    await userEvent.type(screen.getByLabelText("Nombre del Camino"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Crear Camino" }));
    await userEvent.click(await screen.findByRole("button", { name: "Agregar a este Camino" }));
    await waitFor(() => expect(onAddAlbums).toHaveBeenCalledTimes(1));
  });

  it("un error del servidor se muestra sin el mensaje crudo", async () => {
    mocks.createCamino.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "boom interno"));
    renderWithIntl(<NewCaminoPanel onAddAlbums={() => {}} onNavigate={() => {}} />);
    await userEvent.type(screen.getByLabelText("Nombre del Camino"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Crear Camino" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos guardar");
    expect(alert).not.toHaveTextContent("boom interno");
  });
});
