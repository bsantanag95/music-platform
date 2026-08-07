import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
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

  it("muestra el placeholder ante un fallo recuperable sin romper la tarjeta", async () => {
    vi.mocked(catalogApi.getReleaseGroupCover).mockRejectedValue(new Error("network"));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: catalogEs.artist.coverPlaceholderAlt })).toBeInTheDocument();
    });
  });
});