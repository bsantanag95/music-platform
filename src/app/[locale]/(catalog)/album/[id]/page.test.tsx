import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../../../messages/es/catalog.json";
import type { AlbumDetail } from "@/services/catalog/album-detail";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock("@/services/catalog/album-detail", () => ({
  getAlbumDetail: vi.fn(),
}));

vi.mock("@/services/auth/sessions", () => ({
  resolveSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/social", () => ({
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "release-group", id: "album", column: "releaseGroupId" }),
  getRatings: vi.fn().mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } }),
  listComments: vi.fn().mockResolvedValue({ comments: [], page: 1, pageSize: 20, hasNext: false }),
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

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeDetail(overrides: Partial<AlbumDetail> = {}): AlbumDetail {
  return {
    releaseGroup: {
      id: VALID_UUID,
      mbid: "550e8400-e29b-41d4-a716-446655440001",
      title: "The Dark Side of the Moon",
      category: "studio",
      coverThumbUrl: null,
      createdAt: new Date(),
    },
    release: {
      id: "550e8400-e29b-41d4-a716-446655440002",
      mbid: "550e8400-e29b-41d4-a716-446655440003",
      releaseGroupId: VALID_UUID,
      editionLabel: "original",
      releaseDate: "1973-03-01",
      coverThumbUrl: "https://coverartarchive.org/release-group/mbid-rg-1/front-250",
      creditsSyncedAt: new Date(),
    },
    cover: "https://coverartarchive.org/release-group/mbid-rg-1/front-250",
    tracks: [
      {
        recordingId: "550e8400-e29b-41d4-a716-446655440004",
        discNumber: 1,
        position: 1,
        title: "Speak to Me",
        durationSec: 90,
        credits: [],
      },
      {
        recordingId: "550e8400-e29b-41d4-a716-446655440005",
        discNumber: 1,
        position: 2,
        title: "Breathe",
        durationSec: 170,
        credits: [
          { artistId: "550e8400-e29b-41d4-a716-446655440006", name: "Pink Floyd", role: "primary", joinPhrase: null },
          { artistId: "550e8400-e29b-41d4-a716-446655440007", name: "Roger Waters", role: "featured", joinPhrase: " feat. " },
        ],
      },
    ],
    primaryArtist: { id: "550e8400-e29b-41d4-a716-446655440006", name: "Pink Floyd" },
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
      await AlbumPage({ params: Promise.resolve({ id: VALID_UUID }) }),
      "es",
    );

    expect(screen.getByRole("heading", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
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
      await AlbumPage({ params: Promise.resolve({ id: VALID_UUID }) }),
      "es",
    );

    expect(screen.getByRole("heading", { name: catalogEs.album.tracklistHeading })).toBeInTheDocument();
  });

  it("muestra los créditos destacados como enlaces al perfil del artista", async () => {
    const { default: AlbumPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/page"
    );

    const { getAlbumDetail } = await import("@/services/catalog/album-detail");
    vi.mocked(getAlbumDetail).mockResolvedValue({
      kind: "ok",
      detail: makeDetail(),
    });

    renderWithIntl(
      await AlbumPage({ params: Promise.resolve({ id: VALID_UUID }) }),
      "es",
    );

    const creditLink = screen.getByRole("link", { name: "Roger Waters" });
    expect(creditLink).toBeInTheDocument();
    expect(creditLink).toHaveAttribute("href", "/artist/550e8400-e29b-41d4-a716-446655440007");
  });

  it("muestra breadcrumb con artista principal cuando existe", async () => {
    const { default: AlbumPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/page"
    );

    const { getAlbumDetail } = await import("@/services/catalog/album-detail");
    vi.mocked(getAlbumDetail).mockResolvedValue({
      kind: "ok",
      detail: makeDetail(),
    });

    renderWithIntl(
      await AlbumPage({ params: Promise.resolve({ id: VALID_UUID }) }),
      "es",
    );

    expect(screen.getByRole("link", { name: "home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toHaveAttribute(
      "href",
      "/artist/550e8400-e29b-41d4-a716-446655440006",
    );
  });

  it("muestra breadcrumb parcial cuando no hay artista principal", async () => {
    const { default: AlbumPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/page"
    );

    const { getAlbumDetail } = await import("@/services/catalog/album-detail");
    vi.mocked(getAlbumDetail).mockResolvedValue({
      kind: "ok",
      detail: makeDetail({ primaryArtist: null }),
    });

    renderWithIntl(
      await AlbumPage({ params: Promise.resolve({ id: VALID_UUID }) }),
      "es",
    );

    expect(screen.getByRole("link", { name: "home" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pink Floyd" })).not.toBeInTheDocument();
  });
});
