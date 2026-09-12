import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CommunityActivitySection } from "./CommunityActivitySection";

vi.mock("@/lib/api/diary", () => ({
  getFeed: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
  getCommunityActivity: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
}));
vi.mock("@/lib/api/home", () => ({
  getRecentActivity: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
}));

const feedActivityListMock = vi.fn<(props: unknown) => ReactElement>(() => (
  <div data-testid="feed-activity-list" />
));
vi.mock("@/components/feed/FeedActivityList", () => ({
  FeedActivityList: (props: unknown) => feedActivityListMock(props),
}));
vi.mock("@/components/feed/CompactActivityRow", () => ({
  CompactActivityRow: () => <li data-testid="compact-row" />,
}));

const entry = {
  kind: "rating" as const,
  id: "e1",
  stars: "4.5",
  detailedScore: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "release-group" as const, id: "a1", title: "Album", coverThumbUrl: null },
  author: { id: "u1", username: "ana", displayName: "Ana" },
};

function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("CommunityActivitySection", () => {
  it("'De la gente que seguís' pasa clamp y variant=feed a FeedActivityList, igual que /me/feed", () => {
    render(
      <CommunityActivitySection source="from-following" initial={{ entries: [entry], page: 1, pageSize: 20, hasNext: false }} />,
    );

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "feed" }),
    );
  });

  it("'Tu actividad' pasa clamp y variant=self a FeedActivityList, igual que 'Tu rastro reciente' de Inicio", () => {
    render(<CommunityActivitySection source="own" initial={{ entries: [entry], page: 1, pageSize: 10, hasNext: false }} />);

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "self" }),
    );
  });

  it("'Recientes' usa la fila compacta, no FeedActivityList", () => {
    render(<CommunityActivitySection source="recent" initial={{ entries: [entry], page: 1, pageSize: 10, hasNext: false }} />);

    expect(screen.getByTestId("compact-row")).toBeInTheDocument();
    expect(screen.queryByTestId("feed-activity-list")).not.toBeInTheDocument();
  });

  it("sin sesión (headingKey) y sin entradas, no renderiza nada", () => {
    const { container } = render(
      <CommunityActivitySection
        source="recent"
        headingKey="community.recentHeading"
        initial={{ entries: [], page: 1, pageSize: 10, hasNext: false }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("dentro de pestañas, una fuente sin entradas muestra emptyMessage en vez de desaparecer", () => {
    render(
      <CommunityActivitySection
        source="from-following"
        initial={{ entries: [], page: 1, pageSize: 10, hasNext: false }}
        emptyMessage="Todavía no hay actividad acá."
      />,
    );

    expect(screen.getByText("Todavía no hay actividad acá.")).toBeInTheDocument();
    expect(screen.queryByTestId("feed-activity-list")).not.toBeInTheDocument();
  });
});
