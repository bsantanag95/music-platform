import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { PinnedShowcase } from "./PinnedShowcase";
import type { PinnedItem, ShowcaseEntity } from "@/services/profiles/showcase";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const album: ShowcaseEntity = {
  type: "release-group",
  id: "rg1",
  title: "Souvlaki",
  artistName: "Slowdive",
  coverThumbUrl: null,
};
const artist: ShowcaseEntity = { type: "artist", id: "ar1", title: "Radiohead", artistName: null, coverThumbUrl: null };

const pin = (over: Partial<PinnedItem>): PinnedItem => ({
  id: "p1",
  note: null,
  position: 0,
  entity: album,
  ...over,
});

describe("PinnedShowcase (Empieza por aquí)", () => {
  it("no renderiza nada sin ítems", async () => {
    expect(await PinnedShowcase({ pinned: [] })).toBeNull();
  });

  it("renderiza encabezado, tipo, título, artista, nota y enlace a la entidad", async () => {
    renderWithIntl(await PinnedShowcase({ pinned: [pin({ note: "mi puerta de entrada al shoegaze" })] }));
    expect(screen.getByRole("heading", { name: "showcase.pinnedHeading" })).toBeInTheDocument();
    expect(screen.getByText("showcase.kind.album")).toBeInTheDocument();
    expect(screen.getByText("Souvlaki")).toBeInTheDocument();
    expect(screen.getByText("Slowdive")).toBeInTheDocument();
    expect(screen.getByText("mi puerta de entrada al shoegaze")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveProperty("href", expect.stringContaining("/album/rg1"));
  });

  it("muestra la nota completa, sin recortarla", async () => {
    const note = "n".repeat(120);
    renderWithIntl(await PinnedShowcase({ pinned: [pin({ note })] }));
    const noteEl = screen.getByText(note);
    expect(noteEl.className).not.toMatch(/truncate|line-clamp/);
  });

  it("un ítem sin nota se dibuja sin línea de nota", async () => {
    renderWithIntl(await PinnedShowcase({ pinned: [pin({ note: null })] }));
    const link = screen.getByRole("link");
    expect(link.querySelector(".border-amber")).toBeNull();
    expect(link.textContent).toBe("showcase.kind.albumSouvlakiSlowdive");
  });

  it("usa la placa tipográfica para un artista y la etiqueta de su tipo", async () => {
    renderWithIntl(await PinnedShowcase({ pinned: [pin({ entity: artist })] }));
    expect(screen.getByText("showcase.kind.artist")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument(); // ArtistPlate
    expect(screen.queryByTestId("cover")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveProperty("href", expect.stringContaining("/artist/ar1"));
  });

  it("mantiene el orden dado y no excluye nada (fijar y definir la identidad son independientes)", async () => {
    renderWithIntl(
      await PinnedShowcase({
        pinned: [pin({ id: "p1", entity: artist }), pin({ id: "p2", entity: album }), pin({ id: "p3", entity: { ...album, id: "rg2", title: "Just for a Day" } })],
      }),
    );
    const titles = screen.getAllByRole("link").map((a) => a.textContent ?? "");
    expect(titles).toHaveLength(3);
    expect(titles[0]).toContain("Radiohead");
    expect(titles[1]).toContain("Souvlaki");
    expect(titles[2]).toContain("Just for a Day");
  });

  it("una canción muestra su etiqueta de tipo", async () => {
    renderWithIntl(
      await PinnedShowcase({
        pinned: [pin({ entity: { type: "recording", id: "rec1", title: "Alison", artistName: "Slowdive", coverThumbUrl: null } })],
      }),
    );
    expect(screen.getByText("showcase.kind.song")).toBeInTheDocument();
  });
});
