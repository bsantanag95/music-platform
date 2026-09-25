import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../../../../messages/es/catalog.json";
import commonEs from "../../../../../../../messages/es/common.json";
import type { AlbumDetail } from "@/services/catalog/album-detail";

// Composición de la página de álbum (openspec: redesign-album-page): layout de pestañas
// (cabecera, pestañas, discografía, comentarios) y pestañas Canciones y Reseñas.

const mocks = vi.hoisted(() => ({
  loadAlbumDetail: vi.fn(),
  loadSession: vi.fn(),
  loadCanModerate: vi.fn(),
  loadCommunityStats: vi.fn(),
  loadCommunityFavorites: vi.fn(),
  loadDiscographyStrip: vi.fn(),
  loadPersonalState: vi.fn(),
  loadAlbumEditions: vi.fn(),
  loadAlbumPersonnel: vi.fn(),
  listReviews: vi.fn(),
  getReviewDetail: vi.fn(),
  segment: null as string | null,
}));

vi.mock("../album-data", () => ({
  loadAlbumDetail: mocks.loadAlbumDetail,
  loadSession: mocks.loadSession,
  loadCanModerate: mocks.loadCanModerate,
  loadCommunityStats: mocks.loadCommunityStats,
  loadCommunityFavorites: mocks.loadCommunityFavorites,
  loadDiscographyStrip: mocks.loadDiscographyStrip,
  loadPersonalState: mocks.loadPersonalState,
  loadAlbumEditions: mocks.loadAlbumEditions,
  loadAlbumPersonnel: mocks.loadAlbumPersonnel,
}));
vi.mock("@/lib/api/catalog", () => ({ getEditionExtraTracks: vi.fn() }));
vi.mock("@/services/social", () => ({
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "release-group", id: "rg", column: "releaseGroupId" }),
  getRatings: vi.fn().mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } }),
  listComments: vi.fn().mockResolvedValue({ comments: [], page: 1, pageSize: 20, hasNext: false }),
}));
vi.mock("@/services/reviews", () => ({
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "release-group", id: "rg", column: "releaseGroupId" }),
  listReviews: mocks.listReviews,
  getReviewDetail: mocks.getReviewDetail,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useSelectedLayoutSegment: () => mocks.segment,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const messages: Record<string, unknown> = { catalog: catalogEs, common: commonEs };
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    return (key: string, params?: Record<string, string | number>) => {
      let value: unknown = messages;
      for (const part of `${namespace}.${key}`.split(".")) {
        value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
      }
      if (typeof value !== "string") return key;
      return Object.entries(params ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), value);
    };
  }),
}));

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ARTIST_ID = "550e8400-e29b-41d4-a716-446655440006";

function makeDetail(overrides: Partial<AlbumDetail> = {}): AlbumDetail {
  return {
    releaseGroup: {
      id: VALID_UUID,
      mbid: "550e8400-e29b-41d4-a716-446655440001",
      title: "The Dark Side of the Moon",
      category: "studio",
      coverThumbUrl: null,
      coverStorageKey: null,
      coverCheckedAt: null,
      coverBlockedAt: null,
      editionsSyncedAt: null,
      coverResolved: false,
      firstReleaseDate: "1973-03-24",
      firstReleaseYear: 1973,
      createdAt: new Date(),
    },
    release: {
      id: "550e8400-e29b-41d4-a716-446655440002",
      mbid: "550e8400-e29b-41d4-a716-446655440003",
      releaseGroupId: VALID_UUID,
      editionLabel: "standard",
      releaseDate: "1973-03-01",
      coverThumbUrl: null,
      creditsSyncedAt: new Date(),
      isRepresentative: true,
      personnelSyncedAt: null,
    },
    cover: null,
    tracks: [
      {
        recordingId: "550e8400-e29b-41d4-a716-446655440004",
        discNumber: 1,
        position: 1,
        title: "Speak to Me",
        durationSec: 90,
        credits: [],
        variantType: "original",
        variantOf: null,
      },
      {
        recordingId: "550e8400-e29b-41d4-a716-446655440005",
        discNumber: 1,
        position: 2,
        title: "Breathe",
        durationSec: 170,
        credits: [
          { artistId: ARTIST_ID, name: "Pink Floyd", role: "primary", joinPhrase: null },
          { artistId: "550e8400-e29b-41d4-a716-446655440007", name: "Roger Waters", role: "featured", joinPhrase: null },
        ],
        variantType: "original",
        variantOf: null,
      },
    ],
    primaryArtist: { id: ARTIST_ID, name: "Pink Floyd" },
    primaryArtists: [{ id: ARTIST_ID, name: "Pink Floyd", joinPhrase: null }],
    ...overrides,
  };
}

