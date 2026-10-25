import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import {
  CollectionToolbar,
  EMPTY_COLLECTION_FILTERS,
  type CollectionFiltersState,
} from "./CollectionToolbar";

// Arnés controlado: mantiene el valor en estado como lo haría el consumidor real.
function Harness({ onValue }: { onValue?: (value: CollectionFiltersState) => void }) {
  const [filters, setFilters] = useState<CollectionFiltersState>(EMPTY_COLLECTION_FILTERS);
  return (
    <CollectionToolbar
      filters={filters}
      onChange={(next) => {
        setFilters(next);
        onValue?.(next);
      }}
      searchInput=""
      onSearchInput={() => {}}
      onClear={() => {}}
    />
  );
}

describe("CollectionToolbar", () => {
  it("Agrupar aparece antes que Ordenar, cada uno con su etiqueta visible", () => {
    renderWithIntl(<Harness />);
    const labels = screen.getAllByText(/^(Agrupar|Ordenar)$/);
    expect(labels.map((el) => el.textContent)).toEqual(["Agrupar", "Ordenar"]);
  });

  it("por defecto no agrupa y ofrece los cuatro órdenes", () => {
    renderWithIntl(<Harness />);
    expect((screen.getByLabelText("Agrupar") as HTMLSelectElement).value).toBe("none");
    const sortSelect = screen.getByLabelText("Ordenar") as HTMLSelectElement;
    expect(Array.from(sortSelect.options).map((o) => o.value)).toEqual(["recent", "alpha", "artist", "format"]);
  });

  it("oculta en Ordenar la opción que coincide con el Agrupar activo", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.selectOptions(screen.getByLabelText("Agrupar"), "artist");
    const sortSelect = screen.getByLabelText("Ordenar") as HTMLSelectElement;
    expect(Array.from(sortSelect.options).map((o) => o.value)).toEqual(["recent", "alpha", "format"]);
  });

  it("el botón Filtros dice cuántos filtros ocultables hay activos y despliega el panel", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    const button = screen.getByRole("button", { name: "Filtros" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.selectOptions(screen.getByLabelText("Edición"), "signed");
    await user.selectOptions(screen.getByLabelText("Ordenar"), "alpha");
    expect(screen.getByRole("button", { name: "Filtros 2" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Filtros 2" }));
    expect(screen.getByRole("button", { name: "Filtros 2" })).toHaveAttribute("aria-expanded", "true");
  });

  it("al agrupar por formato, resetea Ordenar a Recientes si estaba en Por formato", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    renderWithIntl(<Harness onValue={onValue} />);

    // Por defecto no se agrupa, así que "Por formato" está disponible en Ordenar.
    await user.selectOptions(screen.getByLabelText("Ordenar"), "format");
    expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "format", group: "none" }));

    await user.selectOptions(screen.getByLabelText("Agrupar"), "format");
    expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "recent", group: "format" }));
  });
});
