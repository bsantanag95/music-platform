import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyCoverImage } from "./LazyCoverImage";
import { renderWithIntl } from "@/test/i18n-test-utils";
import * as catalogApi from "@/lib/api/catalog";
import catalogEs from "../../../messages/es/catalog.json";
import type { Cover } from "@/lib/api/schemas";
import type { ReactElement } from "react";

vi.mock("@/lib/api/catalog", () => ({
  getReleaseGroupCover: vi.fn(),
}));

// next/image depende del loader del servidor; en jsdom se reemplaza por un
// <img> simple para poder inspeccionar el src y el alt.
vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} onError={() => props.onError?.()} />
  ),
}));

function renderWithQuery(ui: ReactElement, locale: "es" | "en" = "es") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithIntl(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    locale,
  );
}

function makeCover(cover: string | null): Cover {
  return { cover };
}

describe("LazyCoverImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un skeleton accesible mientras carga", () => {
    vi.mocked(catalogApi.getReleaseGroupCover).mockReturnValue(new Promise(() => {}));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", catalogEs.artist.coverLoading);
  });

  it("reemplaza el skeleton por la carátula disponible", async () => {
    vi.mocked(catalogApi.getReleaseGroupCover).mockResolvedValue(makeCover("https://coverartarchive.org/release-group/x/front-250"));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: catalogEs.artist.albumCoverLabel })).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("muestra el placeholder cuando no hay carátula", async () => {
    vi.mocked(catalogApi.getReleaseGroupCover).mockResolvedValue(makeCover(null));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: catalogEs.artist.coverPlaceholderAlt })).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("muestra el placeholder ante un fallo de consulta sin romper la tarjeta", async () => {
    vi.mocked(catalogApi.getReleaseGroupCover).mockRejectedValue(new Error("network"));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderWithIntl(
      <QueryClientProvider client={queryClient}>
        <LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />
      </QueryClientProvider>,
      "es",
    );

    // Esperar a que TanStack Query procese el error y muestre el placeholder
    await waitFor(() => {
      const placeholders = screen.queryAllByRole("img");
      expect(placeholders.some(p => p.getAttribute("aria-label") === catalogEs.artist.coverFailed)).toBe(true);
    }, { timeout: 3000 });
  });

  it("muestra el placeholder tras agotar reintentos de imagen", async () => {
    vi.mocked(catalogApi.getReleaseGroupCover).mockResolvedValue(
      makeCover("https://coverartarchive.org/release-group/x/front-250"),
    );

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    // Esperar a que la imagen se cargue
    await waitFor(() => {
      expect(screen.queryAllByRole("img").length).toBeGreaterThan(0);
    });

    // Simular 3 errores de imagen (MAX_IMAGE_RETRIES es 2, así que el tercer error activa el fallback)
    for (let i = 0; i < 3; i++) {
      const imgs = screen.queryAllByRole("img");
      if (imgs.length === 0) break;
      const img = imgs[0];
      if (img) fireEvent.error(img);
    }

    // Verificar que después de agotar reintentos se muestra el placeholder
    await waitFor(() => {
      const placeholders = screen.queryAllByRole("img");
      const hasFailedPlaceholder = placeholders.some(p => 
        p.getAttribute("aria-label") === catalogEs.artist.coverFailed
      );
      expect(hasFailedPlaceholder).toBe(true);
    });
  });
});