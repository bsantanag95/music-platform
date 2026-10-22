import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FavoritesWall } from "./FavoritesWall";
import { ApiError } from "@/lib/api/client";
import type { Favorite, FavoritesListResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  getMyFavorites: vi.fn(),
  getUserFavorites: vi.fn(),
  removeFavorite: vi.fn(),
  updateFavoriteAudience: vi.fn(),
  updateFavoritesAudienceBulk: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ priority }: { priority?: boolean }) => (
    <span data-testid="cover" data-priority={String(Boolean(priority))} />
  ),
}));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("@/lib/api/favorites", () => ({
  getMyFavorites: mocks.getMyFavorites,
  getUserFavorites: mocks.getUserFavorites,
  removeFavorite: mocks.removeFavorite,
  updateFavoriteAudience: mocks.updateFavoriteAudience,
  updateFavoritesAudienceBulk: mocks.updateFavoritesAudienceBulk,
}));

let seq = 0;
function fav(overrides: Partial<Favorite> = {}): Favorite {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    targetType: "artist",
    audience: "followers",
    createdAt: "2026-02-01T00:00:00.000Z",
    target: { id: `t${seq}`, title: `Objetivo ${seq}`, coverThumbUrl: null },
    ...overrides,
  };
}

function response(favorites: Favorite[], overrides: Partial<FavoritesListResponse> = {}): FavoritesListResponse {
  return {
    favorites,
    page: 1,
    pageSize: 20,
    hasNext: false,
    counts: { artist: 0, "release-group": 0, recording: 0 },
    facets: { audience: { private: 0, followers: 0, public: 0 } },
    ...overrides,
  };
}

function renderWall(initial: FavoritesListResponse, props: Partial<Parameters<typeof FavoritesWall>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <FavoritesWall initial={initial} {...props} />
    </QueryClientProvider>,
  ) as unknown as ReactElement;
}

