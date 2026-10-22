import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { LogListenButton } from "./LogListenButton";

vi.mock("@/components/quick-actions/QuickActionsDialog", () => ({
  QuickActionsDialog: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Añadir">
      <button type="button" onClick={onClose}>
        cerrar
      </button>
    </div>
  ),
}));

describe("LogListenButton", () => {
  it("abre el registro global y devuelve el foco al cerrarlo", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LogListenButton />);
    const trigger = screen.getByRole("button", { name: "Anotar escucha" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Añadir" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
