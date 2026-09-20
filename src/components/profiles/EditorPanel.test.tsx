import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { EditorPanel } from "./EditorPanel";

// Anfitrión mínimo: un disparador que abre el panel y le pasa el foco de
// retorno, como hará el bloque editable.
function Host({ dirty = false, onClose }: { dirty?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          setTrigger(event.currentTarget);
          setOpen(true);
        }}
      >
        abrir
      </button>
      <EditorPanel
        open={open}
        title="Editar bio"
        dirty={dirty}
        returnFocusTo={trigger}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
      >
        <input aria-label="campo" />
        <button type="button">otro</button>
      </EditorPanel>
    </>
  );
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "abrir" }));
  return screen.findByRole("dialog", { name: "Editar bio" });
}

describe("EditorPanel", () => {
  it("cerrado no renderiza nada", () => {
    renderWithIntl(<Host />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abierto es un diálogo modal con nombre accesible y recibe el foco", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Host />);
    const dialog = await openPanel(user);

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
    expect(screen.getByLabelText("campo")).toBeInTheDocument();
  });

  it("bloquea el scroll del documento mientras está abierto y lo restaura al cerrar", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Host />);
    await openPanel(user);
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("Escape cierra el panel sin cambios y devuelve el foco al disparador", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithIntl(<Host onClose={onClose} />);
    await openPanel(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "abrir" })).toHaveFocus();
  });

  it("el botón Cerrar y el clic en el fondo cierran sin cambios", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithIntl(<Host onClose={onClose} />);

    await openPanel(user);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    await openPanel(user);
    await user.click(screen.getByTestId("editor-panel-backdrop"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });

  it("con cambios sin guardar pide confirmar el descarte y no cierra todavía", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithIntl(<Host dirty onClose={onClose} />);
    await openPanel(user);

    await user.keyboard("{Escape}");

    expect(await screen.findByRole("dialog", { name: "¿Descartar los cambios?" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Editar bio" })).toBeInTheDocument();
  });

  it("'Seguir editando' conserva el panel abierto; Escape en el descarte no cierra el panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithIntl(<Host dirty onClose={onClose} />);
    await openPanel(user);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });

    // Escape dentro del diálogo de descarte solo cancela el descarte.
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "¿Descartar los cambios?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "Editar bio" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await user.click(await screen.findByRole("button", { name: "Seguir editando" }));
    expect(screen.getByRole("dialog", { name: "Editar bio" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("'Descartar' confirma y cierra el panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithIntl(<Host dirty onClose={onClose} />);
    await openPanel(user);
    await user.click(screen.getByTestId("editor-panel-backdrop"));

    await user.click(await screen.findByRole("button", { name: "Descartar" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("atrapa el foco: Tab desde el último elemento vuelve al primero y Shift+Tab al revés", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Host />);
    await openPanel(user);

    const close = screen.getByRole("button", { name: "Cerrar" });
    const last = screen.getByRole("button", { name: "otro" });

    last.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});
