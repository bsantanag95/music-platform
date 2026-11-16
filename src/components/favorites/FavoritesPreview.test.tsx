import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { FavoritesPreview } from "./FavoritesPreview";
import type { FavoriteEntry } from "@/services/favorites/favorites";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

function favorite(over: Partial<FavoriteEntry> = {}): FavoriteEntry {
  return {
    id: "f1",
    targetType: "release-group",
    audience: "public",
    createdAt: "2026-01-01T00:00:00Z",
    target: { id: "t1", title: "Blonde", coverThumbUrl: null, artistName: "Frank Ocean", artistId: "a1" },
    ...over,
  };
}

describe("FavoritesPreview", () => {
  it("no renderiza nada cuando los counts están todos en cero", async () => {
    const tree = await FavoritesPreview({
      preview: { artists: [], albums: [], songs: [], counts: { artist: 0, "release-group": 0, recording: 0 } },
    });
    expect(tree).toBeNull();
  });

  it("álbumes como carátulas y, al lado, artistas y canciones", async () => {
    render(
      await FavoritesPreview({
        preview: {
          artists: [favorite({ id: "f2", targetType: "artist", target: { id: "a1", title: "Radiohead", coverThumbUrl: null, artistName: null, artistId: null } })],
          albums: [favorite()],
          songs: [
            favorite({
              id: "f3",
              targetType: "recording",
              target: { id: "rec1", title: "Idioteque", coverThumbUrl: null, artistName: "Radiohead", artistId: "a1" },
            }),
          ],
          counts: { artist: 1, "release-group": 1, recording: 1 },
        },
      }),
    );
    expect(screen.getByRole("list", { name: "sectionAlbums" })).toHaveTextContent("Blonde");
    expect(screen.getAllByTestId("cover")).toHaveLength(1);
    expect(screen.getByText("Radiohead", { selector: "span.flex-1" })).toBeInTheDocument();
    expect(screen.getByText("profileArtistKind")).toBeInTheDocument();
    expect(screen.getByText("Idioteque")).toBeInTheDocument();
  });

  it("sin álbumes, solo la lista de artistas y canciones", async () => {
    render(
      await FavoritesPreview({
        preview: {
          artists: [],
          albums: [],
          songs: [favorite({ id: "f3", targetType: "recording", target: { id: "rec1", title: "Idioteque", coverThumbUrl: null, artistName: "Radiohead", artistId: "a1" } })],
          counts: { artist: 0, "release-group": 0, recording: 1 },
        },
      }),
    );
    expect(screen.queryByRole("list", { name: "sectionAlbums" })).not.toBeInTheDocument();
    expect(screen.getByText("Idioteque")).toBeInTheDocument();
  });

  it("canciones se listan como filas, sin grilla de carátulas", async () => {
    render(
      await FavoritesPreview({
        preview: {
          artists: [],
          albums: [],
          songs: [
            favorite({
              id: "f3",
              targetType: "recording",
              target: { id: "rec1", title: "Idioteque", coverThumbUrl: null, artistName: "Radiohead", artistId: "a1" },
            }),
          ],
          counts: { artist: 0, "release-group": 0, recording: 1 },
        },
      }),
    );
    expect(screen.getByText("Idioteque")).toBeInTheDocument();
    expect(screen.queryByTestId("cover")).not.toBeInTheDocument();
  });
});
