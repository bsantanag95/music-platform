import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AddPendingButton } from "./AddPendingButton";

// openspec: redesign-want-to-listen-toolbar. «Anotar algo» abre el diálogo global ya en Pendiente.
vi.mock("@/components/quick-actions/QuickActionsDialog", () => ({
  QuickActionsDialog: ({ initialAction, onClose }: { initialAction?: string; onClose: () => void }) => (
    <div role="dialog" data-initial-action={initialAction}>
      <button type="button" onClick={onClose}>
        cerrar
      </button>
    </div>
  ),
}));

describe("AddPendingButton", () => {
  it("abre el diálogo en Pendiente y devuelve el foco al cerrar", async () => {
    renderWithIntl(<AddPendingButton />);
    const trigger = screen.getByRole("button", { name: "Anotar algo" });

    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-initial-action", "pending");

    await userEvent.click(screen.getByRole("button", { name: "cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
