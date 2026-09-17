import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { PinnedShowcase } from "./PinnedShowcase";
import type { IdentityCard, PinnedItem } from "@/services/profiles/showcase";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const pin = (over: Partial<PinnedItem>): PinnedItem => ({
  id: "p1",
  note: null,
  position: 0,
  entity: {
    type: "release-group",
    id: "rg1",
    title: "Souvlaki",
    artistName: "Slowdive",
    coverThumbUrl: null,
  },
  ...over,
});

const emptyIdentityCard: IdentityCard = { artist: null, album: null, anthem: null };

describe("PinnedShowcase", () => {
  it("no renderiza nada sin destacados", async () => {
    expect(await PinnedShowcase({ pinned: [], identityCard: emptyIdentityCard })).toBeNull();
  });

  it("renderiza título, artista, nota y enlace a la entidad", async () => {
    renderWithIntl(
      await PinnedShowcase({
        pinned: [pin({ note: "mi puerta de entrada al shoegaze" })],
        identityCard: emptyIdentityCard,
      }),
    );
    expect(screen.getByText("Souvlaki")).toBeInTheDocument();
    expect(screen.getByText("Slowdive")).toBeInTheDocument();
    expect(screen.getByText("mi puerta de entrada al shoegaze")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveProperty("href", expect.stringContaining("/album/rg1"));
  });

  it("excluye lo que ya vive en la Tarjeta de Identidad (artista/álbum definitorios)", async () => {
    const radiohead = { type: "artist" as const, id: "ar1", title: "Radiohead", artistName: null, coverThumbUrl: null };
    renderWithIntl(
      await PinnedShowcase({
        pinned: [pin({ id: "p1", entity: radiohead }), pin({ id: "p2" })],
        identityCard: { ...emptyIdentityCard, artist: radiohead },
      }),
    );
    expect(screen.queryByText("Radiohead")).not.toBeInTheDocument();
    expect(screen.getByText("Souvlaki")).toBeInTheDocument();
  });

  it("no renderiza nada cuando todo lo destacado ya está en la Tarjeta de Identidad", async () => {
    expect(
      await PinnedShowcase({
        pinned: [pin({})],
        identityCard: { ...emptyIdentityCard, album: { type: "release-group", id: "rg1", title: "Souvlaki", artistName: "Slowdive", coverThumbUrl: null } },
      }),
    ).toBeNull();
  });

  it("un destacado con el mismo id pero distinto tipo que el definitorio no se excluye por error", async () => {
    renderWithIntl(
      await PinnedShowcase({
        pinned: [pin({ entity: { type: "recording", id: "rg1", title: "Souvlaki (canción)", artistName: "Slowdive", coverThumbUrl: null } })],
        // mismo id "rg1" pero como álbum definitorio, tipo distinto al destacado (recording)
        identityCard: { ...emptyIdentityCard, album: { type: "release-group", id: "rg1", title: "Souvlaki", artistName: "Slowdive", coverThumbUrl: null } },
      }),
    );
    expect(screen.getByText("Souvlaki (canción)")).toBeInTheDocument();
  });
});
