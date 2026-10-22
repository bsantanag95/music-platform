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
  addFavorite: vi.fn(),
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
  addFavorite: mocks.addFavorite,
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

// El menú de acciones (insignia + `⋯`) reemplaza al selector de audiencia y al botón "Quitar favorito".
async function openMenu(index = 0) {
  await userEvent.click(screen.getAllByRole("button", { name: /^Acciones de / })[index]!);
  return screen.getByRole("menu");
}
async function chooseAudience(name: string, index = 0) {
  const menu = await openMenu(index);
  await userEvent.click(within(menu).getByRole("menuitemradio", { name }));
}
async function removeViaMenu(index = 0) {
  const menu = await openMenu(index);
  await userEvent.click(within(menu).getByRole("menuitem", { name: "Quitar favorito" }));
}
const badge = (name: RegExp) => screen.getByRole("button", { name });

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

    await chooseAudience("Público");
    await waitFor(() =>
      expect(mocks.updateFavoriteAudience).toHaveBeenCalledWith(target.id, "public"),
    );
    expect(badge(/Audiencia: Público/)).toBeInTheDocument();
  });

  it("revierte el cambio de audiencia si la API falla", async () => {
    const target = fav({ targetType: "artist", audience: "followers" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.updateFavoriteAudience.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    mocks.getMyFavorites.mockResolvedValue(response([target], { counts }));
    renderWall(response([target], { counts }));

    await chooseAudience("Privado");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/No pudimos guardar/));
    expect(badge(/Audiencia: Seguidores/)).toBeInTheDocument();
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

    await removeViaMenu();

    await waitFor(() => expect(screen.getAllByRole("status").map((node) => node.textContent).join(" ")).toContain("Favorito quitado"));
  });

  it("si falla quitar, el aviso aparece junto a la ficha afectada y la ficha vuelve", async () => {
    const a = fav({ targetType: "artist" });
    const b = fav({ targetType: "artist" });
    const counts = { artist: 2, "release-group": 0, recording: 0 };
    mocks.removeFavorite.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    mocks.getMyFavorites.mockResolvedValue(response([a, b], { counts }));
    renderWall(response([a, b], { counts }));

    await removeViaMenu(0);

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

    await chooseAudience("Privado");

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

    const row = screen.getByRole("link", { name: /Disco/ }).closest("tr") as HTMLElement;
    expect(row).not.toHaveTextContent("Álbum");
    const actions = within(row).getByRole("button", { name: /^Acciones de / }).closest("div") as HTMLElement;
    expect(actions.className).not.toContain("opacity-40");
    expect(screen.getByRole("table")).toBeInTheDocument();
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
    expect(badge(/Audiencia: Seguidores/).className).toContain("[@media(pointer:coarse)]:min-h-11");
    expect(badge(/^Acciones de /).className).toContain("[@media(pointer:coarse)]:size-11");
    expect(screen.getByRole("button", { name: "Seleccionar" }).className).toContain("[@media(pointer:coarse)]:min-h-11");
    expect(screen.getByRole("radio", { name: "Índice" }).className).toContain("[@media(pointer:coarse)]:min-h-11");

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(screen.getByRole("checkbox").className).toContain("size-6");
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

    await chooseAudience("Público");

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

    await removeViaMenu();

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

    await chooseAudience("Privado");

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
  // openspec: redesign-favorites-views

  it("quitar muestra el aviso con 'Deshacer' y deshacer vuelve a marcar con la audiencia anterior", async () => {
    const target = fav({ targetType: "release-group", audience: "private" });
    const counts = { artist: 0, "release-group": 1, recording: 0 };
    mocks.removeFavorite.mockResolvedValue(null);
    mocks.addFavorite.mockResolvedValue(target);
    mocks.getMyFavorites.mockResolvedValue(response([], { counts: { artist: 0, "release-group": 0, recording: 0 } }));
    renderWall(response([target], { counts }));

    await removeViaMenu();
    const undo = await screen.findByRole("button", { name: "Deshacer" });
    expect(screen.getAllByRole("status").map((node) => node.textContent).join(" ")).toContain("Quitado de favoritos");

    await userEvent.click(undo);

    await waitFor(() =>
      expect(mocks.addFavorite).toHaveBeenCalledWith({ type: "release-group", id: target.target.id }, "private"),
    );
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
  });

  it("si quitar falla no hay aviso de deshacer", async () => {
    const target = fav({ targetType: "artist" });
    const counts = { artist: 1, "release-group": 0, recording: 0 };
    mocks.removeFavorite.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    mocks.getMyFavorites.mockResolvedValue(response([target], { counts }));
    renderWall(response([target], { counts }));

    await removeViaMenu();

    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
  });

  it("modo selección: 'Seleccionar todo' de una sección elige todos sus favoritos y vuelve a pulsarlo los quita", async () => {
    const a = fav({ targetType: "artist" });
    const b = fav({ targetType: "artist" });
    const album = fav({ targetType: "release-group" });
    renderWall(response([a, b, album], { counts: { artist: 2, "release-group": 1, recording: 0 } }));

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    await userEvent.click(screen.getByRole("button", { name: "Seleccionar todo en Artistas" }));

    expect(screen.getByRole("checkbox", { name: `Seleccionar ${a.target.title}` })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: `Seleccionar ${b.target.title}` })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: `Seleccionar ${album.target.title}` })).not.toBeChecked();
    expect(screen.getAllByText("2 seleccionados").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar todo en Artistas" }));
    expect(screen.getByRole("checkbox", { name: `Seleccionar ${a.target.title}` })).not.toBeChecked();
  });

  it("modo selección: la ficha elegida se resalta", async () => {
    const a = fav({ targetType: "artist" });
    renderWall(response([a], { counts: { artist: 1, "release-group": 0, recording: 0 } }));
    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("article").className).toContain("border-amber");
  });

  it("quitar en lote pide confirmación en la barra y quita los seleccionados", async () => {
    const a = fav({ targetType: "artist" });
    const b = fav({ targetType: "artist" });
    const counts = { artist: 2, "release-group": 0, recording: 0 };
    mocks.removeFavorite.mockResolvedValue(null);
    mocks.getMyFavorites.mockResolvedValue(response([], { counts: { artist: 0, "release-group": 0, recording: 0 } }));
    renderWall(response([a, b], { counts }));

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    await userEvent.click(screen.getByRole("button", { name: "Seleccionar todo en Artistas" }));
    const bar = screen.getByText("Cambiar audiencia a").closest("div") as HTMLElement;
    await userEvent.click(within(bar).getByRole("button", { name: "Quitar" }));
    expect(screen.getByText("¿Quitar 2 favoritos?")).toBeInTheDocument();
    expect(mocks.removeFavorite).not.toHaveBeenCalled();

    await userEvent.click(within(bar).getAllByRole("button", { name: "Quitar" })[0]!);

    await waitFor(() => expect(mocks.removeFavorite).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole("status").map((n) => n.textContent).join(" ")).toContain("2 favoritos quitados"));
  });

  it("cancelar la confirmación no quita nada y conserva la selección", async () => {
    const a = fav({ targetType: "artist" });
    renderWall(response([a], { counts: { artist: 1, "release-group": 0, recording: 0 } }));
    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    await userEvent.click(screen.getByRole("checkbox"));
    const bar = screen.getByText("Cambiar audiencia a").closest("div") as HTMLElement;
    await userEvent.click(within(bar).getByRole("button", { name: "Quitar" }));
    await userEvent.click(within(bar).getByRole("button", { name: "Cancelar" }));

    expect(mocks.removeFavorite).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.queryByText(/¿Quitar/)).not.toBeInTheDocument();
  });

  it("si falla quitar en lote restaura la lista y avisa", async () => {
    const a = fav({ targetType: "artist" });
    const b = fav({ targetType: "artist" });
    const counts = { artist: 2, "release-group": 0, recording: 0 };
    mocks.removeFavorite.mockResolvedValueOnce(null).mockRejectedValueOnce(new ApiError("INTERNAL_ERROR", 500, "x"));
    mocks.getMyFavorites.mockResolvedValue(response([a, b], { counts }));
    renderWall(response([a, b], { counts }));

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    await userEvent.click(screen.getByRole("button", { name: "Seleccionar todo en Artistas" }));
    const bar = screen.getByText("Cambiar audiencia a").closest("div") as HTMLElement;
    await userEvent.click(within(bar).getByRole("button", { name: "Quitar" }));
    await userEvent.click(within(bar).getAllByRole("button", { name: "Quitar" })[0]!);

    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos guardar/);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("Gráfico limpio: sin selector ni 'Quitar' en la ficha, y la marca solo en los no públicos", async () => {
    const priv = fav({ targetType: "release-group", audience: "private" });
    const pub = fav({ targetType: "release-group", audience: "public" });
    renderWall(response([priv, pub], { counts: { artist: 0, "release-group": 2, recording: 0 } }));

    await userEvent.click(screen.getByRole("radio", { name: "Gráfico" }));

    expect(screen.queryByRole("combobox", { name: "Audiencia" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar favorito" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("audience-pin")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Acciones de / })).toHaveLength(2);
    // Sin insignia con texto: solo el ⋯ en la ficha.
    expect(screen.queryByRole("button", { name: /Audiencia: / })).not.toBeInTheDocument();
  });

  it("Índice propio: tabla con encabezados Título, Fecha y Audiencia", async () => {
    const album = fav({ targetType: "release-group", target: { id: "a1", title: "Disco", coverThumbUrl: null } });
    renderWall(response([album], { counts: { artist: 0, "release-group": 1, recording: 0 } }));

    await userEvent.click(screen.getByRole("radio", { name: "Índice" }));

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Título", "Fecha", "Audiencia"]);
    expect(screen.getByRole("columnheader", { name: "Título" }).closest("thead")!.className).toContain("sr-only");
  });

  it("modo lectura: el Índice y el Gráfico no tienen audiencia, marca ni acciones", async () => {
    const priv = fav({ targetType: "release-group", audience: "followers" });
    renderWall(response([priv], { counts: { artist: 0, "release-group": 1, recording: 0 } }), {
      readOnly: true,
      username: "ana",
    });

    await userEvent.click(screen.getByRole("radio", { name: "Índice" }));
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Título", "Fecha"]);
    expect(screen.queryByRole("button", { name: /^Acciones de / })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Gráfico" }));
    expect(screen.queryByTestId("audience-pin")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Acciones de / })).not.toBeInTheDocument();
  });
});
