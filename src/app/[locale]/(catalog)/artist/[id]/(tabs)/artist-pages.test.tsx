import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../../../../messages/es/catalog.json";
import commonEs from "../../../../../../../messages/es/common.json";
import type { ArtistRow } from "@/db/schema";
import type { ArtistProfile } from "@/services/catalog/artist-profile-read";
import type { ArtistDiscographyView } from "@/services/catalog/artist-discography-view";

// Composición de la página de artista (openspec: redesign-artist-page): layout de pestañas
// (cabecera, pestañas, integrantes, notas), pestaña Discografía con su sección en la URL y
// pestaña Biografía.

const mocks = vi.hoisted(() => ({
  loadArtist: vi.fn(),
  loadSession: vi.fn(),
  loadCanModerate: vi.fn(),
  loadDiscography: vi.fn(),
  loadProfile: vi.fn(),
  loadCommunityStats: vi.fn(),
  loadPersonalState: vi.fn(),
  loadDiscographyMarks: vi.fn(),
  loadAlsoIn: vi.fn(),
  scheduleArtistProfileRefresh: vi.fn(),
  segment: null as string | null,
  locale: "es",
}));

vi.mock("../artist-data", () => ({
  loadArtist: mocks.loadArtist,
  loadSession: mocks.loadSession,
  loadCanModerate: mocks.loadCanModerate,
  loadDiscography: mocks.loadDiscography,
  loadProfile: mocks.loadProfile,
  loadCommunityStats: mocks.loadCommunityStats,
  loadPersonalState: mocks.loadPersonalState,
  loadDiscographyMarks: mocks.loadDiscographyMarks,
  loadAlsoIn: mocks.loadAlsoIn,
}));
vi.mock("../../artist-data", () => ({ loadArtist: mocks.loadArtist, loadProfile: mocks.loadProfile }));
vi.mock("@/services/catalog/ingest-artist", () => ({ getArtistMemberships: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/catalog/ingest-discography", () => ({ readArtistDiscography: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/catalog/artist-profile-sync", () => ({ scheduleArtistProfileRefresh: mocks.scheduleArtistProfileRefresh }));
vi.mock("@/services/social", () => ({
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "artist", id: "a", column: "artistId" }),
  listComments: vi.fn().mockResolvedValue({ comments: [], page: 1, pageSize: 20, hasNext: false }),
}));
vi.mock("@/components/social/Comments", () => ({ Comments: () => <section aria-label="notas">notas de la comunidad</section> }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useSelectedLayoutSegment: () => mocks.segment,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const messages: Record<string, unknown> = { catalog: catalogEs, common: commonEs };
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => mocks.locale),
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

const VALID_UUID = "a1b2c3d4-0000-4000-8000-000000000001";
const artistEs = catalogEs.artist;

function makeArtist(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: VALID_UUID,
    mbid: "83d91898-7763-47d7-b03b-b92132375c47",
    type: "group",
    name: "Pink Floyd",
    disambiguation: "UK rock band",
    photoUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    discographySyncedAt: new Date(),
    discographyCompleteAt: new Date(),
    membershipsSyncedAt: new Date(),
    lineupSyncedAt: null,
    country: "GB",
    beginAreaName: "London",
    endAreaName: null,
    lifeBegin: "1965",
    lifeEnd: "2014",
    lifeEnded: true,
    wikidataId: "Q2306",
    profileSyncedAt: new Date(),
    wikimediaSyncedAt: new Date(),
    photoFile: null,
    photoAuthor: null,
    photoLicense: null,
    photoLicenseUrl: null,
    photoSourceUrl: null,
    photoBlockedAt: null,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<ArtistProfile> = {}): ArtistProfile {
  return {
    facts: { country: "GB", beginAreaName: "London", lifeBegin: "1965", lifeEnd: "2014", lifeEnded: true },
    links: [],
    description: "banda de rock británica",
    summary: { text: "Pink Floyd fue una banda de rock británica.", title: "Pink Floyd", url: "https://es.wikipedia.org/wiki/Pink_Floyd", language: "es" },
    placeLabel: "Londres, Reino Unido",
    photo: null,
    ...overrides,
  };
}

function item(id: string, section: ArtistDiscographyView["sections"][number]["key"]) {
  return {
    id,
    title: `Disco ${id}`,
    year: 1973,
    coverThumbUrl: null,
    coverResolved: true,
    section,
    kinds: ["album"],
    isEp: false,
    community: { average: null, count: 0 },
    primaryArtist: null,
  };
}

const VIEW: ArtistDiscographyView = {
  sections: [
    { key: "main", items: [item("dsotm", "main")] },
    { key: "live", items: [item("pulse", "live")] },
  ],
  bestRatedId: null,
  firstMainYear: 1967,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.segment = null;
  mocks.locale = "es";
  mocks.loadArtist.mockResolvedValue(makeArtist());
  mocks.loadSession.mockResolvedValue(null);
  mocks.loadCanModerate.mockResolvedValue(false);
  mocks.loadDiscography.mockResolvedValue(VIEW);
  mocks.loadProfile.mockResolvedValue(makeProfile());
  mocks.loadCommunityStats.mockResolvedValue({
    listeners: { kind: "exact", value: 0 },
    followers: { kind: "exact", value: 0 },
    favorites: { kind: "exact", value: 0 },
    listCount: 0,
  });
  mocks.loadDiscographyMarks.mockResolvedValue(null);
  mocks.loadAlsoIn.mockResolvedValue([]);
});

