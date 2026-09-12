import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RowMenu, RowMenuItem } from "./RowMenu";

function renderMenu(onSelectA = vi.fn(), onSelectB = vi.fn()) {
  render(
    <RowMenu label="Más acciones">
      <RowMenuItem onSelect={onSelectA}>Opción A</RowMenuItem>
      <RowMenuItem onSelect={onSelectB} danger>
        Opción B
      </RowMenuItem>
    </RowMenu>,
  );
  return { onSelectA, onSelectB };
}

describe("RowMenu", () => {
  it("abre el menú al hacer click en el trigger y lo cierra al elegir un ítem", async () => {
    const user = userEvent.setup();
    const { onSelectA } = renderMenu();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Opción A" }));
    expect(onSelectA).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("cierra con Escape", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("cierra con un click fuera del menú", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <RowMenu label="Más acciones">
          <RowMenuItem onSelect={() => {}}>Opción A</RowMenuItem>
        </RowMenu>
        <button type="button">Fuera</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fuera" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("navega entre ítems con las flechas del teclado", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    const itemA = screen.getByRole("menuitem", { name: "Opción A" });
    const itemB = screen.getByRole("menuitem", { name: "Opción B" });

    expect(itemA).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(itemB).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(itemA).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(itemB).toHaveFocus();
  });

  it("marca la opción peligrosa con el color de danger", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.getByRole("menuitem", { name: "Opción B" }).className).toMatch(/text-danger/);
  });
});
