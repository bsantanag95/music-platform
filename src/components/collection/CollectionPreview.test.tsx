import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CollectionEntry } from "@/lib/api/schemas";
import type { CollectionPreviewArtist } from "@/services/collection/types";
import { CollectionPreview, COLLECTION_PROFILE_PREVIEW } from "./CollectionPreview";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-cover /> }));

let seq = 0;
function entry(artistName: string | null, createdAt: string): CollectionEntry {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    format: "vinyl",
    attributes: [],
    note: null,
    audience: "public",
    createdAt,
    updatedAt: createdAt,
    album: { id: `a${seq}`, title: `Álbum ${seq}`, coverThumbUrl: null, artistId: null, artistName, year: 1984 },
  };
}

const artist = (name: string, entries: CollectionEntry[]): CollectionPreviewArtist => ({
  name,
  total: entries.length,
  entries,
});

describe("CollectionPreview (perfil, openspec: redesign-user-profile-phase2)", () => {
  it("no renderiza nada sin copias", async () => {
    expect(await CollectionPreview({ artists: [] })).toBeNull();
  });

  it("muestra las copias más recientes, con artista · año y formato, sin selector de vista", async () => {
    seq = 0;
    render(
      await CollectionPreview({
        artists: [
          artist("Queen", [entry("Queen", "2026-01-01T00:00:00Z"), entry("Queen", "2026-03-01T00:00:00Z")]),
          artist("Dokken", [entry("Dokken", "2026-02-01T00:00:00Z")]),
        ],
      }),
    );
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Álbum 2"),
      expect.stringContaining("Álbum 3"),
      expect.stringContaining("Álbum 1"),
    ]);
    expect(screen.getByText("Dokken · 1984")).toBeInTheDocument();
    expect(screen.getAllByText("format.vinyl")).toHaveLength(3);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("se acota a las copias de la vista previa", async () => {
    seq = 0;
    const many = Array.from({ length: 7 }, (_, i) => entry("Queen", `2026-01-0${i + 1}T00:00:00Z`));
    render(await CollectionPreview({ artists: [artist("Queen", many)] }));
    expect(screen.getAllByRole("listitem")).toHaveLength(COLLECTION_PROFILE_PREVIEW);
  });
});
