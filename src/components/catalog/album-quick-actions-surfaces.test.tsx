import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { UserListItem } from "@/lib/api/schemas";
import type { AlbumSearchResult } from "@/services/catalog/search/types";
import { AlbumList } from "./search-results/AlbumResults";
import { ListItemsView } from "@/components/lists/ListItemsView";
import { DiscographyStrip } from "@/components/album/DiscographyStrip";

// El menú de acciones del disco en las superficies de extend-album-quick-actions: búsqueda,
// listas ajenas (no en la gestión propia) y la tira del álbum (no en el disco actual). Explorar
// tiene sus propios tests en AlbumCard.test.tsx.

const mocks = vi.hoisted(() => ({ getReleaseGroupMarks: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => <span /> }));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/album/DiscographyScroller", () => ({
  DiscographyScroller: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
}));
vi.mock("@/lib/api/catalog", () => ({ getReleaseGroupMarks: mocks.getReleaseGroupMarks }));
vi.mock("@/components/album/AlbumListPicker", () => ({ AlbumListPicker: () => null }));

const a = catalogEs.albumActions;
const menuButton = (title: string) => ({ name: a.open.replace("{title}", title) });

function installStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  installStorage();
  mocks.getReleaseGroupMarks.mockResolvedValue({ listened: false, stars: null, detailedScore: null, favorite: false, pending: false, lists: [] });
});

describe("búsqueda de álbumes", () => {
  const album = (id: string, title: string): AlbumSearchResult =>
    ({ id, title, artistName: "Mötley Crüe", category: "studio", year: 1989, cached: false }) as AlbumSearchResult;

  it("cada fila lleva el menú fuera del enlace y pide marcas con sesión", () => {
    renderWithIntl(<AlbumList albums={[album("rg1", "Dr. Feelgood")]} authenticated />);
    const button = screen.getByRole("button", menuButton("Dr. Feelgood"));
    expect(button.closest("a")).toBeNull();
    fireEvent.click(button);
    expect(mocks.getReleaseGroupMarks).toHaveBeenCalledWith("rg1");
  });

  it("sin sesión invita a iniciar sesión", () => {
    renderWithIntl(<AlbumList albums={[album("rg1", "Dr. Feelgood")]} authenticated={false} />);
    fireEvent.click(screen.getByRole("button", menuButton("Dr. Feelgood")));
    expect(screen.getByText(a.signInPrompt)).toBeInTheDocument();
  });
});

describe("lista de álbumes ajena", () => {
  const items: UserListItem[] = [
    { id: "i1", position: 1, target: { id: "t1", title: "Rumours", artistName: "Fleetwood Mac", coverThumbUrl: null } },
  ];

  it("lleva el menú en las tres vistas", () => {
    renderWithIntl(<ListItemsView items={items} entityType="release-group" viewerAuthenticated />);
    expect(screen.getByRole("button", menuButton("Rumours"))).toBeInTheDocument();
    for (const mode of ["Índice", "Gráfico"]) {
      fireEvent.click(screen.getByRole("radio", { name: mode }));
      expect(screen.getByRole("button", menuButton("Rumours"))).toBeInTheDocument();
    }
  });

  it("la gestión propia no lleva el menú", () => {
    renderWithIntl(
      <ListItemsView items={items} entityType="release-group" manage={{ busy: false, onReorder: vi.fn(), onRemove: vi.fn() }} />,
    );
    expect(screen.queryByRole("button", menuButton("Rumours"))).not.toBeInTheDocument();
  });

  it("una lista de canciones no lleva el menú de discos", () => {
    renderWithIntl(<ListItemsView items={items} entityType="recording" viewerAuthenticated />);
    expect(screen.queryByRole("button", menuButton("Rumours"))).not.toBeInTheDocument();
  });
});

describe("tira de la discografía del álbum", () => {
  it("ofrece el menú en los demás discos y no en el actual", () => {
    renderWithIntl(
      <DiscographyStrip
        artistName="Mötley Crüe"
        authenticated
        strip={{
          items: [
            { id: "a", title: "Shout at the Devil", coverThumbUrl: null, firstReleaseYear: 1983 },
            { id: "b", title: "Theatre of Pain", coverThumbUrl: null, firstReleaseYear: 1985 },
          ],
          currentIndex: 1,
          previous: null,
          next: null,
        }}
      />,
    );
    const region = screen.getByRole("region");
    expect(within(region).getByRole("button", menuButton("Shout at the Devil"))).toBeInTheDocument();
    expect(within(region).queryByRole("button", menuButton("Theatre of Pain"))).not.toBeInTheDocument();
  });
});
