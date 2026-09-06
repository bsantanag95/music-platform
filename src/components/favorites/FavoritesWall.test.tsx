import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
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

  it("modo lectura: sin toolbar ni encabezado de conteos, usa el vacío de perfil", () => {
    renderWall(response([]), { readOnly: true, username: "ana" });
    expect(screen.queryByPlaceholderText("Buscar en tus favoritos")).not.toBeInTheDocument();
    expect(screen.getByText("Sin favoritos")).toBeInTheDocument();
  });
});
