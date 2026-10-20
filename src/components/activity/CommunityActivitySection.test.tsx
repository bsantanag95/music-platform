import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AnchorHTMLAttributes, ReactElement, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CommunityActivitySection } from "./CommunityActivitySection";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
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
  it("'Siguiendo' pasa clamp y variant=feed a FeedActivityList, igual que /me/feed", () => {
    render(
      <CommunityActivitySection source="from-following" initial={{ entries: [entry], page: 1, pageSize: 20, hasNext: false }} />,
    );

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "feed" }),
    );
  });

  it("'Tú' pasa clamp y variant=own a FeedActivityList: la anatomía con carátula de las otras pestañas, sin autor", () => {
    render(<CommunityActivitySection source="own" initial={{ entries: [entry], page: 1, pageSize: 10, hasNext: false }} />);

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "own" }),
    );
  });

  it("'Recientes' usa la misma presentación del feed que las otras pestañas (variant=feed, clamp)", () => {
    render(<CommunityActivitySection source="recent" initial={{ entries: [entry], page: 1, pageSize: 10, hasNext: false }} />);

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "feed" }),
    );
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

  it("dentro de pestañas, una fuente sin entradas muestra su estado vacío con la acción", () => {
    render(
      <CommunityActivitySection
        source="from-following"
        initial={{ entries: [], page: 1, pageSize: 10, hasNext: false }}
        empty={{
          title: "Aún no sigues a nadie",
          description: "Aquí verás lo que valoran las personas que sigues.",
          action: { label: "Descubrir personas", href: "/users" },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Aún no sigues a nadie" })).toBeInTheDocument();
    expect(screen.getByText("Aquí verás lo que valoran las personas que sigues.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Descubrir personas" })).toHaveAttribute("href", "/users");
    expect(screen.queryByTestId("feed-activity-list")).not.toBeInTheDocument();
  });

  it("sin página inicial del servidor muestra un esqueleto y luego pide la página 1 a su endpoint", async () => {
    const { getRecentActivity } = await import("@/lib/api/home");
    vi.mocked(getRecentActivity).mockResolvedValueOnce({ entries: [entry], page: 1, pageSize: 10, hasNext: false });

    render(<CommunityActivitySection source="own" empty={{ title: "Vacío", description: "d" }} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByTestId("feed-activity-list")).toBeInTheDocument();
    expect(getRecentActivity).toHaveBeenCalledWith(1, 10);
  });
});
