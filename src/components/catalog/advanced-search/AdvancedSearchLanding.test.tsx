import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../messages/es/catalog.json";
import { AdvancedSearchLanding, RecordAdvancedSearch } from "./AdvancedSearchLanding";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const labels = catalogEs.search.advanced;

// El entorno de test no expone un localStorage funcional: uno en memoria por prueba.
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage;
}

describe("AdvancedSearchLanding (openspec: refine-advanced-search-phase2)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
  });

  it("tres ejemplos de la pestaña, con sus criterios y su búsqueda", () => {
    renderWithIntl(<AdvancedSearchLanding type="artist" />);
    const link = screen.getByRole("link", { name: new RegExp(labels.examples.chileanBands80s) });
    expect(link).toHaveAttribute(
      "href",
      "/search/advanced?type=artist&artistType=group&country=CL&beginFrom=1980&beginTo=1989",
    );
    expect(link).toHaveTextContent("Grupo · Chile · Inicio 1980–1989");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    // Sin recientes, sin su bloque.
    expect(screen.queryByText(labels.recentTitle)).not.toBeInTheDocument();
  });

  it("registra las búsquedas mostradas y las ofrece como recientes, que se pueden quitar", () => {
    const href = "/search/advanced?type=album&artist=Pink+Floyd&yearFrom=1970&yearTo=1979";
    render(<RecordAdvancedSearch href={href} />);
    render(<RecordAdvancedSearch href={href} />);

    renderWithIntl(<AdvancedSearchLanding type="song" />);
    const recent = screen.getByRole("link", { name: /Artista: Pink Floyd · Año 1970–1979/ });
    expect(recent).toHaveAttribute("href", href);

    fireEvent.click(screen.getByRole("button", { name: labels.recentRemove }));
    expect(screen.queryByText(labels.recentTitle)).not.toBeInTheDocument();
    expect(window.localStorage.getItem("mp:advanced-recent-searches")).toBe("[]");
  });

  it("con el almacenamiento bloqueado, la página sigue funcionando", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("bloqueado");
      },
    });
    renderWithIntl(<AdvancedSearchLanding type="album" />);
    expect(screen.getByText(labels.examples.live1994)).toBeInTheDocument();
  });
});