const NO_EDITIONS = { editions: [], representativeMbid: null, representativeTrackCount: 0, variants: [] };

function makeEdition(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    mbid: `${id}-mbid`,
    title: "The Dark Side of the Moon",
    disambiguation: null,
    status: "Official",
    releaseDate: null,
    releaseYear: 1973,
    country: "GB",
    packaging: null,
    formats: ["CD"],
    mediumCount: 1,
    trackCount: 2,
    labels: [{ name: "Harvest", catalogNumber: "SHVL 804" }],
    ...overrides,
  };
}

const PERSONNEL = {
  members: [{ artistId: "m1", name: "Integrante", creditedAs: null, level: "members", roles: [{ relationType: "instrument", attributes: ["guitar"] }], tracks: "all" }],
  guests: [],
  production: [],
  other: [],
};

const stats = {
  ratings: { count: 0, averageStars: null, averageDetailedScore: null, histogram: null },
  reviewCount: 17,
  collectors: { kind: "exact", value: 0 },
  seekers: { kind: "exact", value: 0 },
  listCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.segment = null;
  mocks.loadAlbumDetail.mockResolvedValue({ kind: "ok", detail: makeDetail() });
  mocks.loadSession.mockResolvedValue(null);
  mocks.loadCommunityStats.mockResolvedValue(stats);
  mocks.loadCommunityFavorites.mockResolvedValue(new Set());
  mocks.loadDiscographyStrip.mockResolvedValue(null);
  mocks.loadAlbumEditions.mockResolvedValue(NO_EDITIONS);
  mocks.loadAlbumPersonnel.mockResolvedValue(null);
});

async function renderLayout(children: React.ReactNode = <p>contenido</p>) {
  const { default: AlbumLayout } = await import("./layout");
  renderWithIntl(
    await AlbumLayout({ children, modal: null, params: Promise.resolve({ id: VALID_UUID }) }),
  );
}

