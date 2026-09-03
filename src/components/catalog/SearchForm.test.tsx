import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { SearchForm } from "@/components/catalog/SearchForm";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";

const mockPush = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("SearchForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expone un label asociado al campo", () => {
    renderWithIntl(<SearchForm />);
    expect(screen.getByLabelText(catalogEs.search.fieldLabel)).toBeInTheDocument();
  });

  it("al enviar navega a /search?q= con el texto normalizado", () => {
    renderWithIntl(<SearchForm />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.change(input, { target: { value: "  Pink Floyd  " } });
    fireEvent.click(screen.getByRole("button", { name: catalogEs.search.submit }));

    expect(mockPush).toHaveBeenCalledWith("/search?q=Pink%20Floyd");
  });

  it("no navega con entrada vacía y muestra validación local", () => {
    renderWithIntl(<SearchForm />);

    fireEvent.click(screen.getByRole("button", { name: catalogEs.search.submit }));

    expect(
      screen.getByText(catalogEs.search.validationEmpty),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("no navega con solo espacios", () => {
    renderWithIntl(<SearchForm />);

    fireEvent.change(screen.getByLabelText(catalogEs.search.fieldLabel), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: catalogEs.search.submit }));

    expect(
      screen.getByText(catalogEs.search.validationEmpty),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("relaciona el mensaje de validación con el campo (aria)", () => {
    renderWithIntl(<SearchForm />);

    const input = screen.getByLabelText(catalogEs.search.fieldLabel);
    fireEvent.click(screen.getByRole("button", { name: catalogEs.search.submit }));

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", `${input.id}-error`);
  });

  it("prellena el campo con initialQuery sin ejecutar ninguna navegación", () => {
    renderWithIntl(<SearchForm initialQuery="Radiohead" />);

    expect(screen.getByLabelText(catalogEs.search.fieldLabel)).toHaveValue(
      "Radiohead",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
