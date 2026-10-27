import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListDetail } from "./ListDetail";
import type { UserListDetail } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
const mocks = vi.hoisted(() => ({ reorderListItems: vi.fn(), removeItemFromList: vi.fn(), addItemToList: vi.fn() }));
vi.mock("@/lib/api/lists", () => ({
  reorderListItems: mocks.reorderListItems,
  addItemToList: mocks.addItemToList,
  removeItemFromList: mocks.removeItemFromList,
  updateList: vi.fn(),
  deleteList: vi.fn(),
}));

function installStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    },
  });
}

function detail(overrides: Partial<UserListDetail> = {}): UserListDetail {
  return {
    id: "l1",
    entityType: "release-group",
    title: "Discos que me cambiaron",
    description: "una nota",
    audience: "followers",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    itemCount: 1,
    coverThumbs: [],
    pinned: false,
    items: [
      { id: "i1", position: 1, target: { id: "t1", title: "Rumours", artistName: "Fleetwood Mac", coverThumbUrl: null } },
    ],
    ...overrides,
  };
}

describe("ListDetail", () => {
  beforeEach(() => {
    installStorage();
    vi.clearAllMocks();
  });

  it("muestra la cabecera y los ítems", () => {
    renderWithIntl(<ListDetail initial={detail()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Discos que me cambiaron" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rumours" })).toBeInTheDocument();
  });

  it("lista vacía muestra el estado vacío", () => {
    renderWithIntl(<ListDetail initial={detail({ items: [], itemCount: 0 })} />);
    expect(screen.getByText("Esta lista todavía no tiene elementos.")).toBeInTheDocument();
  });

  it("reordenar un ítem llama a reorderListItems con el nuevo orden", async () => {
    mocks.reorderListItems.mockResolvedValue(detail());
    const two = detail({
      itemCount: 2,
      items: [
        { id: "i1", position: 1, target: { id: "t1", title: "Rumours", artistName: null, coverThumbUrl: null } },
        { id: "i2", position: 2, target: { id: "t2", title: "Tusk", artistName: null, coverThumbUrl: null } },
      ],
    });
    renderWithIntl(<ListDetail initial={two} />);
    await userEvent.click(screen.getByRole("button", { name: 'Bajar “Rumours”' }));
    expect(mocks.reorderListItems).toHaveBeenCalledWith("l1", ["i2", "i1"]);
  });

  it("ya no ofrece agregar elementos desde el detalle", () => {
    renderWithIntl(<ListDetail initial={detail()} />);
    expect(screen.queryByRole("button", { name: "Agregar elemento" })).toBeNull();
  });

  // openspec: redesign-me-lists-views
  it("quitar es inmediato y Deshacer devuelve el ítem a su posición", async () => {
    const items = [
      { id: "i1", position: 1, target: { id: "t1", title: "Rumours", artistName: null, coverThumbUrl: null } },
      { id: "i2", position: 2, target: { id: "t2", title: "Tusk", artistName: null, coverThumbUrl: null } },
      { id: "i3", position: 3, target: { id: "t3", title: "Mirage", artistName: null, coverThumbUrl: null } },
    ];
    const initial = detail({ items, itemCount: 3 });
    mocks.removeItemFromList.mockResolvedValue({ ...initial, items: [items[0], items[2]], itemCount: 2 });
    const readded = { id: "i9", position: 3, target: items[1]!.target };
    mocks.addItemToList.mockResolvedValue({ ...initial, items: [items[0], items[2], readded] });
    mocks.reorderListItems.mockResolvedValue({ ...initial, items: [items[0], readded, items[2]] });
    renderWithIntl(<ListDetail initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: "Más acciones para “Tusk”" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Quitar" }));
    expect(mocks.removeItemFromList).toHaveBeenCalledWith("l1", "i2");
    expect(screen.getByRole("status")).toHaveTextContent("Quitaste “Tusk”");

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(mocks.addItemToList).toHaveBeenCalledWith("l1", { type: "release-group", id: "t2" });
    expect(mocks.reorderListItems).toHaveBeenCalledWith("l1", ["i1", "i9", "i3"]);
    expect(await screen.findByRole("link", { name: "Tusk" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("si deshacer falla lo dice y ya no ofrece Deshacer", async () => {
    const initial = detail();
    mocks.removeItemFromList.mockResolvedValue({ ...initial, items: [], itemCount: 0 });
    mocks.addItemToList.mockRejectedValue(new Error("x"));
    renderWithIntl(<ListDetail initial={initial} />);
    await userEvent.click(screen.getByRole("button", { name: "Más acciones para “Rumours”" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Quitar" }));
    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(await screen.findByText("No pudimos deshacer. Intenta de nuevo.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
  });
});
