import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { IdentityCard } from "./IdentityCard";
import type { ShowcaseEntity } from "@/services/profiles/showcase";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const artist: ShowcaseEntity = {
  type: "artist",
  id: "ar1",
  title: "Radiohead",
  artistName: null,
  coverThumbUrl: null,
};
const album: ShowcaseEntity = {
  type: "release-group",
  id: "rg1",
  title: "Blonde",
  artistName: "Frank Ocean",
  coverThumbUrl: null,
};
const anthem: ShowcaseEntity = {
  type: "recording",
  id: "rec1",
  title: "Idioteque",
  artistName: "Radiohead",
  coverThumbUrl: null,
};

describe("IdentityCard", () => {
  it("no renderiza nada sin artista, álbum ni himno definitorios (spec profile-showcase, 'Ningún elemento de identidad')", async () => {
    expect(await IdentityCard({ identityCard: { artist: null, album: null, anthem: null } })).toBeNull();
  });

  it("se compone con lo que exista, sin huecos (spec profile-showcase, 'Tarjeta de Identidad incompleta')", async () => {
    renderWithIntl(await IdentityCard({ identityCard: { artist: null, album: null, anthem } }));
    expect(screen.getByText("Idioteque")).toBeInTheDocument();
    expect(screen.queryByText("identityCard.artistHeading")).not.toBeInTheDocument();
    expect(screen.queryByText("identityCard.albumHeading")).not.toBeInTheDocument();
  });

  it("renderiza los tres elementos, cada uno enlazado a su página de catálogo", async () => {
    renderWithIntl(await IdentityCard({ identityCard: { artist, album, anthem } }));
    expect(screen.getAllByText("Radiohead")).toHaveLength(2); // artista + artista acreditado del himno
    expect(screen.getByText("Blonde")).toBeInTheDocument();
    expect(screen.getByText("Frank Ocean")).toBeInTheDocument();
    expect(screen.getByText("Idioteque")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      expect.stringContaining("/artist/ar1"),
      expect.stringContaining("/album/rg1"),
      expect.stringContaining("/song/rec1"),
    ]);
  });
});