describe("FavoritesWall", () => {
  beforeEach(() => {
    seq = 0;
    vi.clearAllMocks();
    mocks.getMyFavorites.mockResolvedValue(response([]));
    mocks.getUserFavorites.mockResolvedValue(response([]));
  });

  it("agrupa por tipo y muestra el encabezado con los conteos", () => {
    const artist = fav({ targetType: "artist" });
    const album = fav({ targetType: "release-group" });
    const song = fav({ targetType: "recording" });
    renderWall(
      response([artist, album, song], { counts: { artist: 1, "release-group": 1, recording: 1 } }),
    );

    expect(screen.getByRole("heading", { name: /Artistas/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Álbumes/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Canciones/ })).toBeInTheDocument();
    const header = screen.getByText("1 artista", { exact: false });
    expect(header).toHaveTextContent("1 artista · 1 álbum · 1 canción");
  });

  it("estado vacío real con CTA cuando no hay favoritos", () => {
    renderWall(response([]));
    expect(screen.getByText("Todavía no marcaste favoritos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar en el catálogo" })).toBeInTheDocument();
  });

  it("cambia la audiencia de una ficha de forma optimista", async () => {
    const target = fav({ targetType: "artist", audience: "followers" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.updateFavoriteAudience.mockResolvedValue({ ...target, audience: "public" });
    mocks.getMyFavorites.mockResolvedValue(response([{ ...target, audience: "public" }], { counts }));
    renderWall(response([target], { counts }));

    await userEvent.selectOptions(screen.getByLabelText("Audiencia"), "public");
    await waitFor(() =>
      expect(mocks.updateFavoriteAudience).toHaveBeenCalledWith(target.id, "public"),
    );
    expect((screen.getByLabelText("Audiencia") as HTMLSelectElement).value).toBe("public");
  });

  it("revierte el cambio de audiencia si la API falla", async () => {
    const target = fav({ targetType: "artist", audience: "followers" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.updateFavoriteAudience.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    mocks.getMyFavorites.mockResolvedValue(response([target], { counts }));
    renderWall(response([target], { counts }));

    await userEvent.selectOptions(screen.getByLabelText("Audiencia"), "private");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/No pudimos guardar/));
    expect((screen.getByLabelText("Audiencia") as HTMLSelectElement).value).toBe("followers");
  });

  it("modo selección: cambia la audiencia en lote y sale del modo", async () => {
    const a = fav({ targetType: "artist" });
    const b = fav({ targetType: "artist" });
    const counts = { artist: 2, "release-group": 0, recording: 0 };
    mocks.updateFavoritesAudienceBulk.mockResolvedValue([a.id, b.id]);
    mocks.getMyFavorites.mockResolvedValue(
      response([{ ...a, audience: "private" }, { ...b, audience: "private" }], { counts }),
    );
    renderWall(response([a, b], { counts }));

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    await userEvent.click(screen.getByRole("checkbox", { name: `Seleccionar ${a.target.title}` }));
    await userEvent.click(screen.getByRole("checkbox", { name: `Seleccionar ${b.target.title}` }));

    const bar = screen.getByText("Cambiar audiencia a").closest("div") as HTMLElement;
    await userEvent.click(within(bar).getByRole("button", { name: "Privado" }));

    await waitFor(() =>
      expect(mocks.updateFavoritesAudienceBulk).toHaveBeenCalledWith([a.id, b.id], "private"),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Listo" })).not.toBeInTheDocument(),
    );
  });

  it("modo lectura: muestra toolbar y encabezado de conteos, pero no el modo selección ni el filtro de audiencia", () => {
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    renderWall(response([fav({ targetType: "artist" })], { counts }), {
      readOnly: true,
      username: "ana",
    });
    expect(screen.getByPlaceholderText("Buscar en tus favoritos")).toBeInTheDocument();
    expect(screen.getByText("1 artista", { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filtrar por audiencia")).not.toBeInTheDocument();
  });

  it("modo propio: sí muestra el filtro de audiencia", () => {
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    renderWall(response([fav({ targetType: "artist" })], { counts }));
    expect(screen.getByLabelText("Filtrar por audiencia")).toBeInTheDocument();
  });

  it("modo lectura sin favoritos: usa el vacío de perfil, no el CTA de autogestión", () => {
    renderWall(response([]), { readOnly: true, username: "ana" });
    expect(screen.getByText("Sin favoritos")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buscar en el catálogo" })).not.toBeInTheDocument();
  });

  it("modo lectura: buscar reconsulta con getUserFavorites y el filtro aplicado", async () => {
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.getUserFavorites.mockResolvedValue(
      response([fav({ targetType: "artist", target: { id: "t9", title: "Radiohead", coverThumbUrl: null } })], {
        counts,
      }),
    );
    renderWall(response([fav({ targetType: "artist" })], { counts }), {
      readOnly: true,
      username: "ana",
    });

    await userEvent.type(screen.getByPlaceholderText("Buscar en tus favoritos"), "radio");
    await waitFor(() =>
      expect(mocks.getUserFavorites).toHaveBeenCalledWith("ana", 1, 20, { q: "radio" }),
    );
  });
  // openspec: refine-favorites-page-phase1

  it("con un filtro sin resultados cuenta resultados, no 'sin artistas · sin álbumes · sin canciones', y conserva el conmutador", async () => {
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.getMyFavorites.mockResolvedValue(response([], { counts: { artist: 0, "release-group": 0, recording: 0 } }));
    renderWall(response([fav({ targetType: "artist" })], { counts }));

    fireEvent.change(screen.getByPlaceholderText("Buscar en tus favoritos"), { target: { value: "zzz" } });

    expect(await screen.findByText("Ningún resultado")).toBeInTheDocument();
    expect(screen.queryByText(/sin artistas/)).not.toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar" })).not.toBeInTheDocument();
  });

  it("con filtro de tipo el total de resultados es el de ese tipo y conserva el desglose", () => {
    const counts = { artist: 1, "release-group": 12, recording: 3 };
    renderWall(response([fav({ targetType: "release-group" })], { counts }), { initialFilters: { type: "release-group" } });
    expect(screen.getByText("12 resultados").closest("p")).toHaveTextContent("12 resultados · 1 artista · 12 álbumes · 3 canciones");
  });

  it("solo ordenar no convierte la cabecera en 'resultados'", () => {
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    renderWall(response([fav({ targetType: "artist" })], { counts }), { initialFilters: { sort: "alpha" } });
    expect(screen.queryByText(/resultado/)).not.toBeInTheDocument();
    expect(screen.getByText("1 artista", { exact: false })).toBeInTheDocument();
  });

  it("sin favoritos y sin filtros no hay cabecera de conteo ni conmutador: el estado vacío lo dice", () => {
    renderWall(response([]));
    expect(screen.queryByText(/sin artistas/)).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByText("Todavía no marcaste favoritos")).toBeInTheDocument();
  });

  it("quitar un favorito lo anuncia", async () => {
    const target = fav({ targetType: "artist" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.removeFavorite.mockResolvedValue(null);
    mocks.getMyFavorites.mockResolvedValue(response([], { counts: { artist: 0, "release-group": 0, recording: 0 } }));
    renderWall(response([target], { counts }));

    await userEvent.click(screen.getByRole("button", { name: "Quitar favorito" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Favorito quitado"));
  });

  it("si falla quitar, el aviso aparece junto a la ficha afectada y la ficha vuelve", async () => {
    const a = fav({ targetType: "artist" });
    const b = fav({ targetType: "artist" });
    const counts = { artist: 2, "release-group": 0, recording: 0 };
    mocks.removeFavorite.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    mocks.getMyFavorites.mockResolvedValue(response([a, b], { counts }));
    renderWall(response([a, b], { counts }));

    await userEvent.click(screen.getAllByRole("button", { name: "Quitar favorito" })[0]!);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/No pudimos guardar/);
    expect(screen.getAllByRole("article")[0]).toContainElement(alert);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("el cambio de audiencia fallido también avisa junto a su ficha", async () => {
    const target = fav({ targetType: "artist", audience: "followers" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.updateFavoriteAudience.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    mocks.getMyFavorites.mockResolvedValue(response([target], { counts }));
    renderWall(response([target], { counts }));

    await userEvent.selectOptions(screen.getByLabelText("Audiencia"), "private");

    const alert = await screen.findByRole("alert");
    expect(screen.getByRole("article")).toContainElement(alert);
  });

  it("el muro no fija su propio ancho (lo fija la página) y bajo el encabezado omite el tipo", () => {
    const album = fav({ targetType: "release-group", target: { id: "a1", title: "Disco", coverThumbUrl: null } });
    const counts = { artist: 0, "release-group": 1, recording: 0 };
    const { container } = renderWall(response([album], { counts })) as unknown as { container: HTMLElement };
    expect((container.firstElementChild as HTMLElement).className).not.toContain("max-w-");
    expect(screen.getByRole("article")).not.toHaveTextContent("Álbum");
    expect(screen.getByRole("article").querySelector("time")).not.toBeNull();
  });

  it("modo Índice: sin columna de tipo y con las acciones a contraste normal", async () => {
    const album = fav({ targetType: "release-group", target: { id: "a1", title: "Disco", coverThumbUrl: null } });
    const counts = { artist: 0, "release-group": 1, recording: 0 };
    renderWall(response([album], { counts }));

    await userEvent.click(screen.getByRole("radio", { name: "Índice" }));

    const row = screen.getByRole("link", { name: /Disco/ }).closest("li") as HTMLElement;
    expect(row).not.toHaveTextContent("Álbum");
    const actions = within(row).getByRole("button", { name: "Quitar favorito" }).parentElement as HTMLElement;
    expect(actions.className).not.toContain("opacity-40");
  });

  it("las carátulas de los seis primeros favoritos se piden con prioridad", () => {
    const albums = Array.from({ length: 8 }, (_, n) =>
      fav({ targetType: "release-group", target: { id: `a${n}`, title: `Disco ${n}`, coverThumbUrl: "c.jpg" } }),
    );
    renderWall(response(albums, { counts: { artist: 0, "release-group": 8, recording: 0 } }));
    expect(screen.getAllByTestId("cover").map((cover) => cover.getAttribute("data-priority"))).toEqual([
      "true", "true", "true", "true", "true", "true", "false", "false",
    ]);
  });

  it("los controles llevan las clases táctiles de 44 px y las casillas de 24 px", async () => {
    const target = fav({ targetType: "artist" });
    renderWall(response([target], { counts: { artist: 1, "release-group": 0, recording: 0 } }));
    expect(screen.getByLabelText("Audiencia").className).toContain("[@media(pointer:coarse)]:min-h-11");
    expect(screen.getByRole("button", { name: "Quitar favorito" }).className).toContain("[@media(pointer:coarse)]:min-h-11");
    expect(screen.getByRole("button", { name: "Seleccionar" }).className).toContain("[@media(pointer:coarse)]:min-h-11");
    expect(screen.getByRole("radio", { name: "Índice" }).className).toContain("[@media(pointer:coarse)]:min-h-11");

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(screen.getByRole("checkbox").className).toContain("[@media(pointer:coarse)]:size-6");
  });

  it("ya no hay selectores de tipo ni de audiencia: solo queda el de orden, con su nombre visible", () => {
    renderWall(response([fav({ targetType: "artist" })], { counts: { artist: 1, "release-group": 0, recording: 0 } }));
    expect(screen.queryByLabelText("Filtrar por tipo", { selector: "select" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filtrar por audiencia", { selector: "select" })).not.toBeInTheDocument();
    const sort = screen.getByLabelText("Ordenar");
    expect(sort.tagName).toBe("SELECT");
    expect(screen.getAllByText("Ordenar").some((node) => node.tagName === "SPAN" && node.getAttribute("aria-hidden") === "true")).toBe(true);
  });
  // openspec: redesign-favorites-summary-toolbar

  const FACET = { audience: { private: 1, followers: 2, public: 3 } };
  const COUNTS = { artist: 2, "release-group": 3, recording: 1 };
  const seg = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) });

  it("los segmentos de tipo muestran la cantidad de cada uno y 'Todo' es la suma", () => {
    renderWall(response([fav({ targetType: "artist" })], { counts: COUNTS, facets: FACET }));
    const group = screen.getByRole("group", { name: "Filtrar por tipo" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Todo6",
      "Artistas2",
      "Álbumes3",
      "Canciones1",
    ]);
    expect(seg("Todo")).toHaveAttribute("aria-pressed", "true");
  });

  it("pulsar un segmento filtra por ese tipo; el activo no se desactiva y 'Todo' lo quita", async () => {
    mocks.getMyFavorites.mockResolvedValue(response([fav({ targetType: "recording" })], { counts: COUNTS, facets: FACET }));
    renderWall(response([fav({ targetType: "artist" })], { counts: COUNTS, facets: FACET }));

    await userEvent.click(seg("Canciones"));
    await waitFor(() => expect(mocks.getMyFavorites).toHaveBeenCalledWith(1, 20, { type: "recording" }));
    expect(seg("Canciones")).toHaveAttribute("aria-pressed", "true");

    mocks.getMyFavorites.mockClear();
    await userEvent.click(seg("Canciones"));
    expect(mocks.getMyFavorites).not.toHaveBeenCalled();

    // Volver a "Todo" reutiliza la caché de la consulta inicial: no hace falta otra petición.
    await userEvent.click(seg("Todo"));
    await waitFor(() => expect(seg("Todo")).toHaveAttribute("aria-pressed", "true"));
    expect(seg("Canciones")).toHaveAttribute("aria-pressed", "false");
    expect(window.location.search).toBe("");
  });

  it("las fichas de audiencia muestran el reparto y filtran; pulsar la activa la quita", async () => {
    mocks.getMyFavorites.mockResolvedValue(response([fav({ audience: "private" })], { counts: COUNTS, facets: FACET }));
    renderWall(response([fav({ targetType: "artist" })], { counts: COUNTS, facets: FACET }));
    const group = screen.getByRole("group", { name: "Filtrar por audiencia" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Público3", "Seguidores2", "Privado1"]);

    await userEvent.click(within(group).getByRole("button", { name: /^Privado/ }));
    await waitFor(() => expect(mocks.getMyFavorites).toHaveBeenCalledWith(1, 20, { audience: "private" }));
    expect(within(group).getByRole("button", { name: /^Privado/ })).toHaveAttribute("aria-pressed", "true");
    // La faceta ignora su propio filtro: las demás fichas conservan su cantidad.
    expect(within(group).getByRole("button", { name: /^Público/ })).toHaveTextContent("3");

    await userEvent.click(within(group).getByRole("button", { name: /^Privado/ }));
    await waitFor(() => expect(within(group).getByRole("button", { name: /^Privado/ })).toHaveAttribute("aria-pressed", "false"));
    expect(window.location.search).toBe("");
  });

  it("cambiar la audiencia de una ficha mueve la cantidad entre fichas, sin recargar la lista", async () => {
    const target = fav({ targetType: "artist", audience: "followers" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.updateFavoriteAudience.mockResolvedValue({ ...target, audience: "public" });
    // El refetch devuelve la misma lista: el ajuste local ya movió las cantidades.
    mocks.getMyFavorites.mockResolvedValue(
      response([{ ...target, audience: "public" }], { counts, facets: { audience: { private: 0, followers: 0, public: 1 } } }),
    );
    renderWall(response([target], { counts, facets: { audience: { private: 0, followers: 1, public: 0 } } }));

    await userEvent.selectOptions(screen.getByLabelText("Audiencia"), "public");

    const group = screen.getByRole("group", { name: "Filtrar por audiencia" });
    await waitFor(() => expect(within(group).getByRole("button", { name: /^Público/ })).toHaveTextContent("1"));
    expect(within(group).getByRole("button", { name: /^Seguidores/ })).toHaveTextContent("0");
  });

  it("quitar un favorito baja su cubo de audiencia y su segmento de tipo", async () => {
    const target = fav({ targetType: "release-group", audience: "public" });
    const counts = { artist: 0, "release-group": 1, recording: 0 };
    mocks.removeFavorite.mockResolvedValue(null);
    mocks.getMyFavorites.mockResolvedValue(
      response([], { counts: { artist: 0, "release-group": 0, recording: 0 }, facets: { audience: { private: 0, followers: 0, public: 0 } } }),
    );
    renderWall(response([target], { counts, facets: { audience: { private: 0, followers: 0, public: 1 } } }));

    await userEvent.click(screen.getByRole("button", { name: "Quitar favorito" }));

    await waitFor(() => expect(seg("Álbumes")).toHaveTextContent("0"));
    expect(within(screen.getByRole("group", { name: "Filtrar por audiencia" })).getByRole("button", { name: /^Público/ })).toHaveTextContent("0");
  });

  it("con un filtro de audiencia, sacar una ficha del filtro baja el segmento de su tipo", async () => {
    const target = fav({ targetType: "artist", audience: "public" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.updateFavoriteAudience.mockResolvedValue({ ...target, audience: "private" });
    // El servidor, al refrescar, ya no trae la ficha dentro del filtro "Público".
    mocks.getMyFavorites.mockResolvedValue(
      response([], { counts: { artist: 0, "release-group": 0, recording: 0 }, facets: { audience: { private: 1, followers: 0, public: 0 } } }),
    );
    renderWall(response([target], { counts, facets: { audience: { private: 0, followers: 0, public: 1 } } }), {
      initialFilters: { audience: "public" },
    });

    await userEvent.selectOptions(screen.getByLabelText("Audiencia"), "private");

    await waitFor(() => expect(seg("Artistas")).toHaveTextContent("0"));
  });

  it("modo lectura: hay segmentos de tipo pero ninguna ficha de audiencia", () => {
    renderWall(response([fav({ targetType: "artist" })], { counts: COUNTS, facets: undefined }), { readOnly: true, username: "ana" });
    expect(screen.getByRole("group", { name: "Filtrar por tipo" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtrar por audiencia" })).not.toBeInTheDocument();
  });

  it("segmentos y fichas llevan las clases táctiles de 44 px", () => {
    renderWall(response([fav({ targetType: "artist" })], { counts: COUNTS, facets: FACET }));
    for (const button of [
      ...within(screen.getByRole("group", { name: "Filtrar por tipo" })).getAllByRole("button"),
      ...within(screen.getByRole("group", { name: "Filtrar por audiencia" })).getAllByRole("button"),
    ]) {
      expect(button.className).toContain("[@media(pointer:coarse)]:min-h-11");
    }
  });
});
