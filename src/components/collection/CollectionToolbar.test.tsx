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

  it("oculta en Ordenar la opción que coincide con el Agrupar activo (por defecto: Por artista)", () => {
    renderWithIntl(<Harness />);
    const sortSelect = screen.getByLabelText("Ordenar") as HTMLSelectElement;
    const optionValues = Array.from(sortSelect.options).map((o) => o.value);
    expect(optionValues).toEqual(["recent", "alpha", "format"]);
  });

  it("al agrupar por formato, resetea Ordenar a Recientes si estaba en Por formato", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    renderWithIntl(<Harness onValue={onValue} />);

    // Por defecto se agrupa por artista, así que "Por formato" sigue
    // disponible en Ordenar en este punto.
    await user.selectOptions(screen.getByLabelText("Ordenar"), "format");
    expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "format", group: "artist" }));

    await user.selectOptions(screen.getByLabelText("Agrupar"), "format");
    expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "recent", group: "format" }));
  });
});
