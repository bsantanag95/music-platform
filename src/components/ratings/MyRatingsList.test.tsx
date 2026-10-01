import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import catalogEs from "../../../messages/es/catalog.json";
import { MyRatingsList } from "./MyRatingsList";
import type { MyRatingEntry, MyRatingsListResponse } from "@/lib/api/schemas";

// openspec: add-my-ratings-library (design D4–D7).

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const mocks = vi.hoisted(() => ({
  getMyRatings: vi.fn(),
  getRatings: vi.fn(),
  deleteRating: vi.fn(),
  saveRating: vi.fn(),
  highlightRating: vi.fn(),
  unhighlightRating: vi.fn(),
}));
vi.mock("@/lib/api/ratings", () => ({ getMyRatings: mocks.getMyRatings }));
vi.mock("@/lib/api/social", () => ({
  getRatings: mocks.getRatings,
  deleteRating: mocks.deleteRating,
  saveRating: mocks.saveRating,
  highlightRating: mocks.highlightRating,
  unhighlightRating: mocks.unhighlightRating,
}));

const t = ratingsEs;
const detail = catalogEs.album.relation.detail;

function uuid(n: number) {
  return `550e8400-e29b-41d4-a716-4466554400${String(n).padStart(2, "0")}`;
}

function entry(n: number, title: string, stars: number, detailedScore: number | null, year = 1987): MyRatingEntry {
  return {
    id: uuid(n),
    targetType: "release-group",
    stars,
    detailedScore,
    updatedAt: "2026-10-01T10:00:00.000Z",
    target: { id: uuid(n + 50), title, coverThumbUrl: null, artistName: "Heart", artistId: uuid(90), year },
  };
}

function page(items: MyRatingEntry[], overrides: Partial<MyRatingsListResponse> = {}): MyRatingsListResponse {
  return {
    items,
    page: 1,
    pageSize: 20,
    hasNext: false,
    total: items.length,
    facets: { years: [2012, 1987] },
    ...overrides,
  };
}

const safe = entry(1, "Safe and Sound", 5, 99, 2012);
const bad = entry(2, "Bad Animals", 4.5, 86);
const girl = entry(3, "There’s the Girl", 3, null);

function renderList(initial: MyRatingsListResponse, initialFilters?: Parameters<typeof MyRatingsList>[0]["initialFilters"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <MyRatingsList initial={initial} initialFilters={initialFilters} />
    </QueryClientProvider>,
  );
}

const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;
const titles = () => screen.getAllByRole("article").map((row) => row.querySelector("a")?.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/es/me/ratings");
});

