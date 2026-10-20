import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunityActivityPage from "./page";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listCommunityActivity: vi.fn(),
  listFeed: vi.fn(),
  listMyRecentActivity: vi.fn(),
  listFeedAuthors: vi.fn(),
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
vi.mock("@/services/feed/feed", () => ({ listFeed: mocks.listFeed, listFeedAuthors: mocks.listFeedAuthors }));
vi.mock("@/services/home/home", () => ({ listMyRecentActivity: mocks.listMyRecentActivity }));
vi.mock("@/components/activity/CommunityActivitySection", () => ({
  CommunityActivitySection: ({ headingKey }: { headingKey: string }) => (
    <div data-testid="section">{headingKey}</div>
  ),
}));
type TabProp = { key: string; label: string; initial?: unknown; empty: { title: string; action?: { href: string } } };
vi.mock("@/components/activity/ActivityTabs", () => ({
  ActivityTabs: ({ tabs }: { tabs: TabProp[] }) => (
    <div data-testid="tabs">
      <span data-testid="labels">{tabs.map((tab) => `${tab.key}:${tab.label}`).join(",")}</span>
      <span data-testid="initial">{tabs.filter((tab) => tab.initial).map((tab) => tab.key).join(",")}</span>
      <span data-testid="empties">
        {tabs.map((tab) => `${tab.key}:${tab.empty.title}>${tab.empty.action?.href ?? ""}`).join(",")}
      </span>
    </div>
  ),
}));

const entry = { kind: "rating", id: "e1" };
const page = (entries: unknown[]) => ({ entries, page: 1, pageSize: 10, hasNext: false });

async function renderPage(search: Record<string, string> = {}) {
  render(await CommunityActivityPage({ searchParams: Promise.resolve(search) }));
}

describe("/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCommunityActivity.mockResolvedValue(page([]));
    mocks.listFeed.mockResolvedValue(page([]));
    mocks.listMyRecentActivity.mockResolvedValue(page([]));
    mocks.listFeedAuthors.mockResolvedValue([]);
  });

  it("con sesión y contenido en alguna fuente, muestra las tres pestañas", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));

    await renderPage();

    expect(screen.getByTestId("labels").textContent).toBe(
      "recent:community.recentHeading,from-following:community.followingHeading,own:community.ownHeading",
    );
    expect(screen.queryByTestId("section")).not.toBeInTheDocument();
    // Sin ?tab= solo Recientes trae su página completa; de las otras basta una entrada para saber si tienen algo.
    expect(screen.getByTestId("initial").textContent).toBe("recent");
    expect(mocks.listCommunityActivity).toHaveBeenCalledWith("u1", 1, 10, { kind: undefined });
    expect(mocks.listFeed).toHaveBeenCalledWith("u1", 1, 1, { kind: undefined });
    expect(mocks.listMyRecentActivity).toHaveBeenCalledWith("u1", 1, 1);
  });

  it("?tab=you renderiza en el servidor la página completa de 'Tú'", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listMyRecentActivity.mockResolvedValue(page([entry]));

    await renderPage({ tab: "you" });

    expect(screen.getByTestId("initial").textContent).toBe("own");
    expect(mocks.listMyRecentActivity).toHaveBeenCalledWith("u1", 1, 10);
    expect(mocks.listCommunityActivity).toHaveBeenCalledWith("u1", 1, 1, { kind: undefined });
  });

  it("?kind= filtra solo la página completa de la pestaña activa", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });

    await renderPage({ tab: "following", kind: "listen" });

    expect(mocks.listFeed).toHaveBeenCalledWith("u1", 1, 10, { kind: "listen" });
    // Las otras fuentes se piden sin filtro (solo para saber si tienen algo).
    expect(mocks.listCommunityActivity).toHaveBeenCalledWith("u1", 1, 1, { kind: undefined });
    // Con un filtro activo no cae al estado vacío global aunque la página filtrada venga vacía.
    expect(screen.getByTestId("tabs")).toBeInTheDocument();
  });

  it("un ?kind= que no aplica a la pestaña se ignora", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));

    await renderPage({ kind: "listen" });

    expect(mocks.listCommunityActivity).toHaveBeenCalledWith(null, 1, 10, { kind: undefined });
  });

  it("un ?tab= desconocido cae a Recientes", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));

    await renderPage({ tab: "otra" });

    expect(screen.getByTestId("initial").textContent).toBe("recent");
  });

  it("el estado vacío de 'Siguiendo' distingue si la persona no sigue a nadie", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));

    await renderPage();
    expect(screen.getByTestId("empties").textContent).toBe(
      "recent:community.empty.recentTitle>/explore,from-following:community.empty.followingNoneTitle>/users,own:community.empty.ownTitle>/explore",
    );
  });

  it("si sigue a alguien, 'Siguiendo' vacío habla de la gente que sigue", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));
    mocks.listFeedAuthors.mockResolvedValue([{ id: "u2", username: "bea", displayName: null }]);

    await renderPage();
    expect(screen.getByTestId("empties").textContent).toContain(
      "from-following:community.empty.followingQuietTitle>/users",
    );
  });

  it("sin sesión no consulta 'de la gente que seguís' ni 'tu actividad', y muestra Recientes sin pestañas", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listCommunityActivity.mockResolvedValue(page([entry]));

    await renderPage({ tab: "you" });

    expect(mocks.listFeed).not.toHaveBeenCalled();
    expect(mocks.listFeedAuthors).not.toHaveBeenCalled();
    expect(mocks.listCommunityActivity).toHaveBeenCalledWith(null, 1, 10, { kind: undefined });
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
