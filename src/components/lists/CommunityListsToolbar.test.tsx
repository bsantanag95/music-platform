import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithIntl, withIntl } from "@/test/i18n-test-utils";
import { CommunityListsToolbar } from "./CommunityListsToolbar";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/lists",
  search: new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.search,
}));

describe("CommunityListsToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.search = new URLSearchParams();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("el tipo se elige con chips: navega con el parámetro type y marca el chip (redesign-lists-page, D8)", () => {
    const { unmount } = renderWithIntl(<CommunityListsToolbar />);
    const group = screen.getByRole("group", { name: "Filtrar por tipo" });
    expect([...group.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Todas", "Artistas", "Álbumes", "Canciones"]);
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Artistas" }));
    expect(nav.replace).toHaveBeenCalledWith("/lists?type=artist", { scroll: false });
    unmount();

    nav.search = new URLSearchParams("type=artist");
    renderWithIntl(<CommunityListsToolbar />);
    expect(screen.getByRole("button", { name: "Artistas" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/lists", { scroll: false });
  });

  it("debouncea la búsqueda y navega con q", () => {
    vi.useFakeTimers();
    renderWithIntl(<CommunityListsToolbar />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "pink" } });
    expect(nav.replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(nav.replace).toHaveBeenCalledWith("/lists?q=pink", { scroll: false });
  });

  it("en la vitrina el orden dice «Ordenar» sin valor; con filtros muestra el orden efectivo (redesign-lists-page, D4)", () => {
    const { unmount } = renderWithIntl(<CommunityListsToolbar />);
    const sort = screen.getByRole("combobox", { name: "Ordenar" }) as HTMLSelectElement;
    expect(sort.value).toBe("");
    expect(sort.selectedOptions[0]?.textContent).toBe("Ordenar");
    unmount();

    nav.search = new URLSearchParams("q=hola");
    renderWithIntl(<CommunityListsToolbar />);
    expect((screen.getByRole("combobox", { name: "Ordenar" }) as HTMLSelectElement).value).toBe("recent");
  });

  it("el orden por guardados se llama «Más guardadas» y escribe sort=popular", () => {
    renderWithIntl(<CommunityListsToolbar />);
    const sort = screen.getByRole("combobox", { name: "Ordenar" });
    expect(screen.getByRole("option", { name: "Más guardadas" })).toBeInTheDocument();

    fireEvent.change(sort, { target: { value: "popular" } });

    expect(nav.replace).toHaveBeenCalledWith("/lists?sort=popular", { scroll: false });
  });

  it("si la URL pierde el texto por fuera (Limpiar filtros), el buscador se vacía y no lo vuelve a escribir", () => {
    vi.useFakeTimers();
    nav.search = new URLSearchParams("q=hola");
    const { rerender } = renderWithIntl(<CommunityListsToolbar />);
    expect(screen.getByRole("searchbox")).toHaveValue("hola");

    nav.search = new URLSearchParams();
    rerender(withIntl(<CommunityListsToolbar />));
    vi.advanceTimersByTime(400);

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(nav.replace).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
