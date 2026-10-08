import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { TargetPicker } from "./TargetPicker";
import type { PickerType } from "./types";

const mocks = vi.hoisted(() => ({ searchAlbums: vi.fn(), searchSongs: vi.fn(), searchArtists: vi.fn() }));
vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => null }));

const artistResponse = {
  type: "artist" as const,
  remoteFailed: false,
  total: 1,
  nextOffset: null,
  refine: null,
  results: [
    {
      kind: "artist" as const,
      id: "a1b2c3d4-0000-4000-8000-000000000050",
      mbid: null,
      name: "Pink Floyd",
      type: "group",
      disambiguation: "rock británico",
      country: null,
      cached: true,
    },
  ],
};

function renderPicker(props: { types: readonly PickerType[]; type: PickerType; rawQuery: string; onPick?: () => void }) {
  return renderWithIntl(
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
    />,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("TargetPicker", () => {
  it("busca solo el tipo activo, con el texto recibido", async () => {
    mocks.searchArtists.mockResolvedValue(artistResponse);
    renderPicker({ types: ["album", "song", "artist"], type: "artist", rawQuery: "pink" });

    await waitFor(() => expect(mocks.searchArtists).toHaveBeenCalledWith("pink"));
    expect(mocks.searchAlbums).not.toHaveBeenCalled();
    expect(mocks.searchSongs).not.toHaveBeenCalled();
  });

  it("entrega el objetivo elegido con su tipo, id, título y subtítulo", async () => {
    mocks.searchArtists.mockResolvedValue(artistResponse);
    const onPick = vi.fn();
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "pink", onPick });

    await userEvent.click(await screen.findByRole("button", { name: /Pink Floyd/ }));

    expect(onPick).toHaveBeenCalledWith({
      type: "artist",
      id: "a1b2c3d4-0000-4000-8000-000000000050",
      title: "Pink Floyd",
      subtitle: "rock británico",
    });
  });

  it("con un único tipo permitido no muestra el conmutador de tipo", () => {
    renderPicker({ types: ["artist"], type: "artist", rawQuery: "" });
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("sin canción permitida usa el placeholder de álbum o artista", () => {
    renderPicker({ types: ["album", "artist"], type: "album", rawQuery: "" });
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Busca un álbum o un artista");
  });

  it("muestra el error de búsqueda", async () => {
    mocks.searchAlbums.mockRejectedValue(new Error("x"));
    renderPicker({ types: ["album"], type: "album", rawQuery: "dark" });
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo buscar");
  });

  it("muestra el estado sin resultados", async () => {
    mocks.searchAlbums.mockResolvedValue({ ...artistResponse, type: "album", results: [] });
    renderPicker({ types: ["album"], type: "album", rawQuery: "zzzz" });
    expect(await screen.findByText(/Sin resultados para «zzzz»/)).toBeInTheDocument();
  });
});
