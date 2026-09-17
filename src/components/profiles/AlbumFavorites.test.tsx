import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AlbumFavorites } from "./AlbumFavorites";
import type { AlbumFavorite } from "@/services/profiles/album-favorites";
import type { IdentityCard } from "@/services/profiles/showcase";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const emptyIdentityCard: IdentityCard = { artist: null, album: null, anthem: null };

const favorite = (over: Partial<AlbumFavorite> = {}): AlbumFavorite => ({
  id: "pin1",
  favoriteId: "f1",
  position: 1,
  target: { id: "rg1", title: "Short n' Sweet", artistName: "Sabrina Carpenter", coverThumbUrl: null },
  ...over,
});

describe("AlbumFavorites", () => {
  it("no renderiza nada sin álbumes favoritos", async () => {
    expect(await AlbumFavorites({ albums: [], identityCard: emptyIdentityCard })).toBeNull();
  });

  it("renderiza título, artista y enlace de cada álbum", async () => {
    renderWithIntl(await AlbumFavorites({ albums: [favorite()], identityCard: emptyIdentityCard }));
    expect(screen.getByText("Short n' Sweet")).toBeInTheDocument();
    expect(screen.getByText("Sabrina Carpenter")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveProperty("href", expect.stringContaining("/album/rg1"));
  });

  it("excluye el álbum definitorio de la Tarjeta de Identidad (openspec: rework-user-profile)", async () => {
    renderWithIntl(
      await AlbumFavorites({
        albums: [favorite(), favorite({ id: "pin2", favoriteId: "f2", target: { id: "rg2", title: "Norman Fucking Rockwell!", artistName: "Lana Del Rey", coverThumbUrl: null } })],
        identityCard: { ...emptyIdentityCard, album: { type: "release-group", id: "rg1", title: "Short n' Sweet", artistName: "Sabrina Carpenter", coverThumbUrl: null } },
      }),
    );
    expect(screen.queryByText("Short n' Sweet")).not.toBeInTheDocument();
    expect(screen.getByText("Norman Fucking Rockwell!")).toBeInTheDocument();
  });

  it("no renderiza nada cuando el único álbum favorito ya es el definitorio", async () => {
    expect(
      await AlbumFavorites({
        albums: [favorite()],
        identityCard: { ...emptyIdentityCard, album: { type: "release-group", id: "rg1", title: "Short n' Sweet", artistName: "Sabrina Carpenter", coverThumbUrl: null } },
      }),
    ).toBeNull();
  });
});