async function renderLayout(children: React.ReactNode = <p>contenido de la pestaña</p>) {
  const { default: ArtistLayout } = await import("./layout");
  renderWithIntl(await ArtistLayout({ children, params: Promise.resolve({ id: VALID_UUID }) }));
}

function isBefore(a: HTMLElement, b: HTMLElement) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("layout de la página de artista", () => {
  it("zonas en orden: cabecera, pestañas, contenido, integrantes y notas al final", async () => {
    await renderLayout();
    const title = screen.getByRole("heading", { level: 1, name: "Pink Floyd" });
    const tabs = screen.getByRole("navigation", { name: artistEs.tabs.label });
    const content = screen.getByText("contenido de la pestaña");
    const notes = screen.getByText("notas de la comunidad");
    expect(isBefore(title, tabs)).toBe(true);
    expect(isBefore(tabs, content)).toBe(true);
    expect(isBefore(content, notes)).toBe(true);
    expect(screen.getByText("Banda")).toBeInTheDocument();
    expect(screen.getByText("banda de rock británica")).toBeInTheDocument();
    expect(screen.queryByText("UK rock band")).not.toBeInTheDocument();
    expect(mocks.scheduleArtistProfileRefresh).toHaveBeenCalledTimes(1);
  });

  it("Discografía es la pestaña activa por defecto; Biografía aparece con resumen", async () => {
    await renderLayout();
    expect(screen.getByRole("link", { name: artistEs.tabs.discography })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: artistEs.tabs.biography })).toHaveAttribute("href", `/artist/${VALID_UUID}/biography`);
  });

  it("sin resumen no hay pestaña Biografía", async () => {
    mocks.loadProfile.mockResolvedValue(makeProfile({ summary: null }));
    await renderLayout();
    expect(screen.queryByRole("link", { name: artistEs.tabs.biography })).not.toBeInTheDocument();
  });

  it("anónimo: el panel invita a iniciar sesión y no hay botones sueltos", async () => {
    await renderLayout();
    expect(screen.getByText(artistEs.relation.signInPrompt)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: artistEs.relation.follow })).not.toBeInTheDocument();
  });

  it("responde 404 con un id inválido o un artista inexistente", async () => {
    const { default: ArtistLayout } = await import("./layout");
    await expect(ArtistLayout({ children: null, params: Promise.resolve({ id: "no-uuid" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    mocks.loadArtist.mockResolvedValue(null);
    await expect(ArtistLayout({ children: null, params: Promise.resolve({ id: VALID_UUID }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("el título de la página es el nombre del artista", async () => {
    const { generateMetadata } = await import("./layout");
    expect(await generateMetadata({ children: null, params: Promise.resolve({ id: VALID_UUID }) })).toEqual({ title: "Pink Floyd" });
  });
});

describe("pestaña Discografía", () => {
  async function renderPage(query: Record<string, string> = {}) {
    const { default: Page } = await import("./page");
    renderWithIntl(await Page({ params: Promise.resolve({ id: VALID_UUID }), searchParams: Promise.resolve(query) }));
  }

  it("Principal activa por defecto", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: /Principal/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Disco dsotm")).toBeInTheDocument();
  });

  it("?section=live muestra En vivo", async () => {
    await renderPage({ section: "live" });
    expect(screen.getByRole("link", { name: /En vivo/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Disco pulse")).toBeInTheDocument();
  });

  it("una sección desconocida o vacía cae en la por defecto", async () => {
    await renderPage({ section: "appearances" });
    expect(screen.getByRole("link", { name: /Principal/ })).toHaveAttribute("aria-current", "page");
  });

  it("sin discos principales, la primera sección con discos es la activa", async () => {
    mocks.loadDiscography.mockResolvedValue({ ...VIEW, sections: [{ key: "singles", items: [item("s1", "singles")] }] });
    await renderPage();
    expect(screen.getByRole("link", { name: /Sencillos/ })).toHaveAttribute("aria-current", "page");
  });

  it("una persona muestra 'También en' con sus grupos", async () => {
    mocks.loadArtist.mockResolvedValue(makeArtist({ type: "person", name: "Roger Waters" }));
    mocks.loadAlsoIn.mockResolvedValue([{ id: "pf", name: "Pink Floyd", photoUrl: null, joinedOn: "1965", leftOn: "1985", mainCount: 12 }]);
    await renderPage();
    expect(screen.getByRole("heading", { name: artistEs.alsoIn.heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pink Floyd/ })).toHaveAttribute("href", "/artist/pf");
  });

  it("un grupo no consulta 'También en'", async () => {
    await renderPage();
    expect(mocks.loadAlsoIn).not.toHaveBeenCalled();
  });
});

describe("pestaña Biografía", () => {
  it("muestra la introducción con la atribución", async () => {
    const { default: Page } = await import("./biography/page");
    renderWithIntl(await Page({ params: Promise.resolve({ id: VALID_UUID }) }));
    expect(screen.getByText("Pink Floyd fue una banda de rock británica.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: artistEs.summary.source })).toBeInTheDocument();
  });

  it("sin resumen responde 404", async () => {
    mocks.loadProfile.mockResolvedValue(makeProfile({ summary: null }));
    const { default: Page } = await import("./biography/page");
    await expect(Page({ params: Promise.resolve({ id: VALID_UUID }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("el título combina la pestaña y el artista", async () => {
    const { generateMetadata } = await import("./biography/page");
    expect(await generateMetadata({ params: Promise.resolve({ id: VALID_UUID }) })).toEqual({ title: "Biografía · Pink Floyd" });
  });
});
