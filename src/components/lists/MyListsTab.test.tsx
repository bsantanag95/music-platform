import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { MyListsTab } from "./MyListsTab";
import type { MyListsResponse, UserListSummary } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  getMyLists: vi.fn(),
  deleteList: vi.fn(),
  pinList: vi.fn(),
  unpinList: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
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

function response(lists: UserListSummary[]): MyListsResponse {
  const counts = { artist: 0, "release-group": 0, recording: 0 };
  for (const list of lists) counts[list.entityType] += 1;
  return { lists, page: 1, pageSize: 20, hasNext: false, counts };
}

function renderTab(initial: MyListsResponse, props: Partial<Parameters<typeof MyListsTab>[0]> = {}): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <MyListsTab initial={initial} {...props} />
    </QueryClientProvider>,
  ) as unknown as ReactElement;
}

describe("MyListsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/me/lists");
  });

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

    await userEvent.click(screen.getByRole("button", { name: "Fijar Discos esenciales" }));
    expect(mocks.pinList).toHaveBeenCalledWith("a1b2c3d4-0000-4000-8000-000000000001");
  });

  // openspec: refine-me-lists-page-phase1
  it("cada acción de la tarjeta nombra la lista", () => {
    renderTab(response([list({ pinned: true })]));
    expect(screen.getByRole("button", { name: "Desfijar Discos esenciales" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar Discos esenciales" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar Discos esenciales" }).className).toContain(
      "[@media(pointer:coarse)]:min-h-11",
    );
  });

  it("eliminar abre un diálogo con el nombre y los elementos, y solo borra al confirmar", async () => {
    mocks.deleteList.mockResolvedValue(null);
    mocks.getMyLists.mockResolvedValue(response([]));
    renderTab(response([list()]));

    await userEvent.click(screen.getByRole("button", { name: "Eliminar Discos esenciales" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("¿Eliminar «Discos esenciales»?");
    expect(dialog).toHaveTextContent("Se pierden sus 3 elementos y su orden. No se puede deshacer.");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.deleteList).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Eliminar Discos esenciales" }));
    await userEvent.click(screen.getByRole("button", { name: "Eliminar lista" }));
    expect(mocks.deleteList).toHaveBeenCalledWith("a1b2c3d4-0000-4000-8000-000000000001");
  });

  it("si borrar falla, el aviso va bajo esa tarjeta", async () => {
    mocks.deleteList.mockRejectedValue(new Error("x"));
    renderTab(response([list()]));
    await userEvent.click(screen.getByRole("button", { name: "Eliminar Discos esenciales" }));
    await userEvent.click(screen.getByRole("button", { name: "Eliminar lista" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos eliminar la lista. Intenta de nuevo.");
  });

  it("si fijar falla, lo dice bajo la tarjeta", async () => {
    mocks.pinList.mockRejectedValue(new Error("x"));
    renderTab(response([list()]));
    await userEvent.click(screen.getByRole("button", { name: "Fijar Discos esenciales" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cambiar la lista fijada.");
  });

  it("escribe los filtros en la URL sin perder la pestaña", async () => {
    window.history.replaceState(null, "", "/me/lists?tab=mine");
    mocks.getMyLists.mockResolvedValue(response([]));
    renderTab(response([list()]));
    await userEvent.type(screen.getByPlaceholderText("Buscar en tus listas"), "aor");
    await waitFor(() => expect(window.location.search).toBe("?tab=mine&q=aor"));
  });

  it("abre con los filtros de la URL sin volver a pedirlos", () => {
    renderTab(response([list({ title: "Best AOR songs", entityType: "recording" })]), {
      initialFilters: { q: "aor", entityType: "recording", sort: "recent" },
    });
    expect(screen.getByPlaceholderText("Buscar en tus listas")).toHaveValue("aor");
    expect(screen.getByText("Best AOR songs")).toBeInTheDocument();
    expect(mocks.getMyLists).not.toHaveBeenCalled();
  });

  // openspec: redesign-me-lists-toolbar
  it("muestra los segmentos de tipo con sus cifras y deshabilita un tipo vacío", () => {
    renderTab(response([list(), list({ id: "a1b2c3d4-0000-4000-8000-000000000002", entityType: "artist" })]));
    expect(screen.getByRole("button", { name: /^Todo\s*2$/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Álbumes\s*1$/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Canciones\s*0$/ })).toBeDisabled();
    expect(screen.getByLabelText("Ordenar")).toHaveValue("recent");
  });

  it("sin ninguna lista no muestra la barra, solo el estado vacío", () => {
    renderTab(response([]));
    expect(screen.queryByPlaceholderText("Buscar en tus listas")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva lista" })).toBeInTheDocument();
  });
});
