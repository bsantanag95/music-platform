import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { AlbumSearchResult, ArtistSearchResult, SongGroupResult } from "@/services/catalog/search/types";
import { ResultsTable } from "./ResultsTable";
import { ResultsViewProvider, ResultsViewSwitch, ResultsViewToggle } from "./ResultsView";
import { ArtistResults } from "../search-results/ArtistResults";
import { SongList } from "../search-results/SongResults";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage;
}

const artist: ArtistSearchResult = {
  kind: "artist",
  id: "a1",
  mbid: null,
  name: "Belial",
  disambiguation: "Chile",
  artistType: "group",
  country: "CL",
  cached: false,
  exact: false,
  beginYear: 1988,
  endYear: null,
  beginArea: "Santiago",
};

const album: AlbumSearchResult = {
  kind: "release-group",
  id: "w",
  mbid: null,
  title: "Animals",
  artistName: "Pink Floyd",
  category: "studio",
  year: 1977,
  cached: false,
  community: { average: 4.4, count: 12 },
  yourStars: 4.5,
};

const song = {
  kind: "song",
  key: "s1",
  title: "Paranoid Android",
  artistName: "Radiohead",
  recordingId: null,
  mbid: null,
  albums: [],
  query: "Radiohead - Paranoid Android",
  durationSec: 383,
} as SongGroupResult;

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
});

describe("filas con datos destacados (openspec: refine-advanced-search-phase3)", () => {
  it("artista: ciudad, años, desambiguación sin repetir el país y los filtrados destacados", () => {
    renderWithIntl(<ArtistResults query="" results={[artist]} highlight={["country", "years"]} />);
    expect(
      screen.getByText((_, element) => element?.classList.contains("font-data") === true && element.textContent === "Grupo · Chile · Santiago · desde 1988"),
    ).toBeInTheDocument();
    expect(screen.getByText("Chile")).toHaveClass("text-amber");
    expect(screen.getByText("desde 1988")).toHaveClass("text-amber");
    expect(screen.queryByText("Santiago", { selector: ".text-amber" })).toBeNull();
  });

  it("canción: la duración a la derecha, destacada si se filtró", () => {
    renderWithIntl(<SongList groups={[song]} highlight={["duration"]} />);
    expect(screen.getByText("6:23")).toHaveClass("text-amber");
  });
});

describe("vista Tabla (openspec: refine-advanced-search-phase3)", () => {
  it("columnas por tipo, las de los criterios marcadas", () => {
    renderWithIntl(<ResultsTable type="album" rows={[album]} highlight={["artist", "year"]} />);
    expect(screen.getByRole("columnheader", { name: "Artista" })).toHaveClass("text-amber");
    expect(screen.getByRole("columnheader", { name: "Tipo" })).not.toHaveClass("text-amber");
    expect(screen.getByRole("link", { name: "Animals" })).toBeInTheDocument();
    expect(screen.getByText("1977")).toHaveClass("text-amber");
    expect(screen.getByText("4,4 · 12")).toBeInTheDocument();
    expect(screen.getByText("4,5")).toBeInTheDocument();
  });

  it("canciones y artistas: duración y datos vacíos con guion", () => {
    const { unmount } = renderWithIntl(<ResultsTable type="song" rows={[song]} highlight={[]} />);
    expect(screen.getByText("6:23")).toBeInTheDocument();
    unmount();
    renderWithIntl(<ResultsTable type="artist" rows={[{ ...artist, beginArea: null }]} highlight={[]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("Lista por defecto; elegir Tabla la muestra y se recuerda", () => {
    const view = () => (
      <ResultsViewProvider>
        <ResultsViewToggle />
        <ResultsViewSwitch list={<p>lista</p>} table={<p>tabla</p>} />
      </ResultsViewProvider>
    );
    const { unmount } = renderWithIntl(view());
    expect(screen.getByText("lista")).toBeInTheDocument();
    expect(screen.queryByText("tabla")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tabla" }));
    expect(screen.getByText("tabla")).toBeInTheDocument();
    // La lista sigue para pantallas angostas.
    expect(screen.getByText("lista").parentElement).toHaveClass("md:hidden");
    unmount();

    renderWithIntl(view());
    expect(screen.getByRole("button", { name: "Tabla" })).toHaveAttribute("aria-pressed", "true");
  });
});
