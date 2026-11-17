import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { OwnerAddAction } from "./OwnerAddAction";
import { OWN_DATA_CHANGED_EVENT } from "@/components/quick-actions/quick-actions-changes";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/quick-actions/QuickActionsDialog", () => ({
  QuickActionsDialog: ({ onClose, initialAction }: { onClose: () => void; initialAction: string }) => (
    <div role="dialog" data-action={initialAction}>
      <button type="button" onClick={onClose}>
        cerrar
      </button>
    </div>
  ),
}));

beforeEach(() => router.refresh.mockClear());

describe("OwnerAddAction", () => {
  it("abre el diálogo «Añadir» en la acción del estante", () => {
    render(<OwnerAddAction kind="listen" />);
    const trigger = screen.getByRole("button", { name: "ownerAdd.listenAria" });
    expect(trigger).toHaveTextContent("ownerAdd.listen");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-action", "listen");
  });

  it("sin cambios: al cerrar no refresca y devuelve el foco", () => {
    render(<OwnerAddAction kind="newList" />);
    const trigger = screen.getByRole("button", { name: "ownerAdd.newListAria" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("con un cambio mientras estuvo abierto: al cerrar refresca el perfil", () => {
    render(<OwnerAddAction kind="collection" />);
    fireEvent.click(screen.getByRole("button", { name: "ownerAdd.collectionAria" }));
    act(() => {
      window.dispatchEvent(new Event(OWN_DATA_CHANGED_EVENT));
    });
    fireEvent.click(screen.getByRole("button", { name: "cerrar" }));
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
