import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { DiscoverListSummary } from "@/lib/api/schemas";
import { ListsReader, type ReaderTab } from "./ListsReader";

const mocks = vi.hoisted(() => ({
  getUserListDetail: vi.fn(),
  getPopularLists: vi.fn(),
  getDiscoverLists: vi.fn(),
  getListsFromFollowing: vi.fn(),
  replace: vi.fn(),
  desktop: true,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, onClick, ...rest }: { href: string; children: ReactNode; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/lists",
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("@/components/feed/feed-row-parts", () => ({ RelativeDate: () => <span>hace 3 meses</span> }));
vi.mock("./SaveListButton", () => ({ SaveListButton: () => <button type="button">Guardar</button> }));
vi.mock("@/lib/api/lists", () => ({
  getUserListDetail: mocks.getUserListDetail,
  getPopularLists: mocks.getPopularLists,
  getDiscoverLists: mocks.getDiscoverLists,
  getListsFromFollowing: mocks.getListsFromFollowing,
}));

function list(id: string, over: Partial<DiscoverListSummary> = {}): DiscoverListSummary {
  return {
    id,
    entityType: "release-group",
    title: `Lista ${id}`,
    description: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    itemCount: 4,
    coverThumbs: [],
    owner: { id: `o-${id}`, username: `user-${id}`, displayName: `Dueño ${id}` },
    isOfficial: false,
    saved: false,
    following: false,
    isOwn: false,
    generated: null,
    saveCount: 0,
    ...over,
  } as DiscoverListSummary;
}
const page = (lists: DiscoverListSummary[]) => ({ lists, page: 1, pageSize: 20, hasNext: false });
const item = (id: string, title: string) => ({ id, position: 1, target: { id: `t-${id}`, title, artistName: "Artista", coverThumbUrl: null } });

function renderReader(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const tabs: ReaderTab[] = [
  { key: "popular", label: "Populares", initial: page([list("a", { saveCount: 12 }), list("b")]), excludeIds: [] },
  { key: "recent", label: "Recientes", initial: page([list("c"), list("a")]), excludeIds: ["a"] },
  {
    key: "to-complete",
    label: "Para completar",
    caminos: [{ id: "k1", title: "Best of Hard Rock", kind: "standard", owner: { id: "o", username: "eli", displayName: null }, itemCount: 10, coverThumbs: [], trackingCount: 1 }],
    seeAll: { href: "/caminos", label: "Ver todas" },
  },
];

describe("ListsReader (openspec: redesign-lists-phase2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.desktop = true;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: mocks.desktop,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra las pestañas en orden, la primera abierta, y cambia con las flechas", () => {
    renderReader(<ListsReader mode="showcase" tabs={tabs} tabsLabel="Listas de la comunidad" canSave={false} initialPreview={null} />);

    const tablist = screen.getByRole("tablist", { name: "Listas de la comunidad" });
    const tabEls = within(tablist).getAllByRole("tab");
    expect(tabEls.map((tab) => tab.textContent)).toEqual(["Populares", "Recientes", "Para completar"]);
    expect(tabEls[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(tabEls[0]!, { key: "ArrowRight" });
    expect(tabEls[1]).toHaveAttribute("aria-selected", "true");
    // Recientes deja fuera la destacada "a".
    const panel = screen.getByRole("tabpanel", { name: "Recientes" });
    expect(within(panel).getAllByRole("link").map((a) => a.textContent)).toEqual([expect.stringContaining("Lista c")]);
  });

  it("cada fila dice dueño, tipo, elementos y guardadas; Para completar, cuántas personas la completan", () => {
    renderReader(<ListsReader mode="showcase" tabs={tabs} tabsLabel="Listas" canSave={false} initialPreview={null} />);

    const first = screen.getAllByRole("link", { name: /Lista a/ })[0]!;
    expect(first).toHaveTextContent("Dueño a");
    expect(first).toHaveTextContent(/4 elementos.*12 guardados/);
    expect(screen.getByRole("link", { name: /Best of Hard Rock/, hidden: true })).toHaveTextContent("1 persona la está completando");
  });

  it("la vista previa muestra la primera lista con los elementos resueltos en el servidor, sin pedirlos", () => {
    renderReader(
      <ListsReader
        mode="showcase"
        tabs={tabs}
        tabsLabel="Listas"
        canSave={false}
        initialPreview={{ id: "a", items: [item("1", "In Rainbows"), item("2", "Currents")] }}
      />,
    );

    const preview = screen.getByRole("region", { name: "Vista previa: Lista a" });
    expect(within(preview).getByText("In Rainbows")).toBeInTheDocument();
    expect(within(preview).getByRole("link", { name: "Abrir la lista" })).toHaveAttribute("href", expect.stringContaining("/users/user-a/lists/"));
    expect(mocks.getUserListDetail).not.toHaveBeenCalled();
  });

  it("en escritorio, un clic elige la fila y pide sus elementos; mientras tanto muestra la cabecera", async () => {
    mocks.getUserListDetail.mockResolvedValue({ items: [item("3", "Madvillainy")] });
    renderReader(<ListsReader mode="showcase" tabs={tabs} tabsLabel="Listas" canSave={false} initialPreview={null} />);

    const row = screen.getAllByRole("link", { name: /Lista b/ })[0]!;
    fireEvent.click(row);

    expect(row).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("region", { name: "Vista previa: Lista b" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Madvillainy")).toBeInTheDocument());
    expect(mocks.getUserListDetail).toHaveBeenCalledWith("user-b", "b");
  });

  it("si la lista elegida no se puede cargar, lo dice y ofrece abrirla", async () => {
    mocks.getUserListDetail.mockRejectedValue(new Error("404"));
    renderReader(<ListsReader mode="showcase" tabs={tabs} tabsLabel="Listas" canSave={false} initialPreview={null} />);

    fireEvent.click(screen.getAllByRole("link", { name: /Lista b/ })[0]!);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar esta lista"));
    expect(screen.getByRole("link", { name: "Abrir la lista" })).toBeInTheDocument();
  });

  it("en el teléfono la fila es un enlace: el clic no elige ni pide nada", () => {
    mocks.desktop = false;
    renderReader(<ListsReader mode="showcase" tabs={tabs} tabsLabel="Listas" canSave={false} initialPreview={null} />);

    const row = screen.getAllByRole("link", { name: /Lista b/ })[0]!;
    const notPrevented = fireEvent.click(row);

    expect(notPrevented).toBe(true);
    expect(row).not.toHaveAttribute("aria-current");
    expect(mocks.getUserListDetail).not.toHaveBeenCalled();
  });

  it("Ctrl + clic abre la lista aunque haya vista previa", () => {
    renderReader(<ListsReader mode="showcase" tabs={tabs} tabsLabel="Listas" canSave={false} initialPreview={null} />);

    const row = screen.getAllByRole("link", { name: /Lista b/ })[0]!;
    expect(fireEvent.click(row, { ctrlKey: true })).toBe(true);
    expect(row).not.toHaveAttribute("aria-current");
  });

  it("al cambiar de pestaña, la vista previa pasa a la primera lista de la nueva", () => {
    renderReader(<ListsReader mode="showcase" tabs={tabs} tabsLabel="Listas" canSave={false} initialPreview={null} />);

    fireEvent.click(screen.getByRole("tab", { name: "Recientes" }));

    expect(screen.getByRole("region", { name: "Vista previa: Lista c" })).toBeInTheDocument();
  });

  it("modo explorar: rótulo de resultados, filas sin pestañas y limpiar filtros", () => {
    renderReader(
      <ListsReader
        mode="explore"
        initial={page([list("x")])}
        filters={{ q: "rock", type: undefined, sort: undefined } as never}
        canSave={false}
        initialPreview={null}
      />,
    );

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: /Limpiar filtros/ }));
    expect(mocks.replace).toHaveBeenCalledWith("/lists", { scroll: false });
  });

  it("modo explorar sin resultados muestra su estado vacío", () => {
    renderReader(
      <ListsReader mode="explore" initial={page([])} filters={{ q: "zzz" } as never} canSave={false} initialPreview={null} />,
    );

    expect(screen.queryByRole("region", { name: /Vista previa/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Limpiar filtros/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buscar en todos los tipos" })).not.toBeInTheDocument();
  });

  it("sin resultados con un tipo elegido ofrece buscar en todos los tipos, conservando texto y orden", () => {
    renderReader(
      <ListsReader
        mode="explore"
        initial={page([])}
        filters={{ q: "rock", type: "artist", sort: "popular" } as never}
        canSave={false}
        initialPreview={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Buscar en todos los tipos" }));
    expect(mocks.replace).toHaveBeenCalledWith("/lists?q=rock&sort=popular", { scroll: false });
  });
});
