import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import onboardingEs from "../../../messages/es/onboarding.json";
import { WantToListenPicker } from "./WantToListenPicker";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  getSearchSuggestions: vi.fn(),
  toggleWantToListen: vi.fn(),
  removeFromWantToListen: vi.fn(),
}));
vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
  getSearchSuggestions: mocks.getSearchSuggestions,
}));
vi.mock("@/lib/api/want-to-listen", () => ({
  toggleWantToListen: mocks.toggleWantToListen,
  removeFromWantToListen: mocks.removeFromWantToListen,
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => null }));

const blondeId = "a1b2c3d4-0000-4000-8000-0000000000a0";
const fionaId = "a1b2c3d4-0000-4000-8000-0000000000a1";

const albumResponse = {
  type: "album" as const,
  remoteFailed: false,
  total: 1,
  nextOffset: null,
  refine: null,
  results: [
    {
      kind: "release-group" as const,
      id: blondeId,
      mbid: null,
      title: "Blonde",
      artistName: "Frank Ocean",
      category: "studio" as const,
      year: 2016,
      cached: true,
    },
  ],
};

const artistResponse = {
  type: "artist" as const,
  remoteFailed: false,
  results: [
    {
      kind: "artist" as const,
      id: fionaId,
      mbid: null,
      name: "Fiona Apple",
      disambiguation: "cantautora",
      artistType: "person" as const,
      country: null,
      cached: true,
      exact: false,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSearchSuggestions.mockResolvedValue({ suggestions: [] });
  mocks.searchAlbums.mockResolvedValue(albumResponse);
  mocks.searchArtists.mockResolvedValue(artistResponse);
  mocks.toggleWantToListen.mockResolvedValue({ id: "w1" });
  mocks.removeFromWantToListen.mockResolvedValue(null);
});

describe("WantToListenPicker", () => {
  it("guarda el álbum elegido, lo lista aparte y lo saca de los resultados", async () => {
    const onCount = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<WantToListenPicker onCountChange={onCount} />);

    await user.type(screen.getByRole("searchbox"), "blonde");
    await user.click(await screen.findByRole("button", { name: /Frank Ocean · 2016/ }));

    await waitFor(() => expect(mocks.toggleWantToListen).toHaveBeenCalledWith({ type: "release-group", id: blondeId }));
    expect(await screen.findByRole("button", { name: "Quitar Blonde de Pendientes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Frank Ocean · 2016/ })).not.toBeInTheDocument();
    expect(screen.getByText("Guardaste 1 elemento")).toBeInTheDocument();
    expect(onCount).toHaveBeenLastCalledWith(1);
  });

  it("busca artistas con el conmutador y los guarda como artista", async () => {
    const user = userEvent.setup();
    renderWithIntl(<WantToListenPicker />);

    await user.click(screen.getByRole("radio", { name: "Artista" }));
    await user.type(screen.getByRole("searchbox"), "fiona");
    await user.click(await screen.findByRole("button", { name: /cantautora/ }));

    await waitFor(() => expect(mocks.toggleWantToListen).toHaveBeenCalledWith({ type: "artist", id: fionaId }));
    expect(await screen.findByRole("button", { name: "Quitar Fiona Apple de Pendientes" })).toBeInTheDocument();
  });

  it("guarda una sola vez aunque se haga clic dos veces seguidas", async () => {
    let resolveToggle: (value: { id: string }) => void = () => {};
    mocks.toggleWantToListen.mockReturnValue(new Promise((resolve) => (resolveToggle = resolve)));
    const user = userEvent.setup();
    renderWithIntl(<WantToListenPicker />);

    await user.type(screen.getByRole("searchbox"), "blonde");
    const row = await screen.findByRole("button", { name: /Frank Ocean · 2016/ });
    await user.click(row);
    await user.click(row);
    resolveToggle({ id: "w1" });

    await screen.findByRole("button", { name: "Quitar Blonde de Pendientes" });
    expect(mocks.toggleWantToListen).toHaveBeenCalledTimes(1);
  });

  it("si el toggle quitó algo que ya estaba en Pendientes, lo vuelve a guardar", async () => {
    mocks.toggleWantToListen.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "w1" });
    const user = userEvent.setup();
    renderWithIntl(<WantToListenPicker />);

    await user.type(screen.getByRole("searchbox"), "blonde");
    await user.click(await screen.findByRole("button", { name: /Frank Ocean · 2016/ }));

    await screen.findByRole("button", { name: "Quitar Blonde de Pendientes" });
    expect(mocks.toggleWantToListen).toHaveBeenCalledTimes(2);
  });

  it("quita de Pendientes y devuelve el elemento a los resultados", async () => {
    const onCount = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<WantToListenPicker onCountChange={onCount} />);

    await user.type(screen.getByRole("searchbox"), "blonde");
    await user.click(await screen.findByRole("button", { name: /Frank Ocean · 2016/ }));
    await user.click(await screen.findByRole("button", { name: "Quitar Blonde de Pendientes" }));

    await waitFor(() => expect(mocks.removeFromWantToListen).toHaveBeenCalledWith({ type: "release-group", id: blondeId }));
    await waitFor(() => expect(onCount).toHaveBeenLastCalledWith(0));
    expect(screen.getByText("Todavía no guardaste nada")).toBeInTheDocument();
  });

  it("si guardar falla, muestra el error y no lista nada", async () => {
    mocks.toggleWantToListen.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithIntl(<WantToListenPicker />);

    await user.type(screen.getByRole("searchbox"), "blonde");
    await user.click(await screen.findByRole("button", { name: /Frank Ocean · 2016/ }));

    expect(await screen.findByText(onboardingEs.error)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar Blonde de Pendientes" })).not.toBeInTheDocument();
  });

  it("un fallo de búsqueda se dice como error, no como «Sin resultados»", async () => {
    mocks.searchAlbums.mockRejectedValue(new Error("boom"));
    mocks.getSearchSuggestions.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithIntl(<WantToListenPicker />);

    await user.type(screen.getByRole("searchbox"), "blonde");

    expect(await screen.findByText(onboardingEs.searchError)).toBeInTheDocument();
    expect(screen.queryByText(onboardingEs.wanted.noResults)).not.toBeInTheDocument();
  });
});
