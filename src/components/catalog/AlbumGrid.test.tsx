import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AlbumGrid } from "./AlbumGrid";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import catalogEn from "../../../messages/en/catalog.json";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";

// LazyCoverImage resuelve la carátula en el cliente; el grid solo lo
// compone, así que se aísla para validar agrupación y navegación.
vi.mock("./LazyCoverImage", () => ({
  LazyCoverImage: () => <div data-testid="mock-cover" />,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function makeReleaseGroup(
  id: string,
  title: string,
  category: ReleaseGroupCategory,
): ReleaseGroup {
  return {
    id,
    mbid: null,
    title,
    category,
    createdAt: "2024-01-01T00:00:00Z",
  };
}

const categoryLabelsEs = {
  studio: catalogEs.artist.categories.studio,
  single_ep: catalogEs.artist.categories.single_ep,
  compilation: catalogEs.artist.categories.compilation,
  live_other: catalogEs.artist.categories.live_other,
} as const;

const categoryLabelsEn = {
  studio: catalogEn.artist.categories.studio,
  single_ep: catalogEn.artist.categories.single_ep,
  compilation: catalogEn.artist.categories.compilation,
  live_other: catalogEn.artist.categories.live_other,
} as const;

describe("AlbumGrid", () => {
  it("agrupa los álbumes por categoría con encabezados traducidos y preserva los títulos", () => {
    const releaseGroups = [
      makeReleaseGroup("id-1", "The Dark Side of the Moon", "studio"),
      makeReleaseGroup("id-2", "Another Brick in the Wall", "single_ep"),
      makeReleaseGroup("id-3", "Wish You Were Here", "studio"),
    ];

    renderWithIntl(
      <AlbumGrid
        releaseGroups={releaseGroups}
        categoryLabels={categoryLabelsEs}
        discographyHeading={catalogEs.artist.discographyHeading}
        coverLabel={catalogEs.artist.albumCoverLabel}
      />,
    );

    expect(screen.getByRole("heading", { name: catalogEs.artist.discographyHeading })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: catalogEs.artist.categories.studio })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: catalogEs.artist.categories.single_ep })).toBeInTheDocument();
    expect(screen.getByText("The Dark Side of the Moon")).toBeInTheDocument();
    expect(screen.getByText("Wish You Were Here")).toBeInTheDocument();
    expect(screen.getByText("Another Brick in the Wall")).toBeInTheDocument();
  });

  it("no renderiza secciones para categorías sin contenido", () => {
    const releaseGroups = [makeReleaseGroup("id-1", "Pulse", "live_other")];

    renderWithIntl(
      <AlbumGrid
        releaseGroups={releaseGroups}
        categoryLabels={categoryLabelsEs}
        discographyHeading={catalogEs.artist.discographyHeading}
        coverLabel={catalogEs.artist.albumCoverLabel}
      />,
    );

    expect(screen.getByRole("heading", { name: catalogEs.artist.categories.live_other })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: catalogEs.artist.categories.studio })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: catalogEs.artist.categories.compilation })).not.toBeInTheDocument();
  });

  it("usa etiquetas del locale activo", () => {
    const releaseGroups = [makeReleaseGroup("id-1", "Animals", "studio")];

    renderWithIntl(
      <AlbumGrid
        releaseGroups={releaseGroups}
        categoryLabels={categoryLabelsEn}
        discographyHeading={catalogEn.artist.discographyHeading}
        coverLabel={catalogEn.artist.albumCoverLabel}
      />,
      "en",
    );

    expect(screen.getByRole("heading", { name: catalogEn.artist.categories.studio })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: catalogEs.artist.categories.studio })).not.toBeInTheDocument();
  });

  it("construye enlaces a /album/[id] por cada tarjeta", () => {
    const releaseGroups = [makeReleaseGroup("id-album-1", "Atom Heart Mother", "studio")];

    renderWithIntl(
      <AlbumGrid
        releaseGroups={releaseGroups}
        categoryLabels={categoryLabelsEs}
        discographyHeading={catalogEs.artist.discographyHeading}
        coverLabel={catalogEs.artist.albumCoverLabel}
      />,
    );

    const link = screen.getByRole("link", { name: /Atom Heart Mother/ });
    expect(link).toHaveAttribute("href", "/album/id-album-1");
  });
});
