import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunityActivityPage from "./page";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listCommunityActivity: vi.fn(),
  listFeed: vi.fn(),
  listMyRecentActivity: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/activity/community-activity", () => ({
  listCommunityActivity: mocks.listCommunityActivity,
}));
vi.mock("@/services/feed/feed", () => ({ listFeed: mocks.listFeed }));
vi.mock("@/services/home/home", () => ({ listMyRecentActivity: mocks.listMyRecentActivity }));
vi.mock("@/components/activity/CommunityActivitySection", () => ({
  CommunityActivitySection: ({ headingKey }: { headingKey: string }) => (
    <div data-testid="section">{headingKey}</div>
  ),
}));
vi.mock("@/components/activity/ActivityTabs", () => ({
  ActivityTabs: ({ tabs }: { tabs: { key: string; label: string }[] }) => (
    <div data-testid="tabs">{tabs.map((tab) => `${tab.key}:${tab.label}`).join(",")}</div>
  ),
}));

const entry = { kind: "rating", id: "e1" };
const page = (entries: unknown[]) => ({ entries, page: 1, pageSize: 10, hasNext: false });

async function renderPage() {
  render(await CommunityActivityPage());
}

describe("/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCommunityActivity.mockResolvedValue(page([]));
    mocks.listFeed.mockResolvedValue(page([]));
    mocks.listMyRecentActivity.mockResolvedValue(page([]));
  });

  it("con sesión y contenido en alguna fuente, muestra las tres pestañas", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));

    await renderPage();

    expect(screen.getByTestId("tabs").textContent).toBe(
      "recent:community.recentHeading,from-following:community.followingHeading,own:community.ownHeading",
    );
    expect(screen.queryByTestId("section")).not.toBeInTheDocument();
    expect(mocks.listFeed).toHaveBeenCalledWith("u1", 1, 10);
    expect(mocks.listMyRecentActivity).toHaveBeenCalledWith("u1", 1, 10);
  });

  it("sin sesión no consulta 'de la gente que seguís' ni 'tu actividad', y muestra Recientes sin pestañas", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));

    await renderPage();

    expect(mocks.listFeed).not.toHaveBeenCalled();
    expect(mocks.listMyRecentActivity).not.toHaveBeenCalled();
    expect(screen.queryByTestId("tabs")).not.toBeInTheDocument();
    expect(screen.getByTestId("section")).toHaveTextContent("community.recentHeading");
  });

  it("muestra el estado vacío global cuando ninguna fuente tiene contenido, sin sesión", async () => {
    mocks.resolveSession.mockResolvedValue(null);

    await renderPage();

    expect(screen.getByText("community.emptyTitle")).toBeInTheDocument();
    expect(screen.queryByTestId("section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tabs")).not.toBeInTheDocument();
  });

  it("muestra el estado vacío global cuando ninguna fuente tiene contenido, con sesión", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });

    await renderPage();

    expect(screen.getByText("community.emptyTitle")).toBeInTheDocument();
    expect(screen.queryByTestId("tabs")).not.toBeInTheDocument();
  });
});
