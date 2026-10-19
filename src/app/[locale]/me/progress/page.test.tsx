import { beforeEach, describe, expect, it, vi } from "vitest";
import ProgressPage from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={String(href)}>{children}</a>,
  usePathname: () => "/me/progress",
}));

const mocks = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  listMyArtistJourneys: vi.fn(),
  listMyCaminos: vi.fn(),
  listTrackedLists: vi.fn(),
}));
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: () => mocks.requirePageUser() }));
vi.mock("@/services/artist-journeys/artist-journeys", () => ({
  listMyArtistJourneys: (...a: unknown[]) => mocks.listMyArtistJourneys(...a),
}));
vi.mock("@/services/camino/camino", () => ({ listMyCaminos: (...a: unknown[]) => mocks.listMyCaminos(...a) }));
vi.mock("@/services/lists/saved-lists", () => ({
  listTrackedLists: (...a: unknown[]) => mocks.listTrackedLists(...a),
}));
vi.mock("@/components/artist-journey/ArtistJourneyList", () => ({
  ArtistJourneyList: () => <div data-testid="discographies" />,
}));
vi.mock("@/components/camino/MyCaminosList", () => ({ MyCaminosList: () => <div data-testid="lists" /> }));
vi.mock("@/components/camino/TrackedCaminosList", () => ({
  TrackedCaminosList: () => <div data-testid="following" />,
}));

const user = { id: "u1" };

function run(searchParams: { tab?: string } = {}) {
  return ProgressPage({ searchParams: Promise.resolve(searchParams) });
}

describe("ProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUser.mockResolvedValue(user);
    mocks.listMyArtistJourneys.mockResolvedValue([]);
    mocks.listMyCaminos.mockResolvedValue([]);
    mocks.listTrackedLists.mockResolvedValue([]);
  });

  it("sin ?tab=, carga solo Discografías", async () => {
    await run();
    expect(mocks.listMyArtistJourneys).toHaveBeenCalledWith("u1");
    expect(mocks.listMyCaminos).not.toHaveBeenCalled();
    expect(mocks.listTrackedLists).not.toHaveBeenCalled();
  });

  it("un tab desconocido cae a Discografías", async () => {
    await run({ tab: "bogus" });
    expect(mocks.listMyArtistJourneys).toHaveBeenCalledWith("u1");
    expect(mocks.listMyCaminos).not.toHaveBeenCalled();
  });

  it("?tab=lists carga solo los Caminos propios", async () => {
    await run({ tab: "lists" });
    expect(mocks.listMyCaminos).toHaveBeenCalledWith("u1");
    expect(mocks.listMyArtistJourneys).not.toHaveBeenCalled();
    expect(mocks.listTrackedLists).not.toHaveBeenCalled();
  });

  it("?tab=following carga solo las listas seguidas", async () => {
    await run({ tab: "following" });
    expect(mocks.listTrackedLists).toHaveBeenCalledWith("u1");
    expect(mocks.listMyArtistJourneys).not.toHaveBeenCalled();
    expect(mocks.listMyCaminos).not.toHaveBeenCalled();
  });
});
