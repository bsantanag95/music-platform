import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { UserListSummary, UserListsResponse } from "@/lib/api/schemas";
import { ListsList } from "./ListsList";

const mocks = vi.hoisted(() => ({ getUserLists: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("@/lib/api/lists", () => ({
  getUserLists: mocks.getUserLists,
  saveList: vi.fn(),
  unsaveList: vi.fn(),
}));

let seq = 0;
function list(overrides: Partial<UserListSummary> = {}): UserListSummary {
  seq += 1;
  return {
    id: `a1b2c3d4-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    entityType: "release-group",
    title: `Lista ${seq}`,
    description: null,
    audience: "public",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    itemCount: 3,
    coverThumbs: [],
    pinned: false,
    ...overrides,
  };
}

function response(lists: UserListSummary[], over: Partial<UserListsResponse> = {}): UserListsResponse {
  return { lists, page: 1, pageSize: 20, hasNext: false, totalCount: lists.length, ...over };
}

function renderList(initial: UserListsResponse) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <ListsList initial={initial} username="ana" />
    </QueryClientProvider>,
  );
}

describe("ListsList", () => {
  beforeEach(() => {
    seq = 0;
    vi.clearAllMocks();
  });

  it("muestra el total real y las tarjetas de la carga inicial, sin controles de gestión", () => {
    renderList(response([list(), list()], { totalCount: 23, hasNext: true }));
    expect(screen.getByText("23 listas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lista 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nueva lista" })).not.toBeInTheDocument();
    expect(screen.queryByText("Fijar")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  it("sin listas ni filtros: solo el estado vacío del perfil", () => {
    renderList(response([]));
    expect(screen.getByText("Sin listas")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("'Cargar más' pide la página siguiente de las listas DEL DUEÑO", async () => {
    mocks.getUserLists.mockResolvedValue(response([list({ title: "Nueva" })], { page: 2, totalCount: 21 }));
    renderList(response([list()], { hasNext: true, totalCount: 21 }));

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() => expect(mocks.getUserLists).toHaveBeenCalledWith("ana", 2, 20, {}));
    expect(await screen.findByRole("link", { name: "Nueva" })).toBeInTheDocument();
  });

  it("buscar reenvía el filtro al API del perfil y muestra los resultados", async () => {
    mocks.getUserLists.mockResolvedValue(response([list({ title: "Rock 80" })], { totalCount: 1 }));
    renderList(response([list(), list()]));

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar listas" }), "rock");

    await waitFor(() =>
      expect(mocks.getUserLists).toHaveBeenCalledWith("ana", 1, 20, {
        q: "rock",
        entityType: undefined,
        sort: undefined,
      }),
    );
    expect(await screen.findByRole("link", { name: "Rock 80" })).toBeInTheDocument();
    expect(screen.getByText("1 lista")).toBeInTheDocument();
  });

  it("una búsqueda sin coincidencias muestra 'Sin resultados' sin hablar de 'tus listas'", async () => {
    mocks.getUserLists.mockResolvedValue(response([], { totalCount: 0 }));
    renderList(response([list()]));

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar listas" }), "zzz");

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText("Ninguna lista coincide con esos filtros.")).toBeInTheDocument();
  });
});
