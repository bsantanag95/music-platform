import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import * as artistService from "@/services/catalog/ingest-artist";
import * as discographyService from "@/services/catalog/ingest-discography";
import { AlbumGrid } from "@/components/catalog/AlbumGrid";
import { ArtistMemberships } from "@/components/catalog/ArtistMemberships";
import { Comments } from "@/components/social/Comments";
import { DualRating } from "@/components/social/DualRating";
import type { ArtistRow, ReleaseGroupRow } from "@/db/schema";

// Aplana el árbol y devuelve el orden de aparición de ciertos tipos de
// componente (para verificar el reordenamiento discografía-forward).
function typeOrder(node: unknown, types: unknown[]): unknown[] {
  const out: unknown[] = [];
  const walk = (n: unknown) => {
    if (n == null || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const el = n as { type?: unknown; props?: { children?: unknown } };
    if (types.includes(el.type)) out.push(el.type);
    walk(el.props?.children);
  };
  walk(node);
  return out;
}

type PageModule = {
  default: (props: { params: Promise<{ id: string }> }) => Promise<unknown>;
  generateMetadata: (props: { params: Promise<{ id: string }> }) => Promise<{ title?: string }>;
};

let pageModule: PageModule;

beforeAll(async () => {
  pageModule = (await vi.importActual("./page")) as PageModule;
});

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// getTranslations necesita el contexto de request de next-intl, que no
// existe al invocar el componente directo en un test. Se reemplaza por una
// versión que devuelve la clave pedida (el render exacto de las etiquetas
// ya está cubierto por los tests de ArtistHeader/AlbumGrid).
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/services/catalog/ingest-artist", () => ({
  getArtistById: vi.fn(),
  getArtistMemberships: vi.fn().mockResolvedValue([]),
  ensureArtistMemberships: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/catalog/ingest-discography", () => ({
  findOrIngestDiscography: vi.fn(),
}));

vi.mock("@/services/auth/sessions", () => ({
  resolveSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/social", () => ({
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "artist", id: "artist", column: "artistId" }),
  getRatings: vi.fn().mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } }),
  listComments: vi.fn().mockResolvedValue({ comments: [], page: 1, pageSize: 20, hasNext: false }),
}));

vi.mock("@/services/social/artist-following", () => ({
  isFollowingArtist: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/services/favorites/favorites", () => ({
  isFavorited: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/catalog/LazyCoverImage", () => ({
  LazyCoverImage: () => <div data-testid="mock-cover" />,
}));

function makeArtist(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    mbid: null,
    type: "group",
    name: "Pink Floyd",
    bio: null,
    photoUrl: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    discographySyncedAt: null,
    membershipsSyncedAt: null,
    ...overrides,
  };
}

function makeReleaseGroup(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "a1b2c3d4-0000-4000-8000-000000000002",
    mbid: null,
    title: "The Dark Side of the Moon",
    category: "studio",
    coverThumbUrl: null,
    firstReleaseDate: null,
    firstReleaseYear: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

// Estas pruebas ejercitan la lógica de la página (datos, notFound y
// metadatos) con servicios mockeados. El render de los componentes de
// presentación está cubierto por ArtistHeader.test.tsx y AlbumGrid.test.tsx.
describe("ArtistPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("convierte un artista inexistente en notFound()", async () => {
    vi.mocked(artistService.getArtistById).mockResolvedValue(null);

    await expect(
      pageModule.default({ params: Promise.resolve({ id: "no-existe" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(discographyService.findOrIngestDiscography).not.toHaveBeenCalled();
  });

  it("resuelve el artista stub y su discografía para un id válido", async () => {
    const stub = makeArtist({ type: "unknown" });
    const rg = makeReleaseGroup();
    vi.mocked(artistService.getArtistById).mockResolvedValue(stub);
    vi.mocked(discographyService.findOrIngestDiscography).mockResolvedValue([rg]);

    await pageModule.default({ params: Promise.resolve({ id: stub.id }) });

    expect(artistService.getArtistById).toHaveBeenCalledWith(stub.id);
    expect(discographyService.findOrIngestDiscography).toHaveBeenCalledWith(stub);
  });

  it("renderiza la discografía antes que membresías y notas, y sin rating de estrellas", async () => {
    const artist = makeArtist();
    vi.mocked(artistService.getArtistById).mockResolvedValue(artist);
    vi.mocked(discographyService.findOrIngestDiscography).mockResolvedValue([makeReleaseGroup()]);

    const tree = await pageModule.default({ params: Promise.resolve({ id: artist.id }) });
    const order = typeOrder(tree, [AlbumGrid, ArtistMemberships, Comments, DualRating]);

    expect(order.indexOf(AlbumGrid)).toBeGreaterThanOrEqual(0);
    expect(order.indexOf(AlbumGrid)).toBeLessThan(order.indexOf(ArtistMemberships));
    expect(order.indexOf(AlbumGrid)).toBeLessThan(order.indexOf(Comments));
    expect(order).not.toContain(DualRating);
  });

  it("las notas de artista usan la variante notes", async () => {
    const artist = makeArtist();
    vi.mocked(artistService.getArtistById).mockResolvedValue(artist);
    vi.mocked(discographyService.findOrIngestDiscography).mockResolvedValue([]);

    const tree = await pageModule.default({ params: Promise.resolve({ id: artist.id }) });
    let found: { props?: Record<string, unknown> } | null = null;
    const walk = (n: unknown) => {
      if (found || n == null || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach(walk);
      const el = n as { type?: unknown; props?: { children?: unknown } };
      if (el.type === Comments) found = el as { props?: Record<string, unknown> };
      else walk(el.props?.children);
    };
    walk(tree);
    expect(found).not.toBeNull();
    expect(found!.props?.variant).toBe("notes");
    expect(found!.props?.target).toBe("artist");
  });

  it("genera metadatos con el nombre del artista", async () => {
    const artist = makeArtist({ name: "Roger Waters" });
    vi.mocked(artistService.getArtistById).mockResolvedValue(artist);

    const metadata = await pageModule.generateMetadata({ params: Promise.resolve({ id: artist.id }) });
    expect(metadata.title).toBe("Roger Waters");
  });

  it("no genera metadatos si el artista no existe", async () => {
    vi.mocked(artistService.getArtistById).mockResolvedValue(null);

    const metadata = await pageModule.generateMetadata({ params: Promise.resolve({ id: "no-existe" }) });
    expect(metadata).toEqual({});
  });
});
