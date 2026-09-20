import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { EditableBlock } from "./EditableBlock";
import { OwnerEditProvider, useOwnerEdit } from "./OwnerEditProvider";
import { OwnerIdentityEditor } from "./OwnerIdentityEditor";
import { OwnerLinksEditor } from "./OwnerLinksEditor";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { apiFetch: vi.fn(), ApiError, refresh: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

beforeEach(() => vi.clearAllMocks());

const emptyInitial = { bio: null, pronouns: null, location: null, timezone: null };

// Interruptor mínimo que hace de `OwnerProfileBar`.
function EditToggle() {
  const ownerEdit = useOwnerEdit();
  return (
    <button type="button" onClick={() => ownerEdit?.setEditing(!ownerEdit.editing)}>
      interruptor
    </button>
  );
}

function PlacaBlock() {
  return (
    <EditableBlock
      label="Placa"
      editor={
        <>
          <OwnerIdentityEditor initial={emptyInitial} />
          <OwnerLinksEditor initialLinks={[]} />
        </>
      }
    >
      <p>Vista de la placa</p>
    </EditableBlock>
  );
}

function renderProfile() {
  return renderWithIntl(
    <OwnerEditProvider>
      <EditToggle />
      <PlacaBlock />
    </OwnerEditProvider>,
  );
}

describe("EditableBlock", () => {
  it("sin proveedor (visitante o previsualización) solo muestra el bloque, sin controles", () => {
    renderWithIntl(
      <EditableBlock label="Placa" editor={<div>editor</div>}>
        <p>Vista de la placa</p>
      </EditableBlock>,
    );
    expect(screen.getByText("Vista de la placa")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("con el modo edición desactivado no hay lápiz", () => {
    renderProfile();
    expect(screen.getByText("Vista de la placa")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
  });

  it("al activar el modo edición aparece el lápiz accesible con el nombre del bloque", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "interruptor" }));

    expect(screen.getByRole("button", { name: "Editar Placa" })).toBeInTheDocument();
  });

  it("desactivar el modo edición vuelve a ocultar el lápiz", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "interruptor" }));
    await user.click(screen.getByRole("button", { name: "interruptor" }));

    expect(screen.queryByRole("button", { name: "Editar Placa" })).not.toBeInTheDocument();
  });

  it("el lápiz abre el editor del bloque en el panel lateral", async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(screen.getByRole("button", { name: "interruptor" }));

    await user.click(screen.getByRole("button", { name: "Editar Placa" }));

    const dialog = await screen.findByRole("dialog", { name: "Placa" });
    expect(dialog).toContainElement(screen.getByLabelText("Bio"));
    expect(dialog).toContainElement(screen.getByRole("button", { name: "Agregar enlace" }));
  });

  it("cerrar sin haber guardado no refresca el perfil; el foco vuelve al lápiz", async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(screen.getByRole("button", { name: "interruptor" }));
    await user.click(screen.getByRole("button", { name: "Editar Placa" }));
    await screen.findByRole("dialog", { name: "Placa" });

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Editar Placa" })).toHaveFocus();
  });

  it("tras guardar un cambio, cerrar refresca el perfil y no pide confirmar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ user: {} });
    renderProfile();
    await user.click(screen.getByRole("button", { name: "interruptor" }));
    await user.click(screen.getByRole("button", { name: "Editar Placa" }));
    await screen.findByRole("dialog", { name: "Placa" });

    await user.type(screen.getByLabelText("Bio"), "Colecciono casetes");
    await user.click(screen.getAllByRole("button", { name: "Guardar" })[0]!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Guardado"));
    expect(mocks.refresh).not.toHaveBeenCalled(); // el refresco es al cerrar, no al guardar

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog", { name: "¿Descartar los cambios?" })).not.toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("con cambios sin guardar pide confirmar el descarte antes de cerrar", async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(screen.getByRole("button", { name: "interruptor" }));
    await user.click(screen.getByRole("button", { name: "Editar Placa" }));
    await screen.findByRole("dialog", { name: "Placa" });

    await user.type(screen.getByLabelText("Bio"), "sin guardar");
    await user.keyboard("{Escape}");

    expect(await screen.findByRole("dialog", { name: "¿Descartar los cambios?" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Placa" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("con dos editores en el panel, limpiar uno no oculta que el otro sigue sin guardar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ user: {} });
    renderProfile();
    await user.click(screen.getByRole("button", { name: "interruptor" }));
    await user.click(screen.getByRole("button", { name: "Editar Placa" }));
    await screen.findByRole("dialog", { name: "Placa" });

    // Editor de identidad: cambia y guarda (queda limpio).
    await user.type(screen.getByLabelText("Bio"), "hola");
    await user.click(screen.getAllByRole("button", { name: "Guardar" })[0]!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Guardado"));

    // Editor de enlaces: cambia y NO guarda.
    await user.click(screen.getByRole("button", { name: "Agregar enlace" }));
    await user.type(screen.getByLabelText("URL"), "https://ana.example");

    await user.keyboard("{Escape}");

    expect(await screen.findByRole("dialog", { name: "¿Descartar los cambios?" })).toBeInTheDocument();
  });

  it("reabrir el panel empieza sin cambios pendientes del editor anterior", async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(screen.getByRole("button", { name: "interruptor" }));

    await user.click(screen.getByRole("button", { name: "Editar Placa" }));
    await screen.findByRole("dialog", { name: "Placa" });
    await user.type(screen.getByLabelText("Bio"), "borrador");
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Editar Placa" }));
    await screen.findByRole("dialog", { name: "Placa" });
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog", { name: "¿Descartar los cambios?" })).not.toBeInTheDocument();
  });

  describe("bloque vacío", () => {
    function renderEmpty() {
      return renderWithIntl(
        <OwnerEditProvider>
          <EditToggle />
          <EditableBlock label="Destacados" empty editor={<div>editor de destacados</div>}>
            {null}
          </EditableBlock>
        </OwnerEditProvider>,
      );
    }

    it("sin modo edición no dibuja nada, igual que para un visitante", () => {
      renderEmpty();
      expect(screen.queryByText(/todavía no hay nada/)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
    });

    it("con modo edición muestra un marco vacío con su lápiz, que abre el editor", async () => {
      const user = userEvent.setup();
      renderEmpty();

      await user.click(screen.getByRole("button", { name: "interruptor" }));

      expect(screen.getByText("Destacados: todavía no hay nada acá. Editá para agregar.")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Editar Destacados" }));
      const dialog = await screen.findByRole("dialog", { name: "Destacados" });
      expect(dialog).toHaveTextContent("editor de destacados");
    });

    it("sin proveedor un bloque vacío sigue sin mostrar nada", () => {
      const { container } = renderWithIntl(
        <EditableBlock label="Destacados" empty editor={<div>editor</div>}>
          {null}
        </EditableBlock>,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