describe("MyRatingsList", () => {
  it("muestra el total y una fila por valoración, en el orden recibido", () => {
    renderList(page([safe, bad, girl]));
    expect(screen.getByText("3 valoraciones")).toBeInTheDocument();
    expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]);
    expect(screen.getByRole("button", { name: "99/100" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.untunedAction })).toHaveTextContent(t.untuned);
    expect(mocks.getMyRatings).not.toHaveBeenCalled();
  });

  it("sin valoraciones dice que está vacío y enlaza a Explorar", () => {
    renderList(page([], { facets: { years: [] } }));
    expect(screen.getByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText("Sin valoraciones")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.emptyCta })).toHaveAttribute("href", "/search");
    expect(screen.queryByRole("button", { name: t.clearFilters })).not.toBeInTheDocument();
  });

  it("el selector de año ofrece solo los años con valoraciones", () => {
    renderList(page([safe, bad]));
    const years = Array.from(select(t.yearFilterLabel).options).map((option) => option.value);
    expect(years).toEqual(["", "2012", "1987"]);
  });

  it("las opciones de orden son mejor nota, peor nota, más reciente y título", () => {
    renderList(page([safe]));
    expect(Array.from(select(t.sortLabel).options).map((option) => option.textContent)).toEqual([
      t.sortBest,
      t.sortWorst,
      t.sortRecent,
      t.sortTitle,
    ]);
    expect(select(t.sortLabel)).toHaveValue("best");
  });

  it("cambiar el orden pide la lista con ese orden y lo refleja en la URL", async () => {
    mocks.getMyRatings.mockResolvedValue(page([girl, bad, safe]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(select(t.sortLabel), { target: { value: "worst" } });

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 20, expect.objectContaining({ sort: "worst" })));
    await waitFor(() => expect(titles()).toEqual(["There’s the Girl", "Bad Animals", "Safe and Sound"]));
    expect(window.location.search).toBe("?sort=worst");
  });

  it("filtrar por año pide ese año, lo refleja en la URL y deshabilita la década", async () => {
    mocks.getMyRatings.mockResolvedValue(page([bad, girl]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(select(t.yearFilterLabel), { target: { value: "1987" } });

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(1, 20, expect.objectContaining({ year: 1987 })));
    await waitFor(() => expect(titles()).toEqual(["Bad Animals", "There’s the Girl"]));
    expect(window.location.search).toBe("?year=1987");
    expect(select(t.decadeFilterLabel)).toBeDisabled();
  });

  it("estrellas, tipo y década se combinan en una sola consulta", async () => {
    mocks.getMyRatings.mockResolvedValue(page([girl]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(select(t.starsFilterLabel), { target: { value: "3" } });
    fireEvent.change(select(t.typeFilterLabel), { target: { value: "release-group" } });
    fireEvent.change(select(t.decadeFilterLabel), { target: { value: "1980" } });

    await waitFor(() =>
      expect(mocks.getMyRatings).toHaveBeenLastCalledWith(
        1,
        20,
        expect.objectContaining({ stars: 3, type: "release-group", decade: 1980 }),
      ),
    );
    expect(window.location.search).toBe("?stars=3&type=release-group&decade=1980");
  });

  it("los filtros iniciales de la URL preseleccionan los controles", () => {
    renderList(page([bad, girl]), { year: 1987, sort: "recent" });
    expect(select(t.yearFilterLabel)).toHaveValue("1987");
    expect(select(t.sortLabel)).toHaveValue("recent");
    expect(select(t.decadeFilterLabel)).toBeDisabled();
    expect(mocks.getMyRatings).not.toHaveBeenCalled();
  });

  it("sin resultados con filtros ofrece limpiarlos y restaura la lista", async () => {
    mocks.getMyRatings.mockResolvedValueOnce(page([], { total: 0 })).mockResolvedValue(page([safe, bad, girl]));
    renderList(page([safe, bad, girl]));

    fireEvent.change(select(t.starsFilterLabel), { target: { value: "1" } });
    expect(await screen.findByText(t.noResultsTitle)).toBeInTheDocument();
    expect(screen.queryByText(t.emptyTitle)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: t.clearFilters })[0]!);

    await waitFor(() => expect(titles()).toHaveLength(3));
    expect(select(t.starsFilterLabel)).toHaveValue("");
    expect(screen.queryByRole("button", { name: t.clearFilters })).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("'Cargar más' pide la página siguiente, suma las filas y lo anuncia", async () => {
    mocks.getMyRatings.mockResolvedValue(page([girl], { page: 2, hasNext: false, total: 3 }));
    renderList(page([safe, bad], { hasNext: true, total: 3 }));

    fireEvent.click(screen.getByRole("button", { name: t.loadMore }));

    await waitFor(() => expect(mocks.getMyRatings).toHaveBeenCalledWith(2, 20, expect.any(Object)));
    await waitFor(() => expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]));
    expect(screen.queryByRole("button", { name: t.loadMore })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 valoración más cargada"));
  });

  it("un error al cargar muestra el aviso", async () => {
    mocks.getMyRatings.mockRejectedValue(new Error("red"));
    renderList(page([safe, bad]));

    fireEvent.change(select(t.sortLabel), { target: { value: "title" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadError);
  });

  it("borrar una valoración quita su fila, baja el total y lo anuncia", async () => {
    mocks.deleteRating.mockResolvedValue(null);
    mocks.getRatings.mockResolvedValue({ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } });
    renderList(page([safe, bad]));

    fireEvent.click(screen.getByRole("button", { name: "86/100" }));
    fireEvent.click(screen.getByRole("button", { name: detail.delete }));
    fireEvent.click(await screen.findByRole("button", { name: detail.deleteConfirm }));

    await waitFor(() => expect(titles()).toEqual(["Safe and Sound"]));
    expect(screen.getByText("1 valoración")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(t.deletedAnnouncement);
  });

  it("editar una fila no la reordena (queda en su lugar hasta reordenar o recargar)", async () => {
    mocks.saveRating.mockResolvedValue({});
    renderList(page([safe, bad, girl]));

    // 4,5★ · 86 → 5★ pasaría a competir con "Safe and Sound", pero la fila no se mueve.
    fireEvent.click(screen.getAllByRole("radio", { name: "5,0 estrellas" })[1]!);

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalled());
    // La fila editada perdió su puntaje (incoherente con 5★) y ahora es una de las dos "Sin afinar".
    await waitFor(() => expect(screen.getAllByRole("button", { name: t.untunedAction })).toHaveLength(2));
    expect(titles()).toEqual(["Safe and Sound", "Bad Animals", "There’s the Girl"]);
  });
});