describe("layout de la página de álbum", () => {
  it("muestra el título sin traducir, el tipo de obra y el breadcrumb con artista", async () => {
    await renderLayout();
    expect(screen.getByRole("heading", { level: 1, name: "The Dark Side of the Moon" })).toBeInTheDocument();
    expect(screen.getByText(catalogEs.album.workType.studio)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Pink Floyd" })[0]).toHaveAttribute("href", `/artist/${ARTIST_ID}`);
  });

  it("muestra el breadcrumb sin artista cuando no hay artista principal", async () => {
    mocks.loadAlbumDetail.mockResolvedValue({
      kind: "ok",
      detail: makeDetail({ primaryArtist: null, primaryArtists: [] }),
    });
    await renderLayout();
    expect(screen.queryByRole("link", { name: "Pink Floyd" })).not.toBeInTheDocument();
    expect(mocks.loadDiscographyStrip).not.toHaveBeenCalled();
  });

  it("muestra pestañas Canciones y Reseñas con contador, activa Canciones por defecto y oculta las que no tienen datos", async () => {
    await renderLayout();
    const songs = screen.getByRole("link", { name: catalogEs.album.tabs.songs });
    expect(songs).toHaveAttribute("href", `/album/${VALID_UUID}`);
    expect(screen.getByRole("link", { name: "Reseñas (17)" })).toHaveAttribute("href", `/album/${VALID_UUID}/reviews`);
    expect(screen.queryByRole("link", { name: catalogEs.album.tabs.credits })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: catalogEs.album.tabs.editions })).not.toBeInTheDocument();
  });

  it("renderiza el contenido de la pestaña y los comentarios fuera de ella", async () => {
    await renderLayout(<p>contenido de la pestaña</p>);
    expect(screen.getByText("contenido de la pestaña")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: catalogEs.social.commentsHeading })).toBeInTheDocument();
  });

  it("a un visitante anónimo le muestra el panel para iniciar sesión", async () => {
    await renderLayout();
    expect(screen.getByText(catalogEs.album.relation.signInPrompt)).toBeInTheDocument();
    expect(mocks.loadPersonalState).not.toHaveBeenCalled();
  });

  it("responde 404 para un id inválido o inexistente", async () => {
    const { default: AlbumLayout } = await import("./layout");
    await expect(
      AlbumLayout({ children: null, modal: null, params: Promise.resolve({ id: "no-uuid" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    mocks.loadAlbumDetail.mockResolvedValue({ kind: "not_found" });
    await expect(
      AlbumLayout({ children: null, modal: null, params: Promise.resolve({ id: VALID_UUID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("muestra el estado vacío cuando el álbum no tiene ediciones", async () => {
    mocks.loadAlbumDetail.mockResolvedValue({ kind: "no_editions" });
    await renderLayout();
    expect(screen.getByText(catalogEs.album.noEditionsTitle)).toBeInTheDocument();
  });
});

describe("pestaña Canciones", () => {
  it("muestra la lista con créditos destacados enlazados", async () => {
    const { default: AlbumSongsPage } = await import("./page");
    renderWithIntl(await AlbumSongsPage({ params: Promise.resolve({ id: VALID_UUID }) }));
    expect(screen.getByRole("heading", { name: catalogEs.album.tracks.heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roger Waters" })).toHaveAttribute(
      "href",
      "/artist/550e8400-e29b-41d4-a716-446655440007",
    );
  });
});

describe("pestaña Reseñas", () => {
  it("lista las reseñas en el orden pedido y ofrece el editor", async () => {
    mocks.listReviews.mockResolvedValue({ reviews: [], page: 1, pageSize: 20, hasNext: false });
    const { default: AlbumReviewsPage } = await import("./reviews/page");
    renderWithIntl(
      await AlbumReviewsPage({
        params: Promise.resolve({ id: VALID_UUID }),
        searchParams: Promise.resolve({ sort: "best" }),
      }),
    );
    expect(mocks.listReviews).toHaveBeenCalledWith(expect.anything(), 1, 20, "best");
    expect(screen.getByText(catalogEs.album.reviews.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: catalogEs.social.loginToReview })).toBeInTheDocument();
  });

  it("ignora un orden desconocido", async () => {
    mocks.listReviews.mockResolvedValue({ reviews: [], page: 1, pageSize: 20, hasNext: false });
    const { default: AlbumReviewsPage } = await import("./reviews/page");
    await AlbumReviewsPage({
      params: Promise.resolve({ id: VALID_UUID }),
      searchParams: Promise.resolve({ sort: "cualquiera" }),
    });
    expect(mocks.listReviews).toHaveBeenCalledWith(expect.anything(), 1, 20, "recent");
  });
});

describe("pestañas con datos de ediciones y créditos", () => {
  it("muestra Créditos y Ediciones cuando hay datos, y el sello de la edición mostrada", async () => {
    mocks.loadAlbumEditions.mockResolvedValue({
      editions: [makeEdition("e1", { mbid: "rep" }), makeEdition("e2")],
      representativeMbid: "rep",
      representativeTrackCount: 2,
      variants: [],
    });
    mocks.loadAlbumPersonnel.mockResolvedValue(PERSONNEL);
    await renderLayout();
    expect(screen.getByRole("link", { name: catalogEs.album.tabs.credits })).toHaveAttribute("href", `/album/${VALID_UUID}/credits`);
    expect(screen.getByRole("link", { name: catalogEs.album.tabs.editions })).toHaveAttribute("href", `/album/${VALID_UUID}/editions`);
    expect(screen.getAllByText("Harvest").length).toBeGreaterThan(0);
  });

  it("la pestaña Créditos muestra los niveles y responde 404 sin créditos", async () => {
    const { default: AlbumCreditsPage } = await import("./credits/page");
    mocks.loadAlbumPersonnel.mockResolvedValue(PERSONNEL);
    renderWithIntl(await AlbumCreditsPage({ params: Promise.resolve({ id: VALID_UUID }) }));
    expect(screen.getByText(catalogEs.album.credits.levels.members)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Integrante" })).toHaveAttribute("href", "/artist/m1");

    mocks.loadAlbumPersonnel.mockResolvedValue(null);
    await expect(AlbumCreditsPage({ params: Promise.resolve({ id: VALID_UUID }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("la pestaña Ediciones lista las ediciones y responde 404 con una sola", async () => {
    const { default: AlbumEditionsPage } = await import("./editions/page");
    mocks.loadAlbumEditions.mockResolvedValue({
      editions: [makeEdition("e1", { mbid: "rep" }), makeEdition("e2", { country: "US" })],
      representativeMbid: "rep",
      representativeTrackCount: 2,
      variants: [],
    });
    renderWithIntl(await AlbumEditionsPage({ params: Promise.resolve({ id: VALID_UUID }) }));
    expect(screen.getByRole("heading", { name: catalogEs.album.editions.heading })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);

    mocks.loadAlbumEditions.mockResolvedValue({ ...NO_EDITIONS, editions: [makeEdition("e1")] });
    await expect(AlbumEditionsPage({ params: Promise.resolve({ id: VALID_UUID }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
