import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  syncArtistProfileFacts: vi.fn(),
  enrichArtistFromWikimedia: vi.fn(),
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("./artist-profile", async () => ({
  ...(await vi.importActual<typeof import("./artist-profile")>("./artist-profile")),
  syncArtistProfileFacts: mocks.syncArtistProfileFacts,
}));
vi.mock("./artist-wikimedia", () => ({ enrichArtistFromWikimedia: mocks.enrichArtistFromWikimedia }));
vi.mock("@/db", () => ({ db: {} }));

const { refreshArtistProfile, scheduleArtistProfileRefresh } = await import("./artist-profile-sync");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.syncArtistProfileFacts.mockResolvedValue({ status: "synced" });
  mocks.enrichArtistFromWikimedia.mockResolvedValue({ status: "enriched" });
});

describe("refreshArtistProfile", () => {
  it("sincroniza la ficha antes que Wikimedia", async () => {
    const order: string[] = [];
    mocks.syncArtistProfileFacts.mockImplementation(async () => {
      order.push("ficha");
      return { status: "synced" };
    });
    mocks.enrichArtistFromWikimedia.mockImplementation(async () => {
      order.push("wikimedia");
      return { status: "enriched" };
    });
    expect(await refreshArtistProfile("a1")).toEqual({ facts: "synced", wikimedia: "enriched" });
    expect(order).toEqual(["ficha", "wikimedia"]);
  });

  it("un fallo de la ficha no impide Wikimedia y nada se propaga", async () => {
    mocks.syncArtistProfileFacts.mockRejectedValue(new Error("MusicBrainz caído"));
    mocks.enrichArtistFromWikimedia.mockRejectedValue(new Error("Wikimedia caído"));
    expect(await refreshArtistProfile("a1")).toEqual({ facts: "error", wikimedia: "error" });
  });
});

describe("scheduleArtistProfileRefresh", () => {
  const stale = { id: "a1", mbid: "m1", profileSyncedAt: null, lineupSyncedAt: null, wikimediaSyncedAt: null };

  it("programa la actualización si falta algo", () => {
    scheduleArtistProfileRefresh(stale);
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("no programa nada si todo está al día", () => {
    scheduleArtistProfileRefresh({ ...stale, profileSyncedAt: new Date(), lineupSyncedAt: new Date(), wikimediaSyncedAt: new Date() });
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("fuera de una request de Next se omite sin fallar", () => {
    mocks.after.mockImplementationOnce(() => {
      throw new Error("`after` was called outside a request scope");
    });
    expect(() => scheduleArtistProfileRefresh(stale)).not.toThrow();
  });
});
