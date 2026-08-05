import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchForm } from "@/components/catalog/SearchForm";
import * as catalogApi from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import type { ArtistWithDiscography } from "@/lib/api/schemas";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import errorsEs from "../../../messages/es/errors.json";
import commonEs from "../../../messages/es/common.json";

const mockPush = vi.fn();

vi.mock("@/lib/api/catalog", () => ({
  searchCatalog: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

function createMockArtistWithDiscography(overrides?: Partial<ArtistWithDiscography>): ArtistWithDiscography {
  return {
    artist: {
      id: overrides?.artist?.id ?? "test-artist-id",
      mbid: overrides?.artist?.mbid ?? null,
      type: overrides?.artist?.type ?? "group",
      name: overrides?.artist?.name ?? "Test Artist",
      bio: overrides?.artist?.bio ?? null,
      photoUrl: overrides?.artist?.photoUrl ?? null,
      createdAt: overrides?.artist?.createdAt ?? new Date().toISOString(),
      discographySyncedAt: overrides?.artist?.discographySyncedAt ?? null,
    },
    releaseGroups: overrides?.releaseGroups ?? [],
  };
}

describe("SearchForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("búsqueda válida y navegación", () => {
    it("invoca searchCatalog con el nombre normalizado y navega al artista", async () => {
      const mockSearch = vi.mocked(catalogApi.searchCatalog).mockResolvedValue(
        createMockArtistWithDiscography(),
      );

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "  Pink Floyd  " } });

      const button = screen.getByRole("button", { name: catalogEs.search.submit });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith("Pink Floyd");
      });

      expect(mockPush).toHaveBeenCalledWith("/artist/test-artist-id");
    });
  });

  describe("validación de entrada", () => {
    it("no realiza ninguna solicitud con input vacío", async () => {
      renderWithIntl(<SearchForm />);

      const button = screen.getByRole("button", { name: catalogEs.search.submit });
      fireEvent.click(button);

      expect(screen.getByText(catalogEs.search.validationEmpty)).toBeInTheDocument();
      expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
    });

    it("no realiza ninguna solicitud con solo espacios", async () => {
      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "   " } });

      const button = screen.getByRole("button", { name: catalogEs.search.submit });
      fireEvent.click(button);

      expect(screen.getByText(catalogEs.search.validationEmpty)).toBeInTheDocument();
      expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
    });
  });

  describe("estados de error", () => {
    it("muestra estado vacío ante ARTIST_NOT_FOUND", async () => {
      vi.mocked(catalogApi.searchCatalog).mockRejectedValue(
        new ApiError("ARTIST_NOT_FOUND", 404, "No se encontró ningún artista"),
      );

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Artista Inexistente" } });

      const button = screen.getByRole("button", { name: catalogEs.search.submit });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(errorsEs.ARTIST_NOT_FOUND.title)).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: catalogEs.search.submit })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: catalogEs.search.searchAgain })).toBeInTheDocument();
    });

    it("muestra error recuperable ante INTERNAL_ERROR", async () => {
      vi.mocked(catalogApi.searchCatalog).mockRejectedValue(
        new ApiError("INTERNAL_ERROR", 500, "Error inesperado"),
      );

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", { name: catalogEs.search.submit });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(errorsEs.INTERNAL_ERROR.title)).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: commonEs.retry })).toBeInTheDocument();
    });
  });

  describe("accesibilidad y estados de carga", () => {
    it("expone label asociado al campo", () => {
      renderWithIntl(<SearchForm />);
      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      expect(input).toBeInTheDocument();
    });

    it("deshabilita el botón y muestra mensaje contextual durante la carga", async () => {
      let resolvePromise: (value: ArtistWithDiscography) => void;
      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", { name: catalogEs.search.submit });
      fireEvent.click(button);

      expect(button).toBeDisabled();
      expect(
        screen.getByText(catalogEs.search.loadingHint),
      ).toBeInTheDocument();

      resolvePromise!(createMockArtistWithDiscography());

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it("no permite requests duplicados mientras está pendiente", async () => {
      let resolvePromise: (value: ArtistWithDiscography) => void;
      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", { name: catalogEs.search.submit });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(catalogApi.searchCatalog).toHaveBeenCalledTimes(1);

      resolvePromise!(createMockArtistWithDiscography());
    });
  });
});
