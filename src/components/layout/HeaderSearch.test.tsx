import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { HeaderSearch } from "./HeaderSearch";
import * as catalogApi from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import type { ArtistSearch } from "@/lib/api/schemas";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";

const mockPush = vi.fn();

vi.mock("@/lib/api/catalog", () => ({
  searchCatalog: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function createMockArtistSearch(): ArtistSearch {
  return {
    artist: {
      id: "test-artist-id",
      mbid: null,
      type: "group",
      name: "Test Artist",
      bio: null,
      photoUrl: null,
      createdAt: new Date().toISOString(),
      discographySyncedAt: null,
      membershipsSyncedAt: null,
    },
    releaseGroups: [],
  };
}

describe("HeaderSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navega directo al artista cuando la búsqueda resuelve", async () => {
    vi.mocked(catalogApi.searchCatalog).mockResolvedValue(createMockArtistSearch());

    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.change(input, { target: { value: "  Radiohead  " } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(catalogApi.searchCatalog).toHaveBeenCalledWith("Radiohead");
    });
    expect(mockPush).toHaveBeenCalledWith("/artist/test-artist-id");
  });

  it("cae a /search?q=... cuando no encuentra el artista", async () => {
    vi.mocked(catalogApi.searchCatalog).mockRejectedValue(
      new ApiError("ARTIST_NOT_FOUND", 404, "No se encontró ningún artista"),
    );

    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.change(input, { target: { value: "Artista Inexistente" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/search?q=Artista%20Inexistente");
    });
  });

  it("cae a /search?q=... ante un error inesperado", async () => {
    vi.mocked(catalogApi.searchCatalog).mockRejectedValue(
      new ApiError("INTERNAL_ERROR", 500, "Error inesperado"),
    );

    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.change(input, { target: { value: "Pink Floyd" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/search?q=Pink%20Floyd");
    });
  });

  it("no realiza ninguna solicitud ni navegación con input vacío", () => {
    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.submit(input.closest("form")!);

    expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
