import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CollectionModeSwitcher } from "./CollectionModeSwitcher";

describe("CollectionModeSwitcher", () => {
  it("marca el modo activo y ofrece los tres modos como radios", () => {
    renderWithIntl(<CollectionModeSwitcher mode="shelf" onChange={vi.fn()} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Estantería" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Índice" })).toHaveAttribute("aria-checked", "false");
  });

  it("cambia de modo al hacer clic", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<CollectionModeSwitcher mode="shelf" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Lista detallada" }));
    expect(onChange).toHaveBeenCalledWith("detailed");
  });

  it("navega con las flechas del teclado", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<CollectionModeSwitcher mode="shelf" onChange={onChange} />);
    screen.getByRole("radio", { name: "Estantería" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("detailed");
  });
});
