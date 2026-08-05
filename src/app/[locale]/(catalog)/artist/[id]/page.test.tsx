import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import * as artistService from "@/services/catalog/ingest-artist";
import * as discographyService from "@/services/catalog/ingest-discography";
import type { ArtistRow, ReleaseGroupRow } from "@/db/schema";

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
}));

vi.mock("@/services/catalog/ingest-discography", () => ({
  findOrIngestDiscography: vi.fn(),
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
    ...overrides,
  };
}

function makeReleaseGroup(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "a1b2c3d4-0000-4000-8000-000000000002",
    mbid: null,
    title: "The Dark Side of the Moon",
    category: "studio",
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
