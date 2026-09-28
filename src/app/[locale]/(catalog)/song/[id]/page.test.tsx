import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../../../messages/es/catalog.json";
import commonEs from "../../../../../../messages/es/common.json";
import type { RecordingDetail } from "@/services/catalog/recording-detail";
import type { RecordingCredits } from "@/services/catalog/personnel-levels";
import type { RecordingVersions } from "@/services/catalog/recording-versions";

// Composición de la página de canción (openspec: redesign-song-page): cabecera, panel, tira
// de pistas, composición y créditos, discos, versiones y comentarios.

const mocks = vi.hoisted(() => ({
  loadRecordingDetail: vi.fn(),
  loadSession: vi.fn(),
  loadCanModerate: vi.fn(),
  loadPrincipalRelease: vi.fn(),
  loadTrackStrip: vi.fn(),
  loadRecordingCredits: vi.fn(),
  loadVersions: vi.fn(),
  loadVersionLine: vi.fn(),
  loadSongCommunity: vi.fn(),
  loadSongPersonalState: vi.fn(),
  scheduleSongCreditsSync: vi.fn(),
}));

vi.mock("./song-data", () => ({
  loadRecordingDetail: mocks.loadRecordingDetail,
  loadSession: mocks.loadSession,
  loadCanModerate: mocks.loadCanModerate,
  loadPrincipalRelease: mocks.loadPrincipalRelease,
  loadTrackStrip: mocks.loadTrackStrip,
  loadRecordingCredits: mocks.loadRecordingCredits,
  loadVersions: mocks.loadVersions,
  loadVersionLine: mocks.loadVersionLine,
  loadSongCommunity: mocks.loadSongCommunity,
  loadSongPersonalState: mocks.loadSongPersonalState,
}));
vi.mock("@/services/catalog/recording-detail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/catalog/recording-detail")>()),
  scheduleSongCreditsSync: mocks.scheduleSongCreditsSync,
}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/social", () => ({
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "recording", id: "r", column: "recordingId" }),
  getRatings: vi.fn().mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } }),
  listComments: vi.fn().mockResolvedValue({ comments: [], page: 1, pageSize: 20, hasNext: false }),
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => <span /> }));
vi.mock("@/components/album/AlbumListPicker", () => ({ AlbumListPicker: () => <div /> }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    title,
    "aria-label": label,
  }: {
    href: string;
    children: React.ReactNode;
    title?: string;
    "aria-label"?: string;
  }) => (
    <a href={href} title={title} aria-label={label}>
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
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const messages: Record<string, unknown> = { catalog: catalogEs, common: commonEs };
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => (key: string, params?: Record<string, string | number>) => {
    let value: unknown = messages;
    for (const part of `${namespace}.${key}`.split(".")) {
      value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
    }
    if (typeof value !== "string") return key;
    return Object.entries(params ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), value);
  }),
}));

const RID = "a1b2c3d4-0000-4000-8000-000000000abc";
const UYI = "a1b2c3d4-0000-4000-8000-0000000000b1";
const GNR = "a1b2c3d4-0000-4000-8000-0000000000a1";

const disc = (releaseGroupId: string, title: string, category: string, year: number) => ({
  releaseGroupId,
  title,
  category,
  coverThumbUrl: null,
  firstReleaseDate: null,
  firstReleaseYear: year,
});

function makeDetail(overrides: Partial<RecordingDetail> = {}): RecordingDetail {
  const principal = disc(UYI, "Use Your Illusion I", "studio", 1991);
  return {
    recording: { id: RID, mbid: null, title: "November Rain", durationSec: 537 },
    credits: [{ artistId: GNR, name: "Guns N' Roses", role: "primary", joinPhrase: null }],
    containingAlbums: [
      principal,
      disc("s1", "November Rain", "single_ep", 1992),
      disc("s2", "Yesterdays", "single_ep", 1992),
      disc("c1", "Use Your Illusion", "compilation", 1998),
      disc("c2", "Greatest Hits", "compilation", 2004),
      disc("c3", "Best Ballads", "compilation", 2005),
      disc("c4", "Roses N' Guns", "compilation", 2010),
    ],
    appearances: [],
    primaryArtist: { id: GNR, name: "Guns N' Roses" },
    versionAttributes: [],
    principalDisc: principal,
    ...overrides,
  };
}

