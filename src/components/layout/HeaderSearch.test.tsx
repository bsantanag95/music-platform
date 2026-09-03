import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { HeaderSearch } from "./HeaderSearch";
import * as catalogApi from "@/lib/api/catalog";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";

const mockPush = vi.fn();

vi.mock("@/lib/api/catalog", () => ({
  searchCatalog: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("HeaderSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navega siempre a /search?q= con el texto normalizado", () => {
    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.change(input, { target: { value: "  Poison  " } });
    fireEvent.submit(input.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/search?q=Poison");
  });

  it("no resuelve a un artista aunque el nombre exista: mismo destino /search?q=", () => {
    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.change(input, { target: { value: "Pink Floyd" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/search?q=Pink%20Floyd");
    expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
  });

  it("no realiza ninguna solicitud ni navegación con input vacío", () => {
    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.submit(input.closest("form")!);

    expect(catalogApi.searchCatalog).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("tampoco navega con solo espacios", () => {
    renderWithIntl(<HeaderSearch />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
