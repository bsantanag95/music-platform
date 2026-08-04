import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchForm } from "@/components/catalog/SearchForm";
import * as catalogApi from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import type { ArtistWithDiscography } from "@/lib/api/schemas";

const mockPush = vi.fn();

vi.mock("@/lib/api/catalog", () => ({
  searchCatalog: vi.fn(),
}));

vi.mock("next/navigation", () => ({
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

      render(<SearchForm />);

      const input = screen.getByLabelText("Buscar artista");
      fireEvent.change(input, { target: { value: "  Pink Floyd  " } });

      const button = screen.getByRole("button", { name: "Buscar" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith("Pink Floyd");
      });

      expect(mockPush).toHaveBeenCalledWith("/artista/test-artist-id");
    });
  });

  describe("validación de entrada", () => {
    it("no realiza ninguna solicitud con input vacío", async () => {
      render(<SearchForm />);

      const button = screen.getByRole("button", { name: "Buscar" });
      fireEvent.click(button);

      expect(screen.getByText("Ingresá un nombre para buscar.")).toBeInTheDocument();
      expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
    });

    it("no realiza ninguna solicitud con solo espacios", async () => {
      render(<SearchForm />);

      const input = screen.getByLabelText("Buscar artista");
      fireEvent.change(input, { target: { value: "   " } });

      const button = screen.getByRole("button", { name: "Buscar" });
      fireEvent.click(button);

      expect(screen.getByText("Ingresá un nombre para buscar.")).toBeInTheDocument();
      expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
    });
  });

  describe("estados de error", () => {
    it("muestra estado vacío ante ARTIST_NOT_FOUND", async () => {
      vi.mocked(catalogApi.searchCatalog).mockRejectedValue(
        new ApiError("ARTIST_NOT_FOUND", 404, "No se encontró ningún artista"),
      );

      render(<SearchForm />);

      const input = screen.getByLabelText("Buscar artista");
      fireEvent.change(input, { target: { value: "Artista Inexistente" } });

      const button = screen.getByRole("button", { name: "Buscar" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("No se encontró el artista")).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: "Buscar" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Buscar otro artista" })).toBeInTheDocument();
    });

    it("muestra error recuperable ante INTERNAL_ERROR", async () => {
      vi.mocked(catalogApi.searchCatalog).mockRejectedValue(
        new ApiError("INTERNAL_ERROR", 500, "Error inesperado"),
      );

      render(<SearchForm />);

      const input = screen.getByLabelText("Buscar artista");
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", { name: "Buscar" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Error inesperado")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    });
  });

  describe("accesibilidad y estados de carga", () => {
    it("expone label asociado al campo", () => {
      render(<SearchForm />);
      const input = screen.getByLabelText("Buscar artista");
      expect(input).toBeInTheDocument();
    });

    it("deshabilita el botón y muestra mensaje contextual durante la carga", async () => {
      let resolvePromise: (value: ArtistWithDiscography) => void;
      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      render(<SearchForm />);

      const input = screen.getByLabelText("Buscar artista");
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", { name: "Buscar" });
      fireEvent.click(button);

      expect(button).toBeDisabled();
      expect(
        screen.getByText("Estamos importando este artista por primera vez. Puede tardar unos segundos..."),
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

      render(<SearchForm />);

      const input = screen.getByLabelText("Buscar artista");
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", { name: "Buscar" });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(catalogApi.searchCatalog).toHaveBeenCalledTimes(1);

      resolvePromise!(createMockArtistWithDiscography());
    });
  });
});
