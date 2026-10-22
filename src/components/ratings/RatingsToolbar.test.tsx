import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import {
  EMPTY_RATING_FILTERS,
  RatingsToolbar,
  ratingFiltersActive,
  ratingScopeNarrowed,
  type RatingsFiltersState,
} from "./RatingsToolbar";

function renderToolbar(filters: RatingsFiltersState = EMPTY_RATING_FILTERS, hideClear = false) {
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
      typeCounts={{ "release-group": 12, recording: 3 }}
      hideClear={hideClear}
    />,
  );
  return { onChange, onSearchInput, onClear, unmount: view.unmount };
}

describe("RatingsToolbar", () => {
  it("el filtro de tipo son tres segmentos con su cantidad (los artistas no se valoran)", () => {
    renderToolbar();
    const group = screen.getByRole("group", { name: "Tipo" });
    expect([...group.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["Todo15", "Álbumes12", "Canciones3"]);
  });

  it("el selector de agrupar ofrece por tipo, por artista y sin agrupar", () => {
    renderToolbar();
    const select = screen.getByLabelText("Agrupar") as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(["type", "artist", "none"]);
    expect([...select.options].map((option) => option.textContent)).toEqual(["Por tipo", "Por artista", "Sin agrupar"]);
  });

  it("cada selector muestra su nombre de forma visible, no solo al abrirlo", () => {
    renderToolbar();
    for (const name of ["Año", "Década", "Ordenar", "Agrupar"]) {
      const visible = screen.getAllByText(name).find((node) => node.tagName === "SPAN");
      expect(visible, name).toBeTruthy();
      expect(visible!.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("cada control emite el cambio con el resto del estado intacto", () => {
    const { onChange } = renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: /^Canciones/ }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RATING_FILTERS, type: "recording" });
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

describe("RatingsToolbar · un solo 'Limpiar filtros'", () => {
  it("con hideClear no muestra el botón aunque haya filtros activos", () => {
    renderToolbar({ ...EMPTY_RATING_FILTERS, stars: "1" }, true);
    expect(screen.queryByText("Limpiar filtros")).toBeNull();
  });
});

describe("ratingScopeNarrowed", () => {
  it("solo cuenta búsqueda y filtros, no el orden ni la agrupación", () => {
    expect(ratingScopeNarrowed(EMPTY_RATING_FILTERS)).toBe(false);
    expect(ratingScopeNarrowed({ ...EMPTY_RATING_FILTERS, sort: "worst" })).toBe(false);
    expect(ratingScopeNarrowed({ ...EMPTY_RATING_FILTERS, group: "artist" })).toBe(false);
    expect(ratingScopeNarrowed({ ...EMPTY_RATING_FILTERS, q: "  " })).toBe(false);
    for (const patch of [{ q: "a" }, { stars: "5" }, { type: "recording" }, { year: "1987" }, { decade: "1980" }]) {
      expect(ratingScopeNarrowed({ ...EMPTY_RATING_FILTERS, ...patch })).toBe(true);
    }
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
