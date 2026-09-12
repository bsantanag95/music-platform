import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CommunityExploreGrid } from "./CommunityExploreGrid";
import type { DiscoverListSummary, DiscoverListsResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  getDiscoverLists: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/lists",
}));
vi.mock("@/lib/api/lists", () => ({ getDiscoverLists: mocks.getDiscoverLists }));
vi.mock("./CommunityListCard", () => ({
  CommunityListCard: ({ list }: { list: DiscoverListSummary }) => (
    <div data-testid="community-card">{list.title}</div>
  ),
}));

function list(id: string, title: string): DiscoverListSummary {
  return {
    id,
    entityType: "release-group",
    title,
    description: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    itemCount: 3,
    coverThumbs: [],
    owner: { id: "o1", username: "curador", displayName: null },
    isOfficial: false,
    saved: false,
    following: false,
    isOwn: false,
  };
}

function response(lists: DiscoverListSummary[], hasNext = false): DiscoverListsResponse {
  return { lists, page: 1, pageSize: 20, hasNext };
}

function renderGrid(initial: DiscoverListsResponse): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <CommunityExploreGrid initial={initial} filters={{ q: "pink" }} canSave />
    </QueryClientProvider>,
  ) as unknown as ReactElement;
}

describe("CommunityExploreGrid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderiza los resultados iniciales", () => {
    renderGrid(response([list("a1b2c3d4-0000-4000-8000-000000000001", "Álbumes rosas")]));
    expect(screen.getByText("Álbumes rosas")).toBeInTheDocument();
  });

  it("sin resultados muestra el estado localizado y limpia filtros", () => {
    renderGrid(response([]));

    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(mocks.replace).toHaveBeenCalledWith("/lists", { scroll: false });
  });

  it("pagina manteniendo los filtros", async () => {
    mocks.getDiscoverLists.mockResolvedValue(
      response([list("a1b2c3d4-0000-4000-8000-000000000002", "Otra lista")]),
    );
    renderGrid(response([list("a1b2c3d4-0000-4000-8000-000000000001", "Primera")], true));

    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() =>
      expect(mocks.getDiscoverLists).toHaveBeenCalledWith(2, 20, {
        q: "pink",
        entityType: undefined,
        sort: undefined,
      }),
    );
    expect(await screen.findByText("Otra lista")).toBeInTheDocument();
  });
});
