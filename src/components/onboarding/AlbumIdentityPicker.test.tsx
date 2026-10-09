import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import onboardingEs from "../../../messages/es/onboarding.json";
import { AlbumIdentityPicker, type PickedAlbum } from "./AlbumIdentityPicker";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  getSearchSuggestions: vi.fn(),
}));
vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
  getSearchSuggestions: mocks.getSearchSuggestions,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => null }));

const inRainbowsId = "a1b2c3d4-0000-4000-8000-000000000070";
const inRainbowsLiveId = "a1b2c3d4-0000-4000-8000-000000000071";

function result(id: string, title: string, artistName: string, year: number, category: "studio" | "live_other") {
  return { kind: "release-group" as const, id, mbid: null, title, artistName, category, year, cached: true };
}

const response = {
  type: "album" as const,
  remoteFailed: false,
  total: 2,
  nextOffset: null,
  refine: null,
  results: [
    result(inRainbowsId, "In Rainbows", "Radiohead", 2007, "studio"),
    result(inRainbowsLiveId, "In Rainbows", "Radiohead", 2008, "live_other"),
  ],
};

function Harness({ onPicked }: { onPicked?: (picked: PickedAlbum[]) => void }) {
  const [picked, setPicked] = useState<PickedAlbum[]>([]);
  return (
    <AlbumIdentityPicker
      audience="public"
      picked={picked}
      onChange={(next) => {
        setPicked(next);
        onPicked?.(next);
      }}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSearchSuggestions.mockResolvedValue({ suggestions: [] });
});

describe("AlbumIdentityPicker", () => {
  it("acota la búsqueda completa a álbumes de estudio", async () => {
    mocks.searchAlbums.mockResolvedValue(response);
    const user = userEvent.setup();
    renderWithIntl(<Harness />);

    await user.type(screen.getByRole("searchbox"), "in rainbows");

    await waitFor(() =>
      expect(mocks.searchAlbums).toHaveBeenCalledWith("in rainbows", {
        signal: expect.any(AbortSignal),
        category: "studio",
      }),
    );
  });

  it("distingue las filas homónimas con año y tipo", async () => {
    mocks.searchAlbums.mockResolvedValue(response);
    const user = userEvent.setup();
    renderWithIntl(<Harness />);

    await user.type(screen.getByRole("searchbox"), "in rainbows");

    expect(await screen.findByRole("button", { name: /Radiohead · 2007$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Radiohead · 2008 · En vivo u otro/ })).toBeInTheDocument();
  });

  it("al elegir un álbum limpia el texto y devuelve el foco al campo", async () => {
    mocks.searchAlbums.mockResolvedValue(response);
    const onPicked = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Harness onPicked={onPicked} />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007$/ }));

    expect(onPicked).toHaveBeenCalledWith([{ id: inRainbowsId, title: "In Rainbows", artistName: "Radiohead", year: 2007 }]);
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("el botón de quitar nombra el álbum", async () => {
    mocks.searchAlbums.mockResolvedValue(response);
    const user = userEvent.setup();
    renderWithIntl(<Harness />);

    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007$/ }));

    expect(screen.getByRole("button", { name: "Quitar In Rainbows" })).toBeInTheDocument();
  });

  it("un fallo de búsqueda se dice como error, no como «Sin resultados»", async () => {
    mocks.searchAlbums.mockRejectedValue(new Error("boom"));
    mocks.getSearchSuggestions.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithIntl(<Harness />);

    await user.type(screen.getByRole("searchbox"), "in rainbows");

    expect(await screen.findByText(onboardingEs.searchError)).toBeInTheDocument();
    expect(screen.queryByText(onboardingEs.door1.noResults)).not.toBeInTheDocument();
  });
});
