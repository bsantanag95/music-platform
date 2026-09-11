import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
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

  it("al elegir un tipo navega con el parámetro type", () => {
    renderWithIntl(<CommunityListsToolbar />);

    fireEvent.change(screen.getByLabelText("Filtrar por tipo"), {
      target: { value: "artist" },
    });

    expect(nav.replace).toHaveBeenCalledWith("/lists?type=artist", { scroll: false });
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

  it("limpiar filtros navega a la ruta sin parámetros", () => {
    nav.search = new URLSearchParams("q=hola&type=artist");
    renderWithIntl(<CommunityListsToolbar />);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(nav.replace).toHaveBeenCalledWith("/lists", { scroll: false });
  });
});
