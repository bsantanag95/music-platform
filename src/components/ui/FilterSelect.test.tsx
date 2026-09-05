import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSelect } from "./FilterSelect";

describe("FilterSelect", () => {
  it("expone el valor y el aria-label pasados, y avisa al cambiar de opción", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterSelect value="" onChange={onChange} ariaLabel="Tipo" widthClassName="w-[10ch]">
        <option value="">Tipo</option>
        <option value="a">A</option>
      </FilterSelect>,
    );

    const select = screen.getByLabelText("Tipo") as HTMLSelectElement;
    expect(select.value).toBe("");

    await user.selectOptions(select, "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("aplica la clase compartida de estilo nativo y el ancho pedido", () => {
    render(
      <FilterSelect value="" onChange={() => {}} ariaLabel="Autor" widthClassName="w-[17ch]">
        <option value="">Autor</option>
      </FilterSelect>,
    );

    const select = screen.getByLabelText("Autor");
    expect(select.className).toMatch(/filter-select/);
    expect(select.className).toMatch(/w-\[17ch\]/);
  });
});
