import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("no renderiza nada cerrado", () => {
    render(
      <Dialog open={false} title="Título" onClose={vi.fn()}>
        <p>contenido</p>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre con el foco en el primer campo, con el título como nombre accesible", async () => {
    render(
      <Dialog open title="Cambiar usuario" onClose={vi.fn()}>
        <input aria-label="Usuario" />
        <button type="button">Guardar</button>
      </Dialog>,
    );
    expect(await screen.findByRole("dialog", { name: "Cambiar usuario" })).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario")).toHaveFocus();
  });

  it("Escape y el clic en el fondo cierran; el clic dentro no", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open title="Título" onClose={onClose}>
        <button type="button">Dentro</button>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Dentro" }));
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("atrapa el foco con Tab dentro del diálogo y bloquea el scroll mientras está abierto", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Dialog open title="Título" onClose={vi.fn()}>
        <button type="button">Uno</button>
        <button type="button">Dos</button>
      </Dialog>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    screen.getByRole("button", { name: "Dos" }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Uno" })).toHaveFocus();

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
