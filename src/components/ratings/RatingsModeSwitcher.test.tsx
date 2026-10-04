import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { RatingsModeSwitcher } from "./RatingsModeSwitcher";

describe("RatingsModeSwitcher", () => {
  it("expone un radiogroup con los tres modos y marca el activo", () => {
    renderWithIntl(<RatingsModeSwitcher mode="index" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Modo de visualización" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Índice" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Gráfico" }).getAttribute("aria-checked")).toBe("false");
  });

  it("la flecha derecha pasa de Índice a Gráfico y le da el foco", () => {
    const onChange = vi.fn();
    renderWithIntl(<RatingsModeSwitcher mode="index" onChange={onChange} />);
    const index = screen.getByRole("radio", { name: "Índice" });
    index.focus();
    fireEvent.keyDown(index, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("graphic");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Gráfico" }));
  });

  it("la flecha izquierda desde Detallada vuelve a Gráfico (circular)", () => {
    const onChange = vi.fn();
    renderWithIntl(<RatingsModeSwitcher mode="detailed" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Detallada" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("graphic");
  });

  it("al hacer clic cambia el modo", () => {
    const onChange = vi.fn();
    renderWithIntl(<RatingsModeSwitcher mode="detailed" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Gráfico" }));
    expect(onChange).toHaveBeenCalledWith("graphic");
  });
});
