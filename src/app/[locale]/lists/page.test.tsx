import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunityListsPage from "./page";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listFeaturedLists: vi.fn(),
  listPopularLists: vi.fn(),
  listsFromFollowing: vi.fn(),
  listDiscoverLists: vi.fn(),
  discoverCaminos: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/camino/discovery", () => ({ discoverCaminos: mocks.discoverCaminos }));
vi.mock("@/components/camino/CaminoDiscoveryGrid", () => ({
  CaminoDiscoveryGrid: () => <div data-testid="to-complete-grid" />,
}));
vi.mock("@/services/lists/discovery", () => ({ listDiscoverLists: mocks.listDiscoverLists }));
vi.mock("@/services/lists/community", () => ({
  listFeaturedLists: mocks.listFeaturedLists,
  listPopularLists: mocks.listPopularLists,
  listsFromFollowing: mocks.listsFromFollowing,
}));
vi.mock("@/components/lists/CommunityListSection", () => ({
  CommunityListSection: ({ headingKey, excludeIds = [] }: { headingKey: string; excludeIds?: string[] }) => (
    <div data-testid="section" data-exclude={excludeIds.join(",")}>
      {headingKey}
    </div>
  ),
}));
vi.mock("@/components/lists/CommunityListCard", () => ({
  CommunityListCard: () => <div data-testid="featured-card" />,
}));
vi.mock("@/components/lists/CommunityListsToolbar", () => ({
  CommunityListsToolbar: () => <div data-testid="toolbar" />,
}));
vi.mock("@/components/lists/CommunityExploreGrid", () => ({
  CommunityExploreGrid: () => <div data-testid="explore-grid" />,
}));

const list = { id: "l1" };
const page = (lists: unknown[]) => ({ lists, page: 1, pageSize: 20, hasNext: false });

async function renderPage(searchParams: Record<string, string> = {}) {
  render(await CommunityListsPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFeaturedLists.mockResolvedValue({ lists: [] });
    mocks.listPopularLists.mockResolvedValue(page([]));
    mocks.listsFromFollowing.mockResolvedValue(page([]));
    mocks.listDiscoverLists.mockResolvedValue(page([]));
    mocks.discoverCaminos.mockResolvedValue({ caminos: [], page: 1, pageSize: 8, hasNext: false });
  });

  it("con sesión compone las secciones con contenido: lo de la gente que sigues antes que lo general", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listFeaturedLists.mockResolvedValue({ lists: [list] });
    mocks.listPopularLists.mockResolvedValue(page([list]));
    mocks.listsFromFollowing.mockResolvedValue(page([list]));
    mocks.listDiscoverLists.mockResolvedValue(page([list]));

    await renderPage();

    expect(screen.getByTestId("featured-card")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    const headings = screen.getAllByTestId("section").map((n) => n.textContent);
    expect(headings).toEqual([
      "community.followingHeading",
      "community.popularHeading",
      "community.recentHeading",
    ]);
  });

  it("cada sección deja fuera las listas que ya salieron más arriba", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listFeaturedLists.mockResolvedValue({ lists: [{ id: "f1" }] });
    mocks.listsFromFollowing.mockResolvedValue(page([{ id: "s1" }]));
    mocks.listPopularLists.mockResolvedValue(page([{ id: "p1" }]));
    mocks.listDiscoverLists.mockResolvedValue(page([{ id: "r1" }]));

    await renderPage();

    expect(screen.getAllByTestId("section").map((n) => n.getAttribute("data-exclude"))).toEqual(["f1", "f1,s1", "f1,s1,p1"]);
  });

  it("muestra 'Para completar' con las listas seguidas y enlaza a /caminos", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.discoverCaminos.mockResolvedValue({ caminos: [{ id: "c1" }], page: 1, pageSize: 8, hasNext: false });

    await renderPage();

    expect(mocks.discoverCaminos).toHaveBeenCalledWith({}, 1, 8);
    expect(screen.getByTestId("to-complete-grid")).toBeInTheDocument();
    expect(screen.getByText("hub.toComplete")).toBeInTheDocument();
    // Una sección con contenido evita el estado vacío global.
    expect(screen.queryByText("community.emptyTitle")).not.toBeInTheDocument();
  });

  it("sin listas con seguimiento no renderiza 'Para completar'", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listDiscoverLists.mockResolvedValue(page([list]));

    await renderPage();

    expect(screen.queryByTestId("to-complete-grid")).not.toBeInTheDocument();
  });

  it("sin sesión no consulta ni muestra 'De usuarios seguidos'", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listPopularLists.mockResolvedValue(page([list]));
    mocks.listDiscoverLists.mockResolvedValue(page([list]));

    await renderPage();

    expect(mocks.listsFromFollowing).not.toHaveBeenCalled();
    const headings = screen.getAllByTestId("section").map((n) => n.textContent);
    expect(headings).not.toContain("community.followingHeading");
  });

  it("omite las secciones vacías", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listDiscoverLists.mockResolvedValue(page([list]));

    await renderPage();

    const headings = screen.getAllByTestId("section").map((n) => n.textContent);
    expect(headings).toEqual(["community.recentHeading"]);
  });

  it("muestra el estado vacío global cuando ninguna sección tiene contenido", async () => {
    mocks.resolveSession.mockResolvedValue(null);

    await renderPage();

    expect(screen.getByText("community.emptyTitle")).toBeInTheDocument();
    expect(screen.queryByTestId("section")).not.toBeInTheDocument();
  });

  it("con filtros muestra el modo explorar y no compone las secciones", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listDiscoverLists.mockResolvedValue(page([list]));

    await renderPage({ q: "pink", type: "release-group", sort: "popular" });

    expect(screen.getByTestId("explore-grid")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.queryByTestId("section")).not.toBeInTheDocument();
    expect(mocks.listFeaturedLists).not.toHaveBeenCalled();
    expect(mocks.listPopularLists).not.toHaveBeenCalled();
    expect(mocks.listsFromFollowing).not.toHaveBeenCalled();
    expect(mocks.listDiscoverLists).toHaveBeenCalledWith("u1", 1, 20, {
      q: "pink",
      entityType: "release-group",
      sort: "popular",
    });
  });

  it("ignora valores de filtro inválidos y mantiene la vitrina", async () => {
    mocks.resolveSession.mockResolvedValue(null);

    await renderPage({ type: "album", sort: "alpha" });

    expect(screen.queryByTestId("explore-grid")).not.toBeInTheDocument();
    expect(screen.getByText("community.emptyTitle")).toBeInTheDocument();
  });
});
