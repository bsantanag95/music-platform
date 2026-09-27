import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { HeaderSearch } from "./HeaderSearch";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";

const mockPush = vi.fn();

vi.mock("@/lib/api/catalog", () => ({
  getSearchSuggestions: vi.fn(async () => ({ suggestions: [] })),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function field() {
  return screen.getByRole("combobox", { name: catalogEs.search.fieldLabel }) as HTMLInputElement;
}

// El comportamiento completo del buscador (selector, sugerencias, teclado)
// está en ScopedSearchField.test.tsx; acá, lo propio del Header.
describe("HeaderSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navega siempre a /search con tipo Artistas y el texto normalizado", () => {
    renderWithIntl(<HeaderSearch />);

    fireEvent.change(field(), { target: { value: "  Poison  " } });
    fireEvent.submit(field().closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/search?type=artist&q=Poison");
  });

  it("no resuelve a un artista aunque el nombre exista: el destino es /search", () => {
    renderWithIntl(<HeaderSearch />);

    fireEvent.change(field(), { target: { value: "Pink Floyd" } });
    fireEvent.submit(field().closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/search?type=artist&q=Pink+Floyd");
  });

  it("no navega con input vacío ni con solo espacios", () => {
    renderWithIntl(<HeaderSearch />);

    fireEvent.submit(field().closest("form")!);
    fireEvent.change(field(), { target: { value: "   " } });
    fireEvent.submit(field().closest("form")!);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("vacía el campo tras buscar, para no arrastrar el texto a otras secciones", () => {
    renderWithIntl(<HeaderSearch />);

    fireEvent.change(field(), { target: { value: "Poison" } });
    fireEvent.submit(field().closest("form")!);

    expect(field().value).toBe("");
  });
});
