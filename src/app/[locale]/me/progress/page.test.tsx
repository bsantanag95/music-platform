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
  countProgressTabs: vi.fn(),
}));
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: () => mocks.requirePageUser() }));
vi.mock("@/services/artist-journeys/artist-journeys", () => ({
  listMyArtistJourneys: (...a: unknown[]) => mocks.listMyArtistJourneys(...a),
}));
vi.mock("@/services/camino/camino", () => ({ listMyCaminos: (...a: unknown[]) => mocks.listMyCaminos(...a) }));
vi.mock("@/services/progress/progress-counts", () => ({
  countProgressTabs: (...a: unknown[]) => mocks.countProgressTabs(...a),
}));
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

// Busca en el árbol devuelto por la página el listado que recibe `initialFilters`.
function findInitialFilters(node: unknown): unknown {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findInitialFilters(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return undefined;
  if ("initialFilters" in props) return props.initialFilters;
  return findInitialFilters(props.children);
}

function run(searchParams: Record<string, string> = {}) {
  return ProgressPage({ searchParams: Promise.resolve(searchParams) });
}

describe("ProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUser.mockResolvedValue(user);
    mocks.listMyArtistJourneys.mockResolvedValue([]);
    mocks.listMyCaminos.mockResolvedValue([]);
    mocks.listTrackedLists.mockResolvedValue([]);
    mocks.countProgressTabs.mockResolvedValue({ discographies: 3, lists: 2, following: 1 });
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

  // openspec: refine-progress-page-phase1
  it("pasa al listado los filtros válidos de la URL", async () => {
    const page = await run({ q: "deep", sort: "alpha", state: "bogus" });
    expect(findInitialFilters(page)).toEqual({ q: "deep", sort: "alpha" });
  });

  it("en Listas que sigo ignora el estado", async () => {
    const page = await run({ tab: "following", sort: "progress", state: "archived" });
    expect(findInitialFilters(page)).toEqual({ sort: "progress" });
  });

  // openspec: redesign-progress-toolbar
  it("pasa a la sección los totales de las tres pestañas", async () => {
    const page = await run({ tab: "lists" });
    const section = (page as { props: { children: { props: Record<string, unknown> } } }).props.children;
    expect(section.props.initialTotals).toEqual({ discographies: 3, lists: 2, following: 1 });
    expect(section.props.activeTab).toBe("lists");
    expect(mocks.countProgressTabs).toHaveBeenCalledWith("u1");
  });
});