const EMPTY_GROUPS = { songwriting: [], production: [], performers: [], sound: [], other: [] };

const CREDITS: RecordingCredits = {
  groups: {
    ...EMPTY_GROUPS,
    songwriting: [{ artistId: "axl", name: "Axl Rose", creditedAs: null, roles: [{ relationType: "writer", attributes: [] }] }],
    performers: [
      { artistId: "guest", name: "Invitada", creditedAs: null, roles: [{ relationType: "vocal", attributes: [] }] },
      { artistId: "slash", name: "Slash", creditedAs: null, roles: [{ relationType: "instrument", attributes: ["guitar"] }] },
    ],
  },
  memberIds: ["slash"],
  hasAlbumWideCredits: true,
};

const VERSIONS: RecordingVersions = {
  covers: [
    {
      recordingId: "cover-1",
      title: "November Rain",
      durationSec: 287,
      artist: { id: "rockabye", name: "Rockabye Baby!" },
      attributes: ["cover", "instrumental"],
      disc: { releaseGroupId: "lull", title: "Lullaby Renditions", year: 2009 },
      earliestKey: "2009",
    },
  ],
  live: [
    {
      recordingId: "live-1",
      title: "November Rain",
      durationSec: 750,
      artist: { id: GNR, name: "Guns N' Roses" },
      attributes: ["live"],
      disc: { releaseGroupId: "era", title: "Live Era '87–'93", year: 1999 },
      earliestKey: "1999",
    },
  ],
  others: [],
};

const STATS = {
  ratings: { count: 128, averageStars: 4.3 },
  reactions: { count: 60, top: "obsessed" },
  favorites: { kind: "exact", value: 41 },
  listCount: 23,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadRecordingDetail.mockResolvedValue({ kind: "ok", detail: makeDetail() });
  mocks.loadSession.mockResolvedValue(null);
  mocks.loadPrincipalRelease.mockResolvedValue({ id: "rel-uyi", releaseGroupId: UYI });
  mocks.loadTrackStrip.mockResolvedValue({
    current: { recordingId: RID, discNumber: 1, position: 10, title: "November Rain" },
    index: 10,
    total: 16,
    multiDisc: false,
    previous: { recordingId: "prev", discNumber: 1, position: 9, title: "Double Talkin' Jive" },
    next: { recordingId: "next", discNumber: 1, position: 11, title: "The Garden" },
  });
  mocks.loadRecordingCredits.mockResolvedValue(CREDITS);
  mocks.loadVersions.mockResolvedValue(VERSIONS);
  mocks.loadVersionLine.mockResolvedValue(null);
  mocks.loadSongCommunity.mockResolvedValue(STATS);
});

