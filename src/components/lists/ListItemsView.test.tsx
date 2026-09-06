import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListItemsView } from "./ListItemsView";
import type { UserListItem } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));

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

const items: UserListItem[] = [
  { id: "i1", position: 1, target: { id: "t1", title: "Rumours", artistName: "Fleetwood Mac", coverThumbUrl: null } },
  { id: "i2", position: 2, target: { id: "t2", title: "Tusk", artistName: "Fleetwood Mac", coverThumbUrl: null } },
];

describe("ListItemsView", () => {
  beforeEach(() => {
    installStorage();
    vi.clearAllMocks();
  });

  it("arranca en modo Detallada con título y artista", () => {
    renderWithIntl(<ListItemsView items={items} entityType="release-group" />);
    expect(screen.getByRole("link", { name: "Rumours" })).toBeInTheDocument();
    expect(screen.getAllByText("Fleetwood Mac").length).toBeGreaterThan(0);
  });

  it("cambia a modo Gráfico y permite seleccionar un ítem para actuar", async () => {
    renderWithIntl(
      <ListItemsView
        items={items}
        entityType="release-group"
        manage={{ busy: false, onReorder: vi.fn(), onRemove: vi.fn() }}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Gráfico" }));
    await userEvent.click(screen.getByRole("button", { name: 'Seleccionar “Rumours”' }));
    expect(screen.getByRole("group", { name: 'Acciones sobre “Rumours”' })).toBeInTheDocument();
  });

  it("mover abajo llama a onReorder con el orden intercambiado", async () => {
    const onReorder = vi.fn();
    renderWithIntl(
      <ListItemsView
        items={items}
        entityType="release-group"
        manage={{ busy: false, onReorder, onRemove: vi.fn() }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: 'Bajar “Rumours”' }));
    expect(onReorder).toHaveBeenCalledWith(["i2", "i1"]);
  });

  it("en modo lectura no muestra controles de reordenamiento", () => {
    renderWithIntl(<ListItemsView items={items} entityType="release-group" />);
    expect(screen.queryByRole("button", { name: 'Bajar “Rumours”' })).toBeNull();
  });
});
