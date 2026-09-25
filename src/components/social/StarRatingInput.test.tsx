import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StarRatingInput } from "./StarRatingInput";

const valueLabel = (value: number) => `${value} estrellas`;

function renderInput(value: number | null, onChange = vi.fn()) {
  render(<StarRatingInput value={value} onChange={onChange} legend="Tu nota" valueLabel={valueLabel} />);
  return onChange;
}

describe("StarRatingInput", () => {
  it("ofrece diez opciones de ½ a 5 dentro de un grupo rotulado", () => {
    renderInput(null);
    expect(screen.getByRole("group", { name: "Tu nota" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(radios[0]).toHaveAccessibleName("0.5 estrellas");
    expect(radios[9]).toHaveAccessibleName("5 estrellas");
  });

  it("la mitad izquierda de la cuarta estrella elige 3½ y la derecha 4", () => {
    const onChange = renderInput(null);
    fireEvent.click(screen.getByRole("radio", { name: "3.5 estrellas" }));
    expect(onChange).toHaveBeenLastCalledWith(3.5);
    fireEvent.click(screen.getByRole("radio", { name: "4 estrellas" }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("marca el valor vigente", () => {
    renderInput(3);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "3.5 estrellas" })).not.toBeChecked();
  });

  it("deshabilitado no permite elegir", () => {
    render(<StarRatingInput value={null} onChange={vi.fn()} legend="Tu nota" valueLabel={valueLabel} disabled />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
  });
});
