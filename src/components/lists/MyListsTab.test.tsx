import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { MyListsTab } from "./MyListsTab";
import type { ListsListResponse, UserListSummary } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  getMyLists: vi.fn(),
  deleteList: vi.fn(),
  pinList: vi.fn(),
  unpinList: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("./ListForm", () => ({ ListForm: () => <div data-testid="list-form" /> }));
vi.mock("@/lib/api/lists", () => ({
  getMyLists: mocks.getMyLists,
  deleteList: mocks.deleteList,
  pinList: mocks.pinList,
  unpinList: mocks.unpinList,
}));

function list(overrides: Partial<UserListSummary> = {}): UserListSummary {
  return {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    entityType: "release-group",
    title: "Discos esenciales",
    description: null,
    audience: "followers",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    itemCount: 3,
    coverThumbs: [],
    pinned: false,
    ...overrides,
  };
}

function response(lists: UserListSummary[]): ListsListResponse {
  return { lists, page: 1, pageSize: 20, hasNext: false };
}

function renderTab(initial: ListsListResponse): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <MyListsTab initial={initial} />
    </QueryClientProvider>,
  ) as unknown as ReactElement;
}

describe("MyListsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderiza las tarjetas de la carga inicial", () => {
    renderTab(response([list(), list({ id: "a1b2c3d4-0000-4000-8000-000000000002", title: "Otra" })]));
    expect(screen.getByText("Discos esenciales")).toBeInTheDocument();
    expect(screen.getByText("Otra")).toBeInTheDocument();
  });

  it("muestra el estado vacío real con CTA cuando no hay listas", () => {
    renderTab(response([]));
    expect(screen.getByText("Todavía no creaste listas")).toBeInTheDocument();
  });

  it("filtra y muestra 'sin resultados' cuando la búsqueda no coincide", async () => {
    mocks.getMyLists.mockResolvedValue(response([]));
    renderTab(response([list()]));

    await userEvent.type(screen.getByPlaceholderText("Buscar en tus listas"), "zzz");
    await waitFor(() => expect(screen.getByText("Sin resultados")).toBeInTheDocument());
  });

  it("fija una lista llamando a pinList", async () => {
    mocks.pinList.mockResolvedValue(null);
    mocks.getMyLists.mockResolvedValue(response([list({ pinned: true })]));
    renderTab(response([list()]));

    await userEvent.click(screen.getByRole("button", { name: "Fijar" }));
    expect(mocks.pinList).toHaveBeenCalledWith("a1b2c3d4-0000-4000-8000-000000000001");
  });
});
