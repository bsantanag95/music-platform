import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AddCopyButton } from "./AddCopyButton";

const dialog = vi.hoisted(() => ({ props: vi.fn() }));
vi.mock("@/components/quick-actions/QuickActionsDialog", () => ({
  QuickActionsDialog: (props: { initialAction?: string }) => {
    dialog.props(props);
    return <div role="dialog" aria-label="Acciones rápidas" />;
  },
}));

describe("AddCopyButton", () => {
  it("abre el diálogo de acciones rápidas ya en la acción Colección", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AddCopyButton />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Añadir copia" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(dialog.props).toHaveBeenCalledWith(expect.objectContaining({ initialAction: "collection" }));
  });
});
