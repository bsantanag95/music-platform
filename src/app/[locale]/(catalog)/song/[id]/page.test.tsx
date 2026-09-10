import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import * as recordingService from "@/services/catalog/recording-detail";
import * as reactionService from "@/services/catalog/recording-reactions";
import * as diaryService from "@/services/diary/diary";
import { SongAlbums, SongListenHistory, SongReactionSummary } from "@/components/catalog/SongSections";
import { SongStarDisclosure } from "@/components/social/SongStarDisclosure";
import { Comments } from "@/components/social/Comments";

type PageModule = {
  default: (props: { params: Promise<{ id: string }> }) => Promise<unknown>;
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
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getFormatter: vi.fn().mockResolvedValue({ dateTime: () => "1 ene 2026" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => <div /> }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/services/social", () => ({
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "recording", id: "r1", column: "recordingId" }),
  getRatings: vi.fn().mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } }),
  listComments: vi.fn().mockResolvedValue({ comments: [], page: 1, pageSize: 20, hasNext: false }),
}));
vi.mock("@/services/catalog/recording-detail", () => ({ getRecordingDetail: vi.fn() }));
vi.mock("@/services/catalog/recording-reactions", () => ({ getRecordingReactionSummary: vi.fn() }));
vi.mock("@/services/diary/diary", () => ({ listMyListensForRecording: vi.fn() }));
vi.mock("@/services/favorites/favorites", () => ({ isFavorited: vi.fn().mockResolvedValue(false) }));

const RID = "a1b2c3d4-0000-4000-8000-000000000abc";
const RG_ID = "a1b2c3d4-0000-4000-8000-0000000000b1";
const ART_ID = "a1b2c3d4-0000-4000-8000-0000000000a1";

function detail(over: Partial<recordingService.RecordingDetail> = {}): recordingService.RecordingDetailResult {
  return {
    kind: "ok",
    detail: {
      recording: { id: RID, mbid: null, title: "Time", durationSec: 412, variantType: "original", variantOfId: null },
      credits: [],
      containingAlbums: [
        { releaseGroupId: RG_ID, title: "The Dark Side of the Moon", category: "studio", coverThumbUrl: null, firstReleaseYear: 1973 },
      ],
      appearances: [],
      primaryArtist: { id: ART_ID, name: "Pink Floyd" },
      ...over,
    },
  };
}

function typeList(node: unknown): unknown[] {
  const out: unknown[] = [];
  const walk = (n: unknown) => {
    if (n == null || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const el = n as { type?: unknown; props?: { children?: unknown } };
    if (el.type) out.push(el.type);
    walk(el.props?.children);
  };
  walk(node);
  return out;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { resolveSession } = await import("@/services/auth/sessions");
  vi.mocked(resolveSession).mockResolvedValue(null as never);
  vi.mocked(reactionService.getRecordingReactionSummary).mockResolvedValue({
    total: 0,
    byReaction: { liked: 0, loved: 0, obsessed: 0, neutral: 0, disliked: 0 },
    top: null,
  });
  vi.mocked(diaryService.listMyListensForRecording).mockResolvedValue([]);
});

describe("SongPage", () => {
  it("convierte una grabación inexistente en notFound()", async () => {
    vi.mocked(recordingService.getRecordingDetail).mockResolvedValue({ kind: "not_found" });
    await expect(
      pageModule.default({ params: Promise.resolve({ id: RID }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lidera con los álbumes contenedores y no monta rating ni reseñas como acción primaria", async () => {
    vi.mocked(recordingService.getRecordingDetail).mockResolvedValue(detail());
    const tree = await pageModule.default({ params: Promise.resolve({ id: RID }) });
    const types = typeList(tree);

    expect(types).toContain(SongAlbums);
    expect(types).toContain(Comments);
    // Las estrellas están, pero como divulgación secundaria (SongStarDisclosure),
    // no como SocialSection / DualRating de primer nivel.
    expect(types).toContain(SongStarDisclosure);
    // SongAlbums aparece antes que la divulgación de estrellas.
    expect(types.indexOf(SongAlbums)).toBeLessThan(types.indexOf(SongStarDisclosure));
  });

  it("oculta el historial y el resumen de reacción sin datos", async () => {
    vi.mocked(recordingService.getRecordingDetail).mockResolvedValue(detail());
    const tree = await pageModule.default({ params: Promise.resolve({ id: RID }) });
    const types = typeList(tree);
    // Los componentes se montan pero devuelven null; comprobamos vía props.
    const findEl = (t: unknown): { props?: Record<string, unknown> } | null => {
      let f: { props?: Record<string, unknown> } | null = null;
      const walk = (n: unknown) => {
        if (f || n == null || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(walk);
        const el = n as { type?: unknown; props?: { children?: unknown } };
        if (el.type === t) f = el as { props?: Record<string, unknown> };
        else walk(el.props?.children);
      };
      walk(tree);
      return f;
    };
    expect(types).toContain(SongListenHistory);
    expect(types).toContain(SongReactionSummary);
    expect((findEl(SongListenHistory)?.props?.entries as unknown[]).length).toBe(0);
    expect((findEl(SongReactionSummary)?.props?.summary as { total: number }).total).toBe(0);
  });
});
