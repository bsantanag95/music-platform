import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl, withIntl } from "@/test/i18n-test-utils";
import { TargetPicker } from "./TargetPicker";
import type { PickerType } from "./types";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  getSearchSuggestions: vi.fn(),
}));
vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
  getSearchSuggestions: mocks.getSearchSuggestions,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => null }));

const pinkFloydId = "a1b2c3d4-0000-4000-8000-000000000050";
const tributeId = "a1b2c3d4-0000-4000-8000-000000000051";

function artistResult(id: string, name: string, disambiguation: string | null) {
  return {
    kind: "artist" as const,
    id,
    mbid: null,
    name,
    disambiguation,
    artistType: "group" as const,
    country: null,
    cached: true,
    exact: false,
  };
}

const artistResponse = {
  type: "artist" as const,
  remoteFailed: false,
  results: [artistResult(pinkFloydId, "Pink Floyd", "rock británico")],
};

const localPinkFloyd = {
  suggestions: [
    { kind: "artist" as const, id: pinkFloydId, name: "Pink Floyd", artistType: "group" as const, disambiguation: "rock británico" },
  ],
};

/** Una promesa que nunca se resuelve: la búsqueda completa sigue pendiente. */
const never = () => new Promise<never>(() => {});

function picker(props: { types: readonly PickerType[]; type: PickerType; rawQuery: string; onPick?: () => void }) {
  return (
    <TargetPicker
      types={props.types}
      type={props.type}
      onTypeChange={() => {}}
      rawQuery={props.rawQuery}
      onRawQueryChange={() => {}}
      onPick={props.onPick ?? (() => {})}
      inputRef={createRef<HTMLInputElement>()}
      inputId="q"
      prompt="¿Qué quieres registrar?"
    />
  );
}

function renderPicker(props: Parameters<typeof picker>[0]) {
  return renderWithIntl(picker(props));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSearchSuggestions.mockResolvedValue({ suggestions: [] });
});

