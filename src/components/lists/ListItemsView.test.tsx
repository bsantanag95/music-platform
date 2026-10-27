import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
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
const three: UserListItem[] = [
  ...items,
  { id: "i3", position: 3, target: { id: "t3", title: "Mirage", artistName: "Fleetwood Mac", coverThumbUrl: null } },
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

  // openspec: refine-me-lists-page-phase1
  it("subir y bajar que no aplican en un extremo no se ven pero conservan su lugar", () => {
    const manage = { busy: false, onReorder: vi.fn(), onRemove: vi.fn() };
    renderWithIntl(<ListItemsView items={items} entityType="release-group" manage={manage} />);
    expect(screen.getByRole("button", { name: "Subir “Rumours”", hidden: true }).className).toContain("invisible");
    expect(screen.getByRole("button", { name: "Bajar “Rumours”" }).className).not.toContain("invisible");
    expect(screen.getByRole("button", { name: "Bajar “Tusk”", hidden: true }).className).toContain("invisible");
  });

  it("subir, bajar y el menú miden 32 px y crecen a 44 con puntero grueso", () => {
    const manage = { busy: false, onReorder: vi.fn(), onRemove: vi.fn() };
    renderWithIntl(<ListItemsView items={items} entityType="release-group" manage={manage} />);
    for (const name of ["Bajar “Rumours”", "Más acciones para “Rumours”"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("size-8");
      expect(button.className).toContain("[@media(pointer:coarse)]:size-11");
    }
  });

  // openspec: redesign-me-lists-views
  it("el menú de la fila lleva al final y quita", async () => {
    const manage = { busy: false, onReorder: vi.fn(), onRemove: vi.fn() };
    renderWithIntl(<ListItemsView items={three} entityType="release-group" manage={manage} />);
    await userEvent.click(screen.getByRole("button", { name: "Más acciones para “Rumours”" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByRole("menuitem", { name: "Al principio" })).not.toBeInTheDocument();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Al final" }));
    expect(manage.onReorder).toHaveBeenCalledWith(["i2", "i3", "i1"]);

    await userEvent.click(screen.getByRole("button", { name: "Más acciones para “Tusk”" }));
    await userEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Quitar" }));
    expect(manage.onRemove).toHaveBeenCalledWith("i2");
  });

  it("mover a la posición lleva el ítem al puesto elegido", async () => {
    const manage = { busy: false, onReorder: vi.fn(), onRemove: vi.fn() };
    renderWithIntl(<ListItemsView items={three} entityType="release-group" manage={manage} />);
    await userEvent.click(screen.getByRole("button", { name: "Más acciones para “Mirage”" }));
    await userEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Mover a la posición…" }));
    const input = screen.getByLabelText("Posición (1 a 3)");
    expect(input).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Mover" })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, "1");
    await userEvent.click(screen.getByRole("button", { name: "Mover" }));
    expect(manage.onReorder).toHaveBeenCalledWith(["i3", "i1", "i2"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("en Índice los controles quedan siempre visibles", async () => {
    const manage = { busy: false, onReorder: vi.fn(), onRemove: vi.fn() };
    renderWithIntl(<ListItemsView items={items} entityType="release-group" manage={manage} />);
    await userEvent.click(screen.getByRole("radio", { name: "Índice" }));
    const controls = screen.getByRole("button", { name: "Bajar “Rumours”" }).closest("div")!.parentElement!;
    expect(controls.className).not.toContain("opacity-0");
  });
});
