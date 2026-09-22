import { beforeEach, describe, expect, it, vi } from "vitest";
import CaminosPage from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  usePathname: () => "/me/caminos",
}));

const mocks = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  listMyCaminos: vi.fn(),
  listTrackedLists: vi.fn(),
}));
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: () => mocks.requirePageUser() }));
vi.mock("@/services/camino/camino", () => ({ listMyCaminos: (...a: unknown[]) => mocks.listMyCaminos(...a) }));
vi.mock("@/services/lists/saved-lists", () => ({
  listTrackedLists: (...a: unknown[]) => mocks.listTrackedLists(...a),
}));
vi.mock("@/components/camino/MyCaminosList", () => ({ MyCaminosList: () => <div data-testid="mine" /> }));
vi.mock("@/components/camino/TrackedCaminosList", () => ({
  TrackedCaminosList: () => <div data-testid="tracked" />,
}));

const user = { id: "u1" };

function run(searchParams: { tab?: string } = {}) {
  return CaminosPage({ searchParams: Promise.resolve(searchParams) });
}

describe("CaminosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUser.mockResolvedValue(user);
    mocks.listMyCaminos.mockResolvedValue([]);
    mocks.listTrackedLists.mockResolvedValue([]);
  });

  it("sin ?tab=, pide Mis Caminos y no consulta Trackeados", async () => {
    await run();
    expect(mocks.listMyCaminos).toHaveBeenCalledWith("u1");
    expect(mocks.listTrackedLists).not.toHaveBeenCalled();
  });

  it("?tab=tracked pide Trackeados y no consulta Mis Caminos", async () => {
    await run({ tab: "tracked" });
    expect(mocks.listTrackedLists).toHaveBeenCalledWith("u1");
    expect(mocks.listMyCaminos).not.toHaveBeenCalled();
  });

  it("un tab desconocido cae a Mis Caminos", async () => {
    await run({ tab: "bogus" });
    expect(mocks.listMyCaminos).toHaveBeenCalledWith("u1");
    expect(mocks.listTrackedLists).not.toHaveBeenCalled();
  });
});
