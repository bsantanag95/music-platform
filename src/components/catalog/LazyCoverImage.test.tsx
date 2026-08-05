import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyCoverImage } from "./LazyCoverImage";
import { renderWithIntl } from "@/test/i18n-test-utils";
import * as catalogApi from "@/lib/api/catalog";
import catalogEs from "../../../messages/es/catalog.json";
import type { ReleaseWithTracks } from "@/lib/api/schemas";
import type { ReactElement } from "react";

vi.mock("@/lib/api/catalog", () => ({
  getReleaseGroupDetail: vi.fn(),
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

function makeRelease(cover: string | null): ReleaseWithTracks {
  return {
    release: {
      id: "r1",
      mbid: "release-mbid",
      releaseGroupId: "g1",
      editionLabel: "original",
      releaseDate: null,
      coverThumbUrl: cover,
    },
    cover,
    tracks: [],
  };
}

describe("LazyCoverImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un skeleton accesible mientras carga", () => {
    vi.mocked(catalogApi.getReleaseGroupDetail).mockReturnValue(new Promise(() => {}));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", catalogEs.artist.coverLoading);
  });

  it("reemplaza el skeleton por la carátula disponible", async () => {
    vi.mocked(catalogApi.getReleaseGroupDetail).mockResolvedValue(makeRelease("https://coverartarchive.org/release/x/front-250"));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: catalogEs.artist.albumCoverLabel })).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("muestra el placeholder cuando no hay carátula", async () => {
    vi.mocked(catalogApi.getReleaseGroupDetail).mockResolvedValue(makeRelease(null));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: catalogEs.artist.coverPlaceholderAlt })).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("muestra el placeholder ante un fallo recuperable sin romper la tarjeta", async () => {
    vi.mocked(catalogApi.getReleaseGroupDetail).mockRejectedValue(new Error("network"));

    renderWithQuery(<LazyCoverImage releaseGroupId="g1" coverLabel={catalogEs.artist.albumCoverLabel} />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: catalogEs.artist.coverPlaceholderAlt })).toBeInTheDocument();
    });
  });
});