import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SearchForm } from "@/components/catalog/SearchForm";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";

const mockPush = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api/catalog", () => ({ getSearchSuggestions: vi.fn(async () => ({ suggestions: [] })) }));
vi.mock("@/lib/search/recent-searches", () => ({ pushRecentSearch: vi.fn() }));

const labels = catalogEs.search.advanced;

function toggle() {
  return screen.getByRole("button", { name: new RegExp(`^${labels.toggle}`) });
}

/** El panel que controla el botón (cerrado sigue en el DOM, oculto). */
function panel() {
  return document.getElementById(toggle().getAttribute("aria-controls")!)!;
}

describe("Búsqueda avanzada en /search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("el botón abre y cierra el panel y anuncia su estado", () => {
    renderWithIntl(<SearchForm initialType="album" initialQuery="maiden" />);

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(panel()).toHaveAttribute("aria-label", labels.panelLabel);
    expect(panel()).not.toBeVisible();

    fireEvent.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(panel()).toBeVisible();
    expect(screen.getByLabelText(labels.artist)).toBeInTheDocument();
  });

  it("con filtros activos muestra el contador y arranca abierto con sus valores", () => {
    renderWithIntl(
      <SearchForm initialType="artist" initialQuery="sumo" filters={{ country: "AR", beginFrom: 1980 }} />,
    );

    expect(toggle()).toHaveTextContent("Filtros · 2");
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(labels.from)).toHaveValue("1980");
  });

  it("filters=1 abre el panel sin contar como filtro", () => {
    renderWithIntl(<SearchForm initialType="song" initialQuery="hallelujah" panelOpen />);

    expect(toggle()).toHaveTextContent(new RegExp(`^${labels.toggle}$`));
    expect(panel()).toBeVisible();
  });

  it("aplicar navega solo con los campos con valor, la duración en segundos y las pastillas", () => {
    renderWithIntl(<SearchForm initialType="song" initialQuery="hallelujah" panelOpen pillParams={{}} />);

    fireEvent.change(screen.getByLabelText(labels.artist), { target: { value: " jeff buckley " } });
    fireEvent.change(screen.getByLabelText(labels.durMax), { target: { value: "7:00" } });
    fireEvent.click(screen.getByRole("button", { name: labels.apply }));

    expect(mockPush).toHaveBeenCalledWith("/search?type=song&q=hallelujah&artist=jeff+buckley&durMax=420");
  });

  it("aplicar conserva la categoría y quita la década", () => {
    renderWithIntl(
      <SearchForm initialType="album" initialQuery="maiden" panelOpen pillParams={{ category: "studio" }} />,
    );

    fireEvent.change(screen.getAllByLabelText(labels.from)[0]!, { target: { value: "1983" } });
    fireEvent.click(screen.getByRole("button", { name: labels.apply }));

    expect(mockPush).toHaveBeenCalledWith("/search?type=album&q=maiden&category=studio&yearFrom=1983");
  });

  it("un nuevo envío del mismo tipo conserva los filtros", () => {
    renderWithIntl(<SearchForm initialType="album" initialQuery="maiden" filters={{ yearFrom: 1983 }} />);

    fireEvent.change(screen.getByLabelText(catalogEs.search.fieldLabel), { target: { value: "iron maiden" } });
    fireEvent.click(screen.getByRole("button", { name: catalogEs.search.submit }));

    expect(mockPush).toHaveBeenCalledWith("/search?type=album&q=iron+maiden&yearFrom=1983");
  });

  it("Usuarios no tiene botón de filtros", () => {
    renderWithIntl(<SearchForm initialType="user" initialQuery="ana" />);

    expect(screen.queryByRole("button", { name: new RegExp(`^${labels.toggle}`) })).not.toBeInTheDocument();
  });
});
