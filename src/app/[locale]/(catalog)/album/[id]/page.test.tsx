import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../../../messages/es/catalog.json";
import type { AlbumDetail } from "@/services/catalog/album-detail";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock("@/services/catalog/album-detail", () => ({
  getAlbumDetail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => {
    return (key: string, params?: Record<string, string | number>) => {
      const keys = key.split(".");
      let value: unknown = catalogEs;
      for (const k of keys) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }
      if (typeof value === "string" && params) {
        return Object.entries(params).reduce(
          (str, [paramKey, paramValue]) => str.replace(`{${paramKey}}`, String(paramValue)),
          value,
        );
      }
      return typeof value === "string" ? value : key;
    };
  }),
}));

function makeDetail(overrides: Partial<AlbumDetail> = {}): AlbumDetail {
  return {
    releaseGroup: {
      id: "rg-1",
      mbid: "mbid-rg-1",
      title: "The Dark Side of the Moon",
      category: "studio",
      createdAt: new Date(),
    },
    release: {
      id: "r-1",
      mbid: "mbid-r-1",
      releaseGroupId: "rg-1",
      editionLabel: "original",
      releaseDate: "1973-03-01",
      coverThumbUrl: "https://coverartarchive.org/release/mbid-r-1/front-250",
    },
    cover: "https://coverartarchive.org/release/mbid-r-1/front-250",
    tracks: [
      {
        recordingId: "rec-1",
        discNumber: 1,
        position: 1,
        title: "Speak to Me",
        durationSec: 90,
        credits: [],
      },
      {
        recordingId: "rec-2",
        discNumber: 1,
        position: 2,
        title: "Breathe",
        durationSec: 170,
        credits: [
          { artistId: "a1", name: "Pink Floyd", role: "primary", joinPhrase: null },
          { artistId: "a2", name: "Roger Waters", role: "featured", joinPhrase: " feat. " },
        ],
      },
    ],
    ...overrides,
  };
}

describe("AlbumPage composición", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el título del álbum sin traducir", async () => {
    const { default: AlbumPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/page"
    );

    const { getAlbumDetail } = await import("@/services/catalog/album-detail");
    vi.mocked(getAlbumDetail).mockResolvedValue({
      kind: "ok",
      detail: makeDetail(),
    });

    renderWithIntl(
      await AlbumPage({ params: Promise.resolve({ id: "rg-1" }) }),
      "es",
    );

    expect(screen.getByText("The Dark Side of the Moon")).toBeInTheDocument();
  });

  it("muestra las etiquetas de interfaz en español", async () => {
    const { default: AlbumPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/page"
    );

    const { getAlbumDetail } = await import("@/services/catalog/album-detail");
    vi.mocked(getAlbumDetail).mockResolvedValue({
      kind: "ok",
      detail: makeDetail(),
    });

    renderWithIntl(
      await AlbumPage({ params: Promise.resolve({ id: "rg-1" }) }),
      "es",
    );

    expect(screen.getByRole("heading", { name: catalogEs.album.tracklistHeading })).toBeInTheDocument();
  });

  it("muestra los créditos del track como texto", async () => {
    const { default: AlbumPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/page"
    );

    const { getAlbumDetail } = await import("@/services/catalog/album-detail");
    vi.mocked(getAlbumDetail).mockResolvedValue({
      kind: "ok",
      detail: makeDetail(),
    });

    renderWithIntl(
      await AlbumPage({ params: Promise.resolve({ id: "rg-1" }) }),
      "es",
    );

    expect(screen.getByText(/Roger Waters/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Roger Waters/ })).not.toBeInTheDocument();
  });
});
