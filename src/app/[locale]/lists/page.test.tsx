import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunityListsPage from "./page";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listFeaturedLists: vi.fn(),
  listPopularLists: vi.fn(),
  listsFromFollowing: vi.fn(),
  listDiscoverLists: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/lists/discovery", () => ({ listDiscoverLists: mocks.listDiscoverLists }));
vi.mock("@/services/lists/community", () => ({
  listFeaturedLists: mocks.listFeaturedLists,
  listPopularLists: mocks.listPopularLists,
  listsFromFollowing: mocks.listsFromFollowing,
}));
vi.mock("@/components/lists/CommunityListSection", () => ({
  CommunityListSection: ({ headingKey }: { headingKey: string }) => (
    <div data-testid="section">{headingKey}</div>
  ),
}));
vi.mock("@/components/lists/CommunityListCard", () => ({
  CommunityListCard: () => <div data-testid="featured-card" />,
}));

const list = { id: "l1" };
const page = (lists: unknown[]) => ({ lists, page: 1, pageSize: 20, hasNext: false });

async function renderPage() {
  render(await CommunityListsPage());
}

describe("/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFeaturedLists.mockResolvedValue({ lists: [] });
    mocks.listPopularLists.mockResolvedValue(page([]));
    mocks.listsFromFollowing.mockResolvedValue(page([]));
    mocks.listDiscoverLists.mockResolvedValue(page([]));
  });

  it("con sesión compone las cuatro secciones que tienen contenido", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listFeaturedLists.mockResolvedValue({ lists: [list] });
    mocks.listPopularLists.mockResolvedValue(page([list]));
    mocks.listsFromFollowing.mockResolvedValue(page([list]));
    mocks.listDiscoverLists.mockResolvedValue(page([list]));

    await renderPage();

    expect(screen.getByTestId("featured-card")).toBeInTheDocument();
    const headings = screen.getAllByTestId("section").map((n) => n.textContent);
    expect(headings).toEqual([
      "community.popularHeading",
      "community.followingHeading",
      "community.recentHeading",
    ]);
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
});
