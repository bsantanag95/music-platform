import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { RegisterListenDialog } from "./RegisterListenDialog";
import { ApiError } from "@/lib/api/client";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  createListenEntry: vi.fn(),
}));

vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
}));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => null }));
vi.mock("./ListenEntryForm", () => ({
  ListenEntryForm: ({ entryId }: { entryId: string }) => (
    <div data-testid="expand-form">{entryId}</div>
  ),
}));

const albumId = "a1b2c3d4-0000-4000-8000-000000000010";

// El diálogo no usa react-query (el Header vive fuera de `<Providers>`), así que
// no hace falta un `QueryClientProvider`.
function render(ui: ReactElement) {
  return renderWithIntl(ui);
}

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

describe("RegisterListenDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca, elige un álbum, crea la escucha y ofrece ampliarla", async () => {
    mocks.searchAlbums.mockResolvedValue(searchResponse);
    mocks.createListenEntry.mockResolvedValue(createdEntry);
    render(<RegisterListenDialog onClose={() => {}} />);

    await userEvent.type(screen.getByRole("searchbox"), "dark side");
    await waitFor(() => expect(mocks.searchAlbums).toHaveBeenCalledWith("dark side"), {
      timeout: 1500,
    });
    // Álbum es el tipo por defecto: un solo tipo por búsqueda.
    expect(mocks.searchSongs).not.toHaveBeenCalled();
    expect(mocks.searchArtists).not.toHaveBeenCalled();

    const option = await screen.findByRole("button", { name: /The Dark Side of the Moon/ });
    await userEvent.click(option);

    expect(mocks.createListenEntry).toHaveBeenCalledWith({
      type: "release-group",
      id: albumId,
    });
    expect(await screen.findByTestId("expand-form")).toHaveTextContent(createdEntry.id);
  });

  it("con el tipo Canción registra la canción resuelta (la única con grabación)", async () => {
    mocks.searchSongs.mockResolvedValue(songResponse);
    mocks.createListenEntry.mockResolvedValue({ ...createdEntry, target: { ...createdEntry.target, type: "recording", id: recordingId } });
    render(<RegisterListenDialog onClose={() => {}} />);

    await userEvent.click(screen.getByRole("radio", { name: "Canción" }));
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
    render(<RegisterListenDialog onClose={() => {}} />);

    await userEvent.type(screen.getByRole("searchbox"), "dark side");
    const option = await screen.findByRole("button", { name: /The Dark Side of the Moon/ });
    await userEvent.click(option);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Iniciar sesión/ })).toHaveAttribute(
        "href",
        "/auth/login",
      ),
    );
  });

  it("Escape cierra el modal", async () => {
    mocks.searchAlbums.mockResolvedValue({ ...searchResponse, results: [] });
    const onClose = vi.fn();
    render(<RegisterListenDialog onClose={onClose} />);

    // El listener se ata tras montar el portal.
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
