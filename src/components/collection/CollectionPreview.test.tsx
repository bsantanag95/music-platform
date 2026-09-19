import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { CollectionEntry } from "@/lib/api/schemas";
import type { CollectionPreviewArtist } from "@/services/collection/types";
import { vi } from "vitest";
import { CollectionPreview } from "./CollectionPreview";
import { COLLECTION_VIEW_MODE_STORAGE_KEY } from "./collection-view-mode";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-cover /> }));

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

let seq = 0;
function entry(artistName: string | null, over: Partial<CollectionEntry> = {}): CollectionEntry {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    format: "vinyl",
    attributes: [],
    note: null,
    audience: "public",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    album: { id: `a${seq}`, title: `Álbum ${seq}`, coverThumbUrl: null, artistId: artistName ? `art-${artistName}` : null, artistName },
    ...over,
  };
}

function artist(name: string | null, shown: number, total: number): CollectionPreviewArtist {
  return { name, total, entries: Array.from({ length: shown }, () => entry(name)) };
}

describe("CollectionPreview", () => {
  beforeEach(() => {
    seq = 0;
    installStorage();
  });

  it("agrupa por artista con su total real en el encabezado", () => {
    renderWithIntl(
      <CollectionPreview artists={[artist("Queen", 4, 12), artist("ZZ Top", 2, 2)]} totalEntries={14} username="ana" />,
    );
    expect(screen.getByRole("heading", { name: /Queen\s*12/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ZZ Top\s*2/ })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("un artista con más copias de las que se ven lleva 'Ver los N' a la página dedicada con su búsqueda", () => {
    renderWithIntl(
      <CollectionPreview artists={[artist("Queen", 4, 12), artist("ZZ Top", 2, 2)]} totalEntries={14} username="ana" />,
    );
    expect(screen.getByRole("link", { name: "Ver los 12" })).toHaveAttribute(
      "href",
      "/users/ana/collection?q=Queen",
    );
    // ZZ Top se ve completo: sin enlace
    expect(screen.queryByRole("link", { name: "Ver los 2" })).not.toBeInTheDocument();
  });

  it("codifica el nombre del artista en la URL de búsqueda", () => {
    renderWithIntl(
      <CollectionPreview artists={[artist("AC/DC & Co", 4, 9)]} totalEntries={9} username="ana" />,
    );
    expect(screen.getByRole("link", { name: "Ver los 9" })).toHaveAttribute(
      "href",
      "/users/ana/collection?q=AC%2FDC%20%26%20Co",
    );
  });

  it("copias sin artista: grupo 'Sin artista' y sin enlace de búsqueda", () => {
    renderWithIntl(<CollectionPreview artists={[artist(null, 2, 6)]} totalEntries={6} username="ana" />);
    expect(screen.getByRole("heading", { name: /Sin artista/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver los/ })).not.toBeInTheDocument();
  });

  it("si hay más copias que las mostradas, ofrece 'Ver toda la colección' con el total real", () => {
    renderWithIntl(
      <CollectionPreview artists={[artist("Queen", 4, 12)]} totalEntries={87} username="ana" />,
    );
    expect(screen.getByRole("link", { name: "Ver toda la colección (87)" })).toHaveAttribute(
      "href",
      "/users/ana/collection",
    );
  });

  it("si se ve todo, no hay botón ni 'Ver los N'", () => {
    renderWithIntl(
      <CollectionPreview artists={[artist("Queen", 3, 3), artist("ZZ Top", 2, 2)]} totalEntries={5} username="ana" />,
    );
    expect(screen.queryByRole("link", { name: /Ver toda/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver los/ })).not.toBeInTheDocument();
  });

  it("es de solo lectura: sin editar, seleccionar ni audiencia", () => {
    renderWithIntl(<CollectionPreview artists={[artist("Queen", 2, 2)]} totalEntries={2} username="ana" />);
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar" })).not.toBeInTheDocument();
  });

  it("los tres modos respetan el tope y el enlace del encabezado", async () => {
    const user = userEvent.setup();
    renderWithIntl(<CollectionPreview artists={[artist("Queen", 4, 12)]} totalEntries={12} username="ana" />);

    await user.click(screen.getByRole("radio", { name: "Lista detallada" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Ver los 12" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Índice" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Ver los 12" })).toBeInTheDocument();
    expect(window.localStorage.getItem(COLLECTION_VIEW_MODE_STORAGE_KEY)).toBe("index");
  });
});
