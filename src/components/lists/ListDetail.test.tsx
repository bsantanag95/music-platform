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
vi.mock("./ListItemSearch", () => ({ ListItemSearch: () => <div data-testid="item-search" /> }));
vi.mock("@/lib/api/lists", () => ({
  reorderListItems: vi.fn(),
  removeItemFromList: vi.fn(),
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

  it("abre el panel de alta de ítems", async () => {
    renderWithIntl(<ListDetail initial={detail()} />);
    await userEvent.click(screen.getByRole("button", { name: "Agregar elemento" }));
    expect(screen.getByTestId("item-search")).toBeInTheDocument();
  });

  it("lista vacía muestra el estado vacío", () => {
    renderWithIntl(<ListDetail initial={detail({ items: [], itemCount: 0 })} />);
    expect(screen.getByText("Esta lista todavía no tiene elementos.")).toBeInTheDocument();
  });
});
