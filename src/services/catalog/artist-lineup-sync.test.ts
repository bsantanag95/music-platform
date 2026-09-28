import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
const mocks = vi.hoisted(() => ({
  lineupSyncOrder: vi.fn(),
  syncArtistProfileFacts: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => state.rows }) }) },
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("./artist-lineup", () => ({ lineupSyncOrder: mocks.lineupSyncOrder }));
vi.mock("./artist-profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./artist-profile")>()),
  syncArtistProfileFacts: mocks.syncArtistProfileFacts,
}));

const { lineupMembersToSync, syncLineupMembers, scheduleLineupMembersSync, LINEUP_MEMBERS_PER_VISIT } = await import(
  "./artist-lineup-sync"
);

const FRESH = new Date();
const row = (id: string, extra: Partial<{ mbid: string | null; profileSyncedAt: Date | null; lineupSyncedAt: Date | null }> = {}) => ({
  id,
  mbid: extra.mbid === undefined ? `mb-${id}` : extra.mbid,
  profileSyncedAt: extra.profileSyncedAt === undefined ? null : extra.profileSyncedAt,
  lineupSyncedAt: extra.lineupSyncedAt === undefined ? null : extra.lineupSyncedAt,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  mocks.syncArtistProfileFacts.mockResolvedValue({ status: "synced" });
});

describe("lineupMembersToSync", () => {
  it("respeta el orden de prioridad, omite a los al día y a los sin MBID, y aplica el tope", async () => {
    const order = Array.from({ length: 14 }, (_, i) => `p${i}`);
    mocks.lineupSyncOrder.mockResolvedValue(order);
    state.rows = order.map((id) =>
      id === "p0" ? row(id, { profileSyncedAt: FRESH, lineupSyncedAt: FRESH }) : id === "p1" ? row(id, { mbid: null }) : row(id),
    );

    const due = await lineupMembersToSync("crue");
    expect(due).toHaveLength(LINEUP_MEMBERS_PER_VISIT);
    expect(due[0]).toBe("p2");
    expect(due).not.toContain("p0");
    expect(due).not.toContain("p1");
  });

  it("con la ficha al día pero la alineación sin períodos, la persona está pendiente", async () => {
    mocks.lineupSyncOrder.mockResolvedValue(["p0"]);
    state.rows = [row("p0", { profileSyncedAt: FRESH, lineupSyncedAt: null })];
    expect(await lineupMembersToSync("crue")).toEqual(["p0"]);
  });
});

describe("syncLineupMembers", () => {
  it("sincroniza en serie y un fallo no detiene a los demás", async () => {
    mocks.lineupSyncOrder.mockResolvedValue(["a", "b", "c"]);
    state.rows = [row("a"), row("b"), row("c")];
    mocks.syncArtistProfileFacts.mockResolvedValueOnce({ status: "synced" }).mockRejectedValueOnce(new Error("MusicBrainz caído"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await syncLineupMembers("crue")).toEqual({ status: "synced", synced: 2, failed: 1 });
    expect(mocks.syncArtistProfileFacts.mock.calls.map((call) => call[0])).toEqual(["a", "b", "c"]);
    errors.mockRestore();
  });

  it("una segunda corrida del mismo artista en la instancia se omite", async () => {
    let release!: () => void;
    mocks.lineupSyncOrder.mockReturnValueOnce(new Promise((resolve) => (release = () => resolve(["a"]))));
    state.rows = [row("a")];

    const first = syncLineupMembers("crue");
    expect(await syncLineupMembers("crue")).toEqual({ status: "running", synced: 0, failed: 0 });
    release();
    expect((await first).synced).toBe(1);
    // Terminada la primera, una nueva corrida vuelve a ejecutarse.
    mocks.lineupSyncOrder.mockResolvedValue([]);
    expect((await syncLineupMembers("crue")).status).toBe("synced");
  });
});

describe("scheduleLineupMembersSync", () => {
  it("programa la corrida después de responder", () => {
    scheduleLineupMembersSync("crue");
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("fuera de una request de Next se omite sin fallar", () => {
    mocks.after.mockImplementationOnce(() => {
      throw new Error("`after` was called outside a request scope");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => scheduleLineupMembersSync("crue")).not.toThrow();
    warn.mockRestore();
  });
});
