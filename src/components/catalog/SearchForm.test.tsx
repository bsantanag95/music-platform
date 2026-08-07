import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function createMockArtistWithDiscography(
  overrides?: Partial<ArtistWithDiscography>,
): ArtistWithDiscography {
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

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("búsqueda válida y navegación", () => {
    it("invoca searchCatalog con el nombre normalizado y navega al artista", async () => {
      const mockSearch = vi
        .mocked(catalogApi.searchCatalog)
        .mockResolvedValue(createMockArtistWithDiscography());

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "  Pink Floyd  " } });

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
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

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      expect(
        screen.getByText(catalogEs.search.validationEmpty),
      ).toBeInTheDocument();
      expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
    });

    it("no realiza ninguna solicitud con solo espacios", async () => {
      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "   " } });

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      expect(
        screen.getByText(catalogEs.search.validationEmpty),
      ).toBeInTheDocument();
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

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByText(errorsEs.ARTIST_NOT_FOUND.title),
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: catalogEs.search.submit }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: catalogEs.search.searchAgain }),
      ).toBeInTheDocument();
    });

    it("muestra error recuperable ante INTERNAL_ERROR", async () => {
      vi.mocked(catalogApi.searchCatalog).mockRejectedValue(
        new ApiError("INTERNAL_ERROR", 500, "Error inesperado"),
      );

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByText(errorsEs.INTERNAL_ERROR.title),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: commonEs.retry }),
      ).toBeInTheDocument();
    });
  });

  describe("accesibilidad y estados de carga", () => {
    it("expone label asociado al campo", () => {
      renderWithIntl(<SearchForm />);
      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      expect(input).toBeInTheDocument();
    });

    it("deshabilita el botón y muestra mensaje neutro durante la carga", async () => {
      let resolvePromise: (value: ArtistWithDiscography) => void;
      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      expect(button).toBeDisabled();
      expect(
        screen.getByText(catalogEs.search.loading),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(catalogEs.search.loadingHint),
      ).not.toBeInTheDocument();

      resolvePromise!(createMockArtistWithDiscography());

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it("muestra el aviso de primera importación solo si la solicitud supera el umbral", async () => {
      vi.useFakeTimers();

      let resolvePromise: (value: ArtistWithDiscography) => void;
      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      expect(
        screen.queryByText(catalogEs.search.loadingHint),
      ).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(
        screen.getByText(catalogEs.search.loadingHint),
      ).toBeInTheDocument();

      resolvePromise!(createMockArtistWithDiscography());
      await act(async () => {
        await Promise.resolve();
      });

      vi.useRealTimers();
    });

    it("no muestra el aviso de primera importación si la solicitud termina antes del umbral", async () => {
      vi.useFakeTimers();

      let resolvePromise: (value: ArtistWithDiscography) => void;
      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      resolvePromise!(createMockArtistWithDiscography());
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(button).not.toBeDisabled();
      expect(
        screen.queryByText(catalogEs.search.loadingHint),
      ).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("limpia el timer al desmontar, sin warnings de act ni setState tras desmontar", async () => {
      vi.useFakeTimers();
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      let resolvePromise: (value: ArtistWithDiscography) => void;
      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      const { unmount } = renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);
      fireEvent.change(input, { target: { value: "Pink Floyd" } });

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });
      fireEvent.click(button);

      unmount();

      expect(() => {
        act(() => {
          vi.advanceTimersByTime(3000);
        });
      }).not.toThrow();

      resolvePromise!(createMockArtistWithDiscography());
      await act(async () => {
        await Promise.resolve();
      });

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
      vi.useRealTimers();
    });

    it("no permite requests duplicados mientras está pendiente", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: ArtistWithDiscography) => void;

      const pendingPromise = new Promise<ArtistWithDiscography>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(catalogApi.searchCatalog).mockReturnValue(pendingPromise);

      renderWithIntl(<SearchForm />);

      const input = screen.getByLabelText(catalogEs.search.fieldLabel);

      await user.type(input, "Pink Floyd");

      const button = screen.getByRole("button", {
        name: catalogEs.search.submit,
      });

      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(catalogApi.searchCatalog).toHaveBeenCalledTimes(1);

      resolvePromise!(createMockArtistWithDiscography());

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