type SongPageComponent = (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;
let SongPage: SongPageComponent;

// La primera importación del módulo es lenta con la suite completa en paralelo.
beforeAll(async () => {
  SongPage = (await import("./page")).default as SongPageComponent;
}, 30_000);

async function renderPage() {
  renderWithIntl(await SongPage({ params: Promise.resolve({ id: RID }) }));
}

const song = catalogEs.song;

describe("página de canción", () => {
  it("convierte una grabación inexistente en notFound()", async () => {
    mocks.loadRecordingDetail.mockResolvedValue({ kind: "not_found" });
    await expect(SongPage({ params: Promise.resolve({ id: RID }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("cabecera: antetítulo con la pista del disco principal, ficha técnica y comunidad", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "November Rain" })).toBeInTheDocument();
    // El antetítulo ya no repite el disco: lo nombran las migas y la tira.
    // La posición vive solo en la tira; el antetítulo es "Canción".
    expect(screen.getByText(song.kicker)).toBeInTheDocument();
    expect(screen.queryByText(/Pista 10/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Use Your Illusion I" })).toHaveAttribute("href", `/album/${UYI}`);
    expect(screen.getByText("8:57")).toBeInTheDocument();
    expect(screen.getByText(song.writtenBy)).toBeInTheDocument();
    expect(screen.getByText(song.firstAppearance)).toBeInTheDocument();
    expect(screen.getByText(song.community.reaction)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aparece en 23 listas/ })).toHaveAttribute("href", expect.stringContaining(RID));
    expect(mocks.scheduleSongCreditsSync).toHaveBeenCalledWith({ id: "rel-uyi", releaseGroupId: UYI });
  });

  it("comunidad con poca actividad: una línea con las cantidades en lugar de tarjetas vacías", async () => {
    mocks.loadSongCommunity.mockResolvedValue({
      ratings: { count: 1, averageStars: null },
      reactions: { count: 0, top: null },
      favorites: { kind: "exact", value: 0 },
      listCount: 0,
    });
    await renderPage();
    expect(screen.getByText("Todavía hay poca actividad de la comunidad · 1 valoración")).toBeInTheDocument();
    expect(screen.queryByText(song.community.reaction)).not.toBeInTheDocument();
  });

  it("primera aparición en un disco distinto del principal: dice su tipo", async () => {
    const single = disc("single", "Manchild", "single_ep", 1985);
    mocks.loadRecordingDetail.mockResolvedValue({
      kind: "ok",
      detail: makeDetail({ containingAlbums: [single, ...makeDetail().containingAlbums] }),
    });
    await renderPage();
    const facts = screen.getByText(song.firstAppearance).nextElementSibling;
    expect(facts).toHaveTextContent("Manchild (single/EP) · 1985");
  });

  it("migas con artista y disco principal", async () => {
    await renderPage();
    const crumbs = screen.getByRole("navigation", { name: /migas|breadcrumb/i });
    expect(within(crumbs).getByRole("link", { name: "Guns N' Roses" })).toHaveAttribute("href", `/artist/${GNR}`);
    expect(within(crumbs).getByRole("link", { name: "Use Your Illusion I" })).toHaveAttribute("href", `/album/${UYI}`);
  });

  it("tira de pistas con la anterior y la siguiente", async () => {
    await renderPage();
    const strip = screen.getByRole("navigation", { name: song.strip.label });
    expect(within(strip).getByText("· 10 de 16")).toBeInTheDocument();
    expect(within(strip).getByText("← Anterior")).toBeInTheDocument();
    expect(within(strip).getByText("Siguiente →")).toBeInTheDocument();
    expect(within(strip).getByRole("link", { name: "Pista anterior: 9. Double Talkin' Jive" })).toHaveAttribute("href", "/song/prev");
    expect(within(strip).getByRole("link", { name: "Pista siguiente: 11. The Garden" })).toHaveAttribute("href", "/song/next");
  });

  it("en la primera pista la tira dice 'Inicio del disco' en lugar de un hueco", async () => {
    mocks.loadTrackStrip.mockResolvedValue({
      current: { recordingId: RID, discNumber: 1, position: 1, title: "November Rain" },
      index: 1,
      total: 16,
      multiDisc: false,
      previous: null,
      next: { recordingId: "next", discNumber: 1, position: 2, title: "Tears" },
    });
    await renderPage();
    const strip = screen.getByRole("navigation", { name: song.strip.label });
    expect(within(strip).getByText(song.strip.discStart)).toBeInTheDocument();
    // El número va separado del título: "2 ·" y "Tears", no "2 Tears".
    const next = within(strip).getByRole("link", { name: "Pista siguiente: 2. Tears" });
    expect(within(next).getByText("2 ·")).toBeInTheDocument();
    expect(within(next).getByText("Tears")).toBeInTheDocument();
  });

  it("sin tira cuando la grabación no está en la lista del disco principal", async () => {
    mocks.loadTrackStrip.mockResolvedValue(null);
    await renderPage();
    expect(screen.queryByRole("navigation", { name: song.strip.label })).not.toBeInTheDocument();
    expect(screen.getByText(song.kicker)).toBeInTheDocument();
  });

  it("un solo autor: la ficha lo nombra y no hay bloque Composición", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Axl Rose" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: song.composition })).not.toBeInTheDocument();
  });

  it("autores con roles distintos: la ficha solo con nombres y el bloque Composición con roles", async () => {
    mocks.loadRecordingCredits.mockResolvedValue({
      ...CREDITS,
      groups: {
        ...CREDITS.groups,
        songwriting: [
          { artistId: "c", name: "Compositora", creditedAs: null, roles: [{ relationType: "composer", attributes: [] }] },
          { artistId: "l", name: "Letrista", creditedAs: null, roles: [{ relationType: "lyricist", attributes: [] }] },
        ],
      },
    });
    await renderPage();
    const composition = screen.getByRole("region", { name: song.composition });
    expect(composition).toHaveTextContent("Compositora (música), Letrista (letra)");
    const facts = screen.getByText(song.writtenBy).nextElementSibling;
    expect(facts).toHaveTextContent("Compositora, Letrista");
    expect(facts).not.toHaveTextContent("(música)");
  });

  it("créditos de la grabación, con integrantes primero y enlace a los créditos del disco", async () => {
    await renderPage();
    const credits = screen.getByRole("region", { name: song.recordingCredits });
    const names = within(credits)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names.indexOf("Slash")).toBeLessThan(names.indexOf("Invitada"));
    expect(within(credits).getByRole("link", { name: /Créditos de todo el disco/ })).toHaveAttribute("href", `/album/${UYI}/credits`);
  });

  it("créditos por fila: integrantes separados, '+N' con muchos roles y asistentes contraídos", async () => {
    const role = (relationType: string, attributes: string[] = []) => ({ relationType, attributes });
    mocks.loadRecordingCredits.mockResolvedValue({
      ...CREDITS,
      groups: {
        ...CREDITS.groups,
        performers: [
          {
            artistId: "jack",
            name: "Jack Antonoff",
            creditedAs: null,
            roles: ["guitar", "banjo", "bass guitar", "drums (drum set)", "electric guitar", "sitar"].map((a) =>
              role("instrument", [a]),
            ),
          },
          { artistId: "slash", name: "Slash", creditedAs: null, roles: [role("instrument", ["guitar"])] },
        ],
        sound: [
          { artistId: "laura", name: "Laura Sisk", creditedAs: null, roles: [role("recording")] },
          { artistId: "serban", name: "Serban Ghenea", creditedAs: null, roles: [role("mix")] },
          { artistId: "joey", name: "Joey Miller", creditedAs: null, roles: [role("engineer", ["assistant"])] },
        ],
      },
    });
    await renderPage();
    const credits = screen.getByRole("region", { name: song.recordingCredits });
    expect(within(credits).getByText("+2")).toBeInTheDocument();
    const sound = within(credits).getByRole("region", { name: catalogEs.album.credits.groups.sound });
    const names = within(sound).getAllByRole("link").map((link) => link.textContent);
    expect(names.slice(0, 2)).toEqual(["Serban Ghenea", "Laura Sisk"]);
    expect(within(sound).getByText("+1 asistente")).toBeInTheDocument();
    // Desplegados, los asistentes se ocultan con otro texto (lo alterna el CSS del <details>).
    expect(within(sound).getByText(song.hideAssistants)).toBeInTheDocument();
  });

  it("los roles desplegados se vuelven a contraer con 'ocultar'", async () => {
    const role = (a: string) => ({ relationType: "instrument", attributes: [a] });
    mocks.loadRecordingCredits.mockResolvedValue({
      ...CREDITS,
      groups: {
        ...CREDITS.groups,
        performers: [
          {
            artistId: "jack",
            name: "Jack Antonoff",
            creditedAs: null,
            roles: ["guitar", "banjo", "bass guitar", "drums (drum set)", "electric guitar", "sitar"].map(role),
          },
        ],
      },
    });
    await renderPage();
    const credits = screen.getByRole("region", { name: song.recordingCredits });
    const more = within(credits).getByRole("button", { name: /Ver 2 roles más/ });
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    const hide = within(credits).getByRole("button", { name: song.fewerRoles });
    expect(hide).toHaveAttribute("aria-expanded", "true");
    expect(within(credits).queryByText("+2")).not.toBeInTheDocument();
    fireEvent.click(hide);
    expect(within(credits).getByText("+2")).toBeInTheDocument();
  });

  it("discos por tipo, con la marca original y el '+N' en recopilaciones", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: song.appearances.heading });
    expect(within(section).getByText(song.appearances.groups.studio, { exact: false })).toBeInTheDocument();
    expect(within(section).getByText(song.appearances.original)).toBeInTheDocument();
    // Un solo disco en el grupo: sin "· 1".
    expect(within(section).getByText(song.appearances.groups.studio).textContent).toBe(song.appearances.groups.studio);
    const more = within(section).getByRole("button", { name: "+1 más" });
    fireEvent.click(more);
    expect(within(section).getByRole("link", { name: /Roses N' Guns/ })).toBeInTheDocument();
  });

  it("apariciones: mes y año cuando la fecha lo tiene y la fecha completa del primer lanzamiento", async () => {
    const detail = makeDetail();
    detail.containingAlbums = detail.containingAlbums.map((album, i) =>
      i === 0 ? { ...album, firstReleaseDate: "1991-09-17" } : album,
    );
    mocks.loadRecordingDetail.mockResolvedValue({ kind: "ok", detail });
    await renderPage();
    const section = screen.getByRole("region", { name: song.appearances.heading });
    expect(within(section).getByText(/sept?.? 1991/)).toBeInTheDocument();
    expect(within(section).getByText(song.appearances.original)).toHaveAttribute(
      "title",
      "Primer lanzamiento: 17 de septiembre de 1991",
    );
  });

  it("otras versiones: una pestaña por grupo y un grupo a la vista", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: song.versions.heading });
    const tabs = within(section).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      `${song.versions.groups.covers} · 1`,
      `${song.versions.groups.live} · 1`,
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    // Otros artistas: año, artista, disco y la versión con sus atributos extra.
    expect(within(section).getByRole("link", { name: "Rockabye Baby!" })).toHaveAttribute("href", "/artist/rockabye");
    expect(within(section).getByRole("link", { name: "Lullaby Renditions" })).toHaveAttribute("href", "/album/lull");
    expect(within(section).getByRole("link", { name: song.versions.openVersion })).toHaveAttribute("href", "/song/cover-1");
    expect(within(section).getByText(catalogEs.versionAttributes.instrumental)).toBeInTheDocument();
    fireEvent.click(tabs[1]!);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(within(section).queryByRole("link", { name: "Rockabye Baby!" })).not.toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "Live Era '87–'93" })).toHaveAttribute("href", "/album/era");
  });

  it("otras versiones propias: una fila por disco con sus grabaciones como variantes", async () => {
    const take = (recordingId: string, title: string) => ({ ...VERSIONS.live[0]!, recordingId, attributes: [], title });
    mocks.loadVersions.mockResolvedValue({
      covers: [],
      live: [],
      others: [
        take("take-1", "November Rain (take 1)"),
        take("take-2", "November Rain (take 2)"),
        take("plain-a", "November Rain"),
        take("plain-b", "November Rain"),
        { ...take("loose", "November Rain"), disc: null },
      ],
    });
    await renderPage();
    const section = screen.getByRole("region", { name: song.versions.heading });
    expect(within(section).queryByRole("tab")).not.toBeInTheDocument();
    expect(within(section).getByRole("heading", { name: song.versions.groups.others })).toBeInTheDocument();
    // El disco aparece una vez; las grabaciones son sus variantes.
    expect(within(section).getAllByRole("link", { name: "Live Era '87–'93" })).toHaveLength(1);
    expect(within(section).getByRole("link", { name: "take 1" })).toHaveAttribute("href", "/song/take-1");
    expect(within(section).getByRole("link", { name: "take 2" })).toHaveAttribute("href", "/song/take-2");
    expect(within(section).getByRole("link", { name: "Grabación 1" })).toHaveAttribute("href", "/song/plain-a");
    expect(within(section).getByRole("link", { name: "Grabación 2" })).toHaveAttribute("href", "/song/plain-b");
    // Sin disco: su propia fila.
    expect(within(section).getByText(song.versions.noDisc)).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: song.versions.openVersion })).toHaveAttribute("href", "/song/loose");
  });

  it("otras versiones: más de 10 discos muestran '+N más'", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...VERSIONS.live[0]!,
      recordingId: `live-${i}`,
      disc: { releaseGroupId: `disc-${i}`, title: `Disco ${i}`, year: 2000 + i },
    }));
    mocks.loadVersions.mockResolvedValue({ covers: [], live: many, others: [] });
    await renderPage();
    const section = screen.getByRole("region", { name: song.versions.heading });
    expect(within(section).queryByRole("link", { name: "Disco 11" })).not.toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button", { name: "+2 más" }));
    expect(within(section).getByRole("link", { name: "Disco 11" })).toBeInTheDocument();
  });

  it("una versión en vivo muestra la línea de versión con enlace a la original", async () => {
    mocks.loadRecordingDetail.mockResolvedValue({ kind: "ok", detail: makeDetail({ versionAttributes: ["live"] }) });
    mocks.loadVersionLine.mockResolvedValue({
      kind: "live",
      original: { recordingId: "studio", title: "November Rain", artistName: "Guns N' Roses" },
    });
    await renderPage();
    expect(screen.getByText(song.version)).toBeInTheDocument();
    // La versión en vivo desplegada en "Otras versiones" también se llama igual.
    const links = screen.getAllByRole("link", { name: "November Rain" }).map((link) => link.getAttribute("href"));
    expect(links).toContain("/song/studio");
  });

  it("sin créditos ni versiones no muestra esos bloques y los comentarios siguen", async () => {
    mocks.loadRecordingCredits.mockResolvedValue({ groups: EMPTY_GROUPS, memberIds: [], hasAlbumWideCredits: false });
    mocks.loadVersions.mockResolvedValue(null);
    await renderPage();
    expect(screen.queryByRole("region", { name: song.composition })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: song.recordingCredits })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: song.versions.heading })).not.toBeInTheDocument();
    expect(screen.queryByText(song.writtenBy)).not.toBeInTheDocument();
  });

  it("anónimo: el panel invita a iniciar sesión y no hay reseñas", async () => {
    await renderPage();
    expect(screen.getByText(song.relation.signInPrompt)).toBeInTheDocument();
    expect(screen.queryByText(catalogEs.album.relation.writeReview)).not.toBeInTheDocument();
  });

  it("con sesión: el panel recibe el estado personal", async () => {
    mocks.loadSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.loadCanModerate.mockResolvedValue(false);
    mocks.loadSongPersonalState.mockResolvedValue({
      favorited: true,
      listens: { count: 2, lastAt: "2026-09-12T15:00:00.000Z", lastReaction: null },
      ownListMemberships: [],
    });
    await renderPage();
    expect(screen.getByRole("button", { name: song.relation.favorite })).toHaveAttribute("aria-pressed", "true");
    expect(mocks.loadSongPersonalState).toHaveBeenCalledWith("u1", RID);
  });
});
