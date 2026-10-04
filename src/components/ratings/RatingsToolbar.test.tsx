import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { EMPTY_RATING_FILTERS, RatingsToolbar, ratingFiltersActive, type RatingsFiltersState } from "./RatingsToolbar";

function renderToolbar(filters: RatingsFiltersState = EMPTY_RATING_FILTERS) {
  const onChange = vi.fn();
  const onSearchInput = vi.fn();
  const onClear = vi.fn();
  const view = renderWithIntl(
    <RatingsToolbar
      filters={filters}
      onChange={onChange}
      searchInput={filters.q}
      onSearchInput={onSearchInput}
      onClear={onClear}
      availableYears={[2012, 1987]}
    />,
  );
  return { onChange, onSearchInput, onClear, unmount: view.unmount };
}

describe("RatingsToolbar", () => {
  it("el selector de tipo solo ofrece álbum y canción (los artistas no se valoran)", () => {
    renderToolbar();
    const select = screen.getByLabelText("Tipo") as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual(["Todos", "Álbum", "Canción"]);
  });

  it("el selector de agrupar ofrece por tipo, por artista y sin agrupar", () => {
    renderToolbar();
    const select = screen.getByLabelText("Agrupar") as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(["type", "artist", "none"]);
    expect([...select.options].map((option) => option.textContent)).toEqual(["Por tipo", "Por artista", "Sin agrupar"]);
  });

  it("cada selector muestra su nombre de forma visible, no solo al abrirlo", () => {
    renderToolbar();
    for (const name of ["Tipo", "Estrellas", "Año", "Década", "Ordenar", "Agrupar"]) {
      const visible = screen.getAllByText(name).find((node) => node.tagName === "SPAN");
      expect(visible, name).toBeTruthy();
      expect(visible!.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("cada control emite el cambio con el resto del estado intacto", () => {
    const { onChange } = renderToolbar();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "recording" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RATING_FILTERS, type: "recording" });
    fireEvent.change(screen.getByLabelText("Estrellas"), { target: { value: "4.5" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RATING_FILTERS, stars: "4.5" });
    fireEvent.change(screen.getByLabelText("Año"), { target: { value: "1987" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RATING_FILTERS, year: "1987" });
    fireEvent.change(screen.getByLabelText("Ordenar"), { target: { value: "title" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RATING_FILTERS, sort: "title" });
    fireEvent.change(screen.getByLabelText("Agrupar"), { target: { value: "none" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RATING_FILTERS, group: "none" });
  });

  it("el buscador avisa lo que se escribe", () => {
    const { onSearchInput } = renderToolbar();
    fireEvent.change(screen.getByLabelText("Buscar en tus valoraciones"), { target: { value: "floyd" } });
    expect(onSearchInput).toHaveBeenCalledWith("floyd");
  });

  it("la década se deshabilita cuando hay un año elegido", () => {
    renderToolbar({ ...EMPTY_RATING_FILTERS, year: "1987" });
    expect((screen.getByLabelText("Década") as HTMLSelectElement).disabled).toBe(true);
  });

  it("'Limpiar filtros' aparece solo con filtros activos", () => {
    const inactive = renderToolbar();
    expect(screen.queryByText("Limpiar filtros")).toBeNull();
    inactive.unmount();
    const { onClear } = renderToolbar({ ...EMPTY_RATING_FILTERS, group: "none" });
    fireEvent.click(screen.getByText("Limpiar filtros"));
    expect(onClear).toHaveBeenCalled();
  });
});

describe("ratingFiltersActive", () => {
  it("es falso con los valores por defecto y verdadero con cualquier desvío", () => {
    expect(ratingFiltersActive(EMPTY_RATING_FILTERS)).toBe(false);
    expect(ratingFiltersActive({ ...EMPTY_RATING_FILTERS, q: "  " })).toBe(false);
    expect(ratingFiltersActive({ ...EMPTY_RATING_FILTERS, q: "a" })).toBe(true);
    expect(ratingFiltersActive({ ...EMPTY_RATING_FILTERS, sort: "recent" })).toBe(true);
    expect(ratingFiltersActive({ ...EMPTY_RATING_FILTERS, group: "none" })).toBe(true);
    expect(ratingFiltersActive({ ...EMPTY_RATING_FILTERS, decade: "1980" })).toBe(true);
  });
});
