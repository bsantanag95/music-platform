import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import onboardingEs from "../../../messages/es/onboarding.json";
import { NowPlayingPicker } from "./NowPlayingPicker";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  getSearchSuggestions: vi.fn(),
  createListenEntry: vi.fn(),
  deleteListenEntry: vi.fn(),
}));
vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
  getSearchSuggestions: mocks.getSearchSuggestions,
}));
vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => null }));

const okComputerId = "a1b2c3d4-0000-4000-8000-000000000060";
const espressoTributeId = "a1b2c3d4-0000-4000-8000-000000000061";
const espressoSabrinaId = "a1b2c3d4-0000-4000-8000-000000000062";
const entryId = "a1b2c3d4-0000-4000-8000-0000000000e1";

const albumResponse = {
  type: "album" as const,
  remoteFailed: false,
  total: 2,
  nextOffset: null,
  refine: null,
  results: [
    {
      kind: "release-group" as const,
      id: okComputerId,
      mbid: null,
      title: "OK Computer",
      artistName: "Radiohead",
      category: "studio" as const,
      year: 1997,
      cached: true,
    },
    {
      kind: "release-group" as const,
      id: "a1b2c3d4-0000-4000-8000-000000000063",
      mbid: null,
      title: "OK Computer (single)",
      artistName: "Lemaitre",
      category: "single_ep" as const,
      year: 2021,
      cached: false,
    },
  ],
};

function songGroup(recordingId: string, title: string, artistName: string) {
  return { kind: "song" as const, key: recordingId, title, artistName, recordingId, mbid: null, albums: [], query: title };
}

const songResponse = {
  type: "song" as const,
  remoteFailed: false,
  total: 2,
  nextOffset: null,
  interpretation: null,
  alternatives: [],
  refine: null,
  results: [songGroup(espressoTributeId, "Espresso", "Tributo X"), songGroup(espressoSabrinaId, "Espresso", "Sabrina Carpenter")],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSearchSuggestions.mockResolvedValue({ suggestions: [] });
  mocks.createListenEntry.mockResolvedValue({ id: entryId });
  mocks.deleteListenEntry.mockResolvedValue(null);
});

describe("NowPlayingPicker", () => {
  it("muestra año y tipo en cada resultado de álbum", async () => {
    mocks.searchAlbums.mockResolvedValue(albumResponse);
    const user = userEvent.setup();
    renderWithIntl(<NowPlayingPicker audience="private" />);

    await user.type(screen.getByRole("searchbox"), "ok computer");

    expect(await screen.findByRole("button", { name: /Radiohead · 1997/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lemaitre · 2021 · Single \/ EP/ })).toBeInTheDocument();
  });

  it("ofrece todas las canciones registrables, no solo la primera", async () => {
    mocks.searchSongs.mockResolvedValue(songResponse);
    const user = userEvent.setup();
    renderWithIntl(<NowPlayingPicker audience="private" />);

    await user.click(screen.getByRole("radio", { name: "Canción" }));
    await user.type(screen.getByRole("searchbox"), "espresso");

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Espresso/ })).toHaveLength(2));
    expect(mocks.searchSongs).toHaveBeenCalledWith("espresso", { purpose: "pick", signal: expect.any(AbortSignal) });
    expect(screen.getByRole("button", { name: /Sabrina Carpenter/ })).toBeInTheDocument();
  });

  it("registra una vez aunque se haga clic dos veces seguidas", async () => {
    mocks.searchAlbums.mockResolvedValue(albumResponse);
    let resolveCreate: (value: { id: string }) => void = () => {};
    mocks.createListenEntry.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    const user = userEvent.setup();
    renderWithIntl(<NowPlayingPicker audience="private" />);

    await user.type(screen.getByRole("searchbox"), "ok computer");
    const row = await screen.findByRole("button", { name: /Radiohead · 1997/ });
    await user.click(row);
    await user.click(row);
    resolveCreate({ id: entryId });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Deshacer el registro de OK Computer" })).toBeInTheDocument(),
    );
    expect(mocks.createListenEntry).toHaveBeenCalledTimes(1);
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: okComputerId });
    // Lo registrado sale de los resultados: no se puede volver a elegir.
    expect(screen.queryByRole("button", { name: /Radiohead · 1997/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Registrado: OK Computer/)).toBeInTheDocument();
  });

  it("deshace el registro borrando la entrada y devuelve el resultado a la lista", async () => {
    mocks.searchAlbums.mockResolvedValue(albumResponse);
    const user = userEvent.setup();
    renderWithIntl(<NowPlayingPicker audience="private" />);

    await user.type(screen.getByRole("searchbox"), "ok computer");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 1997/ }));
    await user.click(await screen.findByRole("button", { name: "Deshacer el registro de OK Computer" }));

    await waitFor(() => expect(mocks.deleteListenEntry).toHaveBeenCalledWith(entryId));
    expect(await screen.findByRole("button", { name: /Radiohead · 1997/ })).toBeInTheDocument();
    expect(screen.getByText(/Registro deshecho: OK Computer/)).toBeInTheDocument();
  });

  it("un fallo de búsqueda se dice como error, no como «Sin resultados»", async () => {
    mocks.searchAlbums.mockRejectedValue(new Error("boom"));
    mocks.getSearchSuggestions.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithIntl(<NowPlayingPicker audience="private" />);

    await user.type(screen.getByRole("searchbox"), "ok computer");

    expect(await screen.findByText(onboardingEs.searchError)).toBeInTheDocument();
    expect(screen.queryByText(onboardingEs.door2.noResults)).not.toBeInTheDocument();
  });

  it("el ejemplo del campo corresponde al tipo buscado", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NowPlayingPicker audience="private" />);

    expect(screen.getByPlaceholderText(onboardingEs.door2.searchPlaceholderAlbum)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Canción" }));
    expect(screen.getByPlaceholderText(onboardingEs.door2.searchPlaceholderSong)).toBeInTheDocument();
  });
});
