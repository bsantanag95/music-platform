import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerAlbumFavoritesEditor } from "./OwnerAlbumFavoritesEditor";
import type { AlbumFavorite } from "@/services/profiles/album-favorites";
import type { IdentityCard } from "@/services/profiles/showcase";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

const getMyFavorites = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/favorites", () => ({ getMyFavorites }));

beforeEach(() => vi.clearAllMocks());

const emptyIdentityCard: IdentityCard = { artist: null, album: null, anthem: null };

const album = (over: Partial<AlbumFavorite> = {}): AlbumFavorite => ({
  id: "pin1",
  favoriteId: "f1",
  position: 1,
  target: { id: "rg1", title: "Norman Fucking Rockwell!", artistName: "Lana Del Rey", coverThumbUrl: null },
  ...over,
});

describe("OwnerAlbumFavoritesEditor — marcador 'me define' (openspec: rework-user-profile)", () => {
  it("ofrece el marcador ★/☆ para cada álbum favorito fijado", () => {
    renderWithIntl(<OwnerAlbumFavoritesEditor initial={[album()]} identityCard={emptyIdentityCard} />);
    expect(screen.getByRole("button", { name: "Marcar como definitorio" })).toBeInTheDocument();
  });

  it("marca el álbum como definitorio (PUT release-group + id del álbum, no del favorito) y refleja el resultado", async () => {
    const user = userEvent.setup();
    const nfr = { type: "release-group" as const, id: "rg1", title: "Norman Fucking Rockwell!", artistName: "Lana Del Rey", coverThumbUrl: null };
    mocks.apiFetch.mockResolvedValue({
      showcase: { pinned: [], anthem: null, identityCard: { artist: null, album: nfr, anthem: null } },
    });
    renderWithIntl(<OwnerAlbumFavoritesEditor initial={[album()]} identityCard={emptyIdentityCard} />);

    await user.click(screen.getByRole("button", { name: "Marcar como definitorio" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile/pinned/defining");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ type: "release-group", id: "rg1" });
    expect(await screen.findByRole("button", { name: "Quitar de la Tarjeta de Identidad" })).toBeInTheDocument();
  });

  it("un álbum ya marcado como definitorio ofrece quitarlo (DELETE)", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({
      showcase: { pinned: [], anthem: null, identityCard: emptyIdentityCard },
    });
    renderWithIntl(
      <OwnerAlbumFavoritesEditor
        initial={[album()]}
        identityCard={{ ...emptyIdentityCard, album: { type: "release-group", id: "rg1", title: "Norman Fucking Rockwell!", artistName: "Lana Del Rey", coverThumbUrl: null } }}
      />,
    );

    expect(screen.getByRole("button", { name: "Quitar de la Tarjeta de Identidad" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar de la Tarjeta de Identidad" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const [, , init] = mocks.apiFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe("DELETE");
  });

  it("un álbum recién agregado (sin guardar todavía) ya ofrece el marcador — no depende de guardar la lista", async () => {
    const user = userEvent.setup();
    getMyFavorites.mockResolvedValue({
      favorites: [
        {
          id: "f2",
          targetType: "release-group",
          audience: "public",
          createdAt: "2026-01-01T00:00:00Z",
          target: { id: "rg2", title: "Short n' Sweet", coverThumbUrl: null, artistName: "Sabrina Carpenter", artistId: null },
        },
      ],
      page: 1,
      pageSize: 50,
      hasNext: false,
      counts: { artist: 0, "release-group": 1, recording: 0 },
    });
    renderWithIntl(<OwnerAlbumFavoritesEditor initial={[]} identityCard={emptyIdentityCard} />);

    await user.click(screen.getByText("Elegí de tus favoritos"));
    await user.click(await screen.findByText("Short n' Sweet"));

    expect(screen.getByText("Short n' Sweet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como definitorio" })).toBeInTheDocument();
  });
});
