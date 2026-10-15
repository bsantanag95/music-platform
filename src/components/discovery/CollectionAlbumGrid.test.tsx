import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { UserListItem } from "@/lib/api/schemas";
import { CollectionAlbumGrid } from "./CollectionAlbumGrid";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={`/es${href}`}>{children}</a>,
}));

const item = (n: number): UserListItem =>
  ({
    id: `item-${n}`,
    target: { id: `00000000-0000-4000-8000-00000000000${n}`, title: `Disco ${n}`, artistName: `Artista ${n}`, coverThumbUrl: null },
  }) as unknown as UserListItem;

const items = [1, 2, 3, 4].map(item);

const render = (props: Partial<React.ComponentProps<typeof CollectionAlbumGrid>> = {}) =>
  renderWithIntl(
    <CollectionAlbumGrid heading="Álbumes" items={items} entityType="release-group" unavailableLabel="No disponible" {...props} />,
  );

describe("CollectionAlbumGrid", () => {
  it("sin grupos, una sola rejilla con todos los discos y su conteo", () => {
    render();

    expect(screen.getByRole("heading", { level: 2, name: /Álbumes\s*\(4\)/ })).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("no numera salvo que el contexto lo pida", () => {
    const view = render();
    expect(screen.queryByText("1")).toBeNull();
    view.unmount();

    render({ numbered: true });
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("muestra la cartela de cada disco que la tiene, y solo esos", () => {
    render({ notes: { "item-1": "Álbum del año", "item-3": "Mejor álbum de rock" } });

    expect(screen.getByText("Álbum del año")).toBeInTheDocument();
    expect(screen.getByText("Mejor álbum de rock")).toBeInTheDocument();
    expect(screen.getAllByText(/Álbum del año|Mejor álbum de rock/)).toHaveLength(2);
  });

  it("con grupos, una sección por grupo con su encabezado y las mismas tarjetas, sin perder ningún disco", () => {
    render({
      groups: [
        { heading: "Octubre de 2026", items: [items[0]!, items[2]!] },
        { heading: "Septiembre de 2026", items: [items[1]!] },
        { items: [items[3]!] },
      ],
    });

    expect(screen.getAllByRole("list")).toHaveLength(3);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Octubre de 2026",
      "Septiembre de 2026",
    ]);
    const first = screen.getAllByRole("list")[0]!;
    expect(within(first).getAllByRole("link").map((a) => a.textContent)).toEqual([
      expect.stringContaining("Disco 1"),
      expect.stringContaining("Disco 3"),
    ]);
  });

  it("un grupo sin encabezado no pinta título", () => {
    render({ groups: [{ items }] });
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("un disco sin título usa la etiqueta de no disponible", () => {
    const broken = { ...item(1), target: { ...item(1).target, title: "" } } as UserListItem;
    render({ items: [broken] });
    expect(screen.getByText("No disponible")).toBeInTheDocument();
  });
});