describe("TargetPicker", () => {
  it("busca solo el tipo activo, con el texto recibido, en las dos fases", async () => {
    mocks.searchArtists.mockResolvedValue(artistResponse);
    renderPicker({ types: ["album", "song", "artist"], type: "artist", rawQuery: "pink" });

    await waitFor(() => expect(mocks.searchArtists).toHaveBeenCalledWith("pink", { signal: expect.any(AbortSignal) }));
    expect(mocks.getSearchSuggestions).toHaveBeenCalledWith("artist", "pink", expect.any(AbortSignal));
    expect(mocks.searchAlbums).not.toHaveBeenCalled();
    expect(mocks.searchSongs).not.toHaveBeenCalled();
  });

  it("las canciones se buscan en modo de elección", async () => {
    mocks.searchSongs.mockResolvedValue({
      type: "song",
      remoteFailed: false,
      total: 1,
      nextOffset: null,
      interpretation: null,
      alternatives: [],
      refine: null,
      results: [],
    });
    renderPicker({ types: ["album", "song", "artist"], type: "song", rawQuery: "holy wars" });

    await waitFor(() =>
      expect(mocks.searchSongs).toHaveBeenCalledWith("holy wars", { purpose: "pick", signal: expect.any(AbortSignal) }),
    );
  });

  it("muestra lo local sin esperar la búsqueda completa", async () => {
    mocks.getSearchSuggestions.mockResolvedValue(localPinkFloyd);
    mocks.searchArtists.mockImplementation(never);
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "pink floyd" });

    expect(await screen.findByRole("button", { name: /Pink Floyd/ })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Buscando más resultados..." })).toBeInTheDocument();
  });

  it("suma los resultados completos debajo, sin repetir ni reordenar", async () => {
    mocks.getSearchSuggestions.mockResolvedValue(localPinkFloyd);
    mocks.searchArtists.mockResolvedValue({
      ...artistResponse,
      results: [artistResult(tributeId, "Pink Floyd Tribute", null), artistResult(pinkFloydId, "Pink Floyd", "rock británico")],
    });
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "pink floyd" });

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Pink Floyd/ })).toHaveLength(2));
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      expect.stringContaining("rock británico"),
      expect.stringContaining("Pink Floyd Tribute"),
    ]);
    expect(screen.queryByRole("status", { name: "Buscando más resultados..." })).not.toBeInTheDocument();
  });

  it("completa el subtítulo de una sugerencia sin artista con el de la búsqueda completa", async () => {
    mocks.getSearchSuggestions.mockResolvedValue({
      suggestions: [{ kind: "album" as const, id: pinkFloydId, title: "Dark Side", artistName: null, year: 2012, bridge: false }],
    });
    mocks.searchAlbums.mockResolvedValue({
      type: "album",
      remoteFailed: false,
      total: 1,
      nextOffset: null,
      refine: null,
      results: [
        {
          kind: "release-group" as const,
          id: pinkFloydId,
          mbid: null,
          title: "Dark Side",
          artistName: "Kelly Clarkson",
          category: "studio" as const,
          year: 2012,
          cached: false,
        },
      ],
    });
    renderPicker({ types: ["album"], type: "album", rawQuery: "dark side" });

    expect(await screen.findByRole("button", { name: /Kelly Clarkson/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Dark Side/ })).toHaveLength(1);
  });

  it("en Canciones descarta sugerencias locales que no cubren la consulta", async () => {
    mocks.getSearchSuggestions.mockResolvedValue({
      suggestions: [
        { kind: "song" as const, id: pinkFloydId, title: "String Metallica", artistName: "Musical Artizan" },
        { kind: "song" as const, id: tributeId, title: "Metall", artistName: "CHBB" },
        { kind: "song" as const, id: "a1b2c3d4-0000-4000-8000-000000000052", title: "One", artistName: "Metallica" },
      ],
    });
    mocks.searchSongs.mockImplementation(never);
    renderPicker({ types: ["album", "song", "artist"], type: "song", rawQuery: "Metállica on" });

    expect(await screen.findByRole("button", { name: /One/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Canción/ })).toHaveLength(1);
  });

  it("con dos letras solo busca en lo local", async () => {
    mocks.getSearchSuggestions.mockResolvedValue(localPinkFloyd);
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "pi" });

    expect(await screen.findByRole("button", { name: /Pink Floyd/ })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(mocks.searchArtists).not.toHaveBeenCalled();
  });

  it("escribir aborta la búsqueda anterior y solo muestra la vigente", async () => {
    mocks.searchArtists.mockImplementation(never);
    const view = renderPicker({ types: ["artist"], type: "artist", rawQuery: "megadeth" });
    await waitFor(() => expect(mocks.searchArtists).toHaveBeenCalledTimes(1));
    const firstSignal = mocks.searchArtists.mock.calls[0]![1].signal as AbortSignal;

    mocks.searchArtists.mockResolvedValue({ ...artistResponse, results: [artistResult(tributeId, "Megadeth Rust", null)] });
    view.rerender(withIntl(picker({ types: ["artist"], type: "artist", rawQuery: "megadeth rust" })));

    expect(firstSignal.aborted).toBe(true);
    expect(await screen.findByRole("button", { name: /Megadeth Rust/ })).toBeInTheDocument();
  });

  it("cambiar de tipo aborta la búsqueda del tipo anterior", async () => {
    mocks.searchAlbums.mockImplementation(never);
    mocks.searchArtists.mockImplementation(never);
    const view = renderPicker({ types: ["album", "artist"], type: "album", rawQuery: "slayer" });
    await waitFor(() => expect(mocks.searchAlbums).toHaveBeenCalledTimes(1));
    const albumSignal = mocks.searchAlbums.mock.calls[0]![1].signal as AbortSignal;

    view.rerender(withIntl(picker({ types: ["album", "artist"], type: "artist", rawQuery: "slayer" })));

    expect(albumSignal.aborted).toBe(true);
  });

  it("si falla la búsqueda completa conserva los candidatos locales sin error", async () => {
    mocks.getSearchSuggestions.mockResolvedValue(localPinkFloyd);
    mocks.searchArtists.mockRejectedValue(new Error("502"));
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "pink floyd" });

    await waitFor(() => expect(mocks.searchArtists).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("status", { name: "Buscando más resultados..." })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Pink Floyd/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("entrega el objetivo elegido con su tipo, id, título y subtítulo", async () => {
    mocks.searchArtists.mockResolvedValue(artistResponse);
    const onPick = vi.fn();
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "pink", onPick });

    await userEvent.click(await screen.findByRole("button", { name: /Pink Floyd/ }));

    expect(onPick).toHaveBeenCalledWith({
      type: "artist",
      id: pinkFloydId,
      title: "Pink Floyd",
      subtitle: "rock británico",
    });
  });

  it("en Artistas descarta las sugerencias de álbum", async () => {
    mocks.getSearchSuggestions.mockResolvedValue({
      suggestions: [
        { kind: "album" as const, id: tributeId, title: "Pink Floyd Live", artistName: "Pink Floyd", year: 1970, bridge: true },
      ],
    });
    mocks.searchArtists.mockResolvedValue({ ...artistResponse, results: [] });
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "pink floyd" });

    expect(await screen.findByText(/Sin resultados para «pink floyd»/)).toBeInTheDocument();
  });

  it("con un único tipo permitido no muestra el conmutador de tipo", () => {
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "" });
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("sin canción permitida usa el placeholder de álbum o artista", () => {
    renderPicker({ types: ["album", "artist"], type: "album", rawQuery: "" });
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Busca un álbum o un artista");
  });

  it.each([
    [["album", "song", "artist"], "album", "Busca un álbum, artista o canción"],
    [["album"], "album", "Busca un álbum"],
    [["artist"], "artist", "Busca un artista"],
    [["song"], "song", "Busca una canción"],
  ] as const)("el placeholder refleja solo los tipos que busca (%j)", (types, type, expected) => {
    renderPicker({ types, type, rawQuery: "" });
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", expected);
  });

  it("muestra el error de búsqueda si falla sin candidatos locales", async () => {
    mocks.searchAlbums.mockRejectedValue(new Error("x"));
    renderPicker({ types: ["album"], type: "album", rawQuery: "dark" });
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo buscar");
  });

  it("muestra el estado sin resultados cuando ambas fases terminan vacías", async () => {
    mocks.searchAlbums.mockResolvedValue({ type: "album", remoteFailed: false, total: 0, nextOffset: null, refine: null, results: [] });
    renderPicker({ types: ["album"], type: "album", rawQuery: "zzzz" });
    expect(await screen.findByText(/Sin resultados para «zzzz»/)).toBeInTheDocument();
  });
});
