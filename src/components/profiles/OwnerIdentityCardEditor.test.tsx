import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerIdentityCardEditor } from "./OwnerIdentityCardEditor";
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

const filledIdentityCard: IdentityCard = {
  artist: { type: "artist", id: "artist1", title: "Roger Waters", artistName: null, coverThumbUrl: null },
  album: {
    type: "release-group",
    id: "rg1",
    title: "Fall Apart",
    artistName: "Sabrina Carpenter",
    coverThumbUrl: null,
  },
  anthem: { type: "recording", id: "rec1", title: "Mountains", artistName: "Lasers", coverThumbUrl: null },
};

// Editor unificado de la Tarjeta de Identidad (openspec: rework-user-profile):
// un solo bloque con los 3 slots (artista/álbum/canción); es el único lugar donde
// se eligen (openspec: simplify-profile-curation).
describe("OwnerIdentityCardEditor", () => {
  it("muestra un estado vacío por slot cuando no hay nada elegido", () => {
    renderWithIntl(<OwnerIdentityCardEditor initial={emptyIdentityCard} />);
    expect(screen.getByText("Todavía no elegiste un artista.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no elegiste un álbum.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no elegiste una canción.")).toBeInTheDocument();
  });

  it("muestra los 3 elementos ya elegidos con la opción de quitarlos", () => {
    renderWithIntl(<OwnerIdentityCardEditor initial={filledIdentityCard} />);
    expect(screen.getByText("Roger Waters")).toBeInTheDocument();
    expect(screen.getByText("Fall Apart")).toBeInTheDocument();
    expect(screen.getByText("Mountains")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Quitar" })).toHaveLength(3);
  });

  it("elegir un artista de favoritos hace PUT a /api/me/profile/pinned/defining con type artist", async () => {
    const user = userEvent.setup();
    getMyFavorites.mockResolvedValue({
      favorites: [
        {
          id: "f1",
          targetType: "artist",
          audience: "public",
          createdAt: "2026-01-01T00:00:00Z",
          target: { id: "artist1", title: "Roger Waters", coverThumbUrl: null, artistName: null, artistId: null },
        },
      ],
      page: 1,
      pageSize: 50,
      hasNext: false,
      counts: { artist: 1, "release-group": 0, recording: 0 },
    });
    mocks.apiFetch.mockResolvedValue({
      showcase: { pinned: [], anthem: null, identityCard: { ...emptyIdentityCard, artist: filledIdentityCard.artist } },
    });
    renderWithIntl(<OwnerIdentityCardEditor initial={emptyIdentityCard} />);

    const artistSection = screen.getByText("Artista que me define").parentElement!;
    await user.click(within(artistSection).getByText("Elegir"));
    await user.click(await screen.findByText("Roger Waters"));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile/pinned/defining");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ type: "artist", id: "artist1" });
  });

  it("cada slot busca solo entre los favoritos de su tipo, con buscador, y no ofrece lo ya elegido", async () => {
    const user = userEvent.setup();
    getMyFavorites.mockResolvedValue({
      favorites: [
        { id: "f1", targetType: "release-group", audience: "public", createdAt: "2026-01-01T00:00:00Z", target: { id: "rg1", title: "Fall Apart", coverThumbUrl: null, artistName: "Sabrina Carpenter", artistId: null } },
        { id: "f2", targetType: "release-group", audience: "public", createdAt: "2026-01-01T00:00:00Z", target: { id: "rg2", title: "Souvlaki", coverThumbUrl: null, artistName: "Slowdive", artistId: null } },
      ],
      page: 1,
      pageSize: 50,
      hasNext: false,
      counts: { artist: 0, "release-group": 2, recording: 0 },
    });
    renderWithIntl(<OwnerIdentityCardEditor initial={filledIdentityCard} />);
    expect(getMyFavorites).not.toHaveBeenCalled(); // no se consulta al montar

    const albumSection = screen.getByText("Álbum que me define").parentElement!;
    await user.click(within(albumSection).getByText("Cambiar"));

    expect(await within(albumSection).findByRole("searchbox", { name: "Buscar en tus favoritos" })).toBeInTheDocument();
    expect(await within(albumSection).findByRole("button", { name: /Souvlaki/ })).toBeInTheDocument();
    // "Fall Apart" ya es el álbum definitorio: no se ofrece de nuevo.
    expect(within(albumSection).queryByRole("button", { name: /Fall Apart/ })).not.toBeInTheDocument();
    expect(getMyFavorites).toHaveBeenCalledTimes(1);
    expect(getMyFavorites).toHaveBeenCalledWith(1, 50, { type: "release-group" });
  });

  it("quitar el álbum definitorio hace DELETE con el id del álbum actual", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({
      showcase: { pinned: [], anthem: null, identityCard: { ...filledIdentityCard, album: null } },
    });
    renderWithIntl(<OwnerIdentityCardEditor initial={filledIdentityCard} />);

    const albumSection = screen.getByText("Fall Apart").closest("div")!.parentElement!;
    await user.click(within(albumSection).getByRole("button", { name: "Quitar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile/pinned/defining");
    expect((init as RequestInit).method).toBe("DELETE");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ type: "release-group", id: "rg1" });
    expect(await screen.findByText("Todavía no elegiste un álbum.")).toBeInTheDocument();
  });

  it("quitar la canción definitoria hace DELETE a /api/me/profile/anthem", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({
      showcase: { pinned: [], anthem: null, identityCard: { ...filledIdentityCard, anthem: null } },
    });
    renderWithIntl(<OwnerIdentityCardEditor initial={filledIdentityCard} />);

    const songSection = screen.getByText("Mountains").closest("div")!.parentElement!;
    await user.click(within(songSection).getByRole("button", { name: "Quitar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile/anthem");
    expect((init as RequestInit).method).toBe("DELETE");
  });
});
