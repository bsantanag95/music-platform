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

  it("con label muestra el nombre visible sin duplicarlo para lectores de pantalla", () => {
    render(
      <FilterSelect value="" onChange={() => {}} ariaLabel="Estrellas" label="Estrellas" widthClassName="w-[10ch]">
        <option value="">Todas</option>
      </FilterSelect>,
    );
    const visible = screen.getByText("Estrellas");
    expect(visible.getAttribute("aria-hidden")).toBe("true");
    // El select sigue nombrado una sola vez, por su aria-label.
    expect(screen.getAllByLabelText("Estrellas")).toHaveLength(1);
  });

  it("sin label no agrega ningún texto extra", () => {
    const { container } = render(
      <FilterSelect value="" onChange={() => {}} ariaLabel="Autor" widthClassName="w-[10ch]">
        <option value="">Todos</option>
      </FilterSelect>,
    );
    expect(container.querySelector("[aria-hidden='true'] + select, span")).toBeNull();
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
