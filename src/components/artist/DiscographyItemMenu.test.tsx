import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { ArtistDiscographyItem, DiscographyMarks } from "@/services/catalog/artist-discography-view";
import { ArtistDiscography } from "./ArtistDiscography";

const mocks = vi.hoisted(() => ({
  createListenEntry: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleWantToListen: vi.fn(),
  saveRating: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
vi.mock("@/services/catalog/artist-discography-view", () => ({}));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: mocks.toggleFavorite }));
vi.mock("@/lib/api/want-to-listen", () => ({ toggleWantToListen: mocks.toggleWantToListen }));
vi.mock("@/lib/api/social", () => ({ saveRating: mocks.saveRating }));
// El selector de listas tiene sus propios tests; acá solo importa que reciba las pertenencias.
vi.mock("@/components/album/AlbumListPicker", () => ({
  AlbumListPicker: ({ memberships }: { memberships: { title: string }[] }) => (
    <p>selector de listas: {memberships.map((m) => m.title).join(", ") || "ninguna"}</p>
  ),
}));

const d = catalogEs.artist.discography;
const menu = d.menu;

function item(id: string): ArtistDiscographyItem {
  return {
    id,
    title: `Disco ${id}`,
    year: 1985,
    coverThumbUrl: `https://example.com/${id}.jpg`,
    coverResolved: true,
    section: "main",
    kinds: ["album"],
    isEp: false,
    community: { average: null, count: 0 },
    primaryArtist: null,
  };
}

const MARKS: DiscographyMarks = {
  listened: [],
  stars: {},
  detailedScores: {},
  favorites: [],
  pending: ["top"],
  lists: { top: [{ listId: "l1", itemId: "i1", kind: "standard", title: "Favoritas" }] },
};

function render(marks: DiscographyMarks | null = MARKS) {
  return renderWithIntl(
    <ArtistDiscography
      artistId="a1"
      sections={[{ key: "main", items: [item("top"), item("girls")] }]}
      activeSection="main"
      bestRatedId={null}
      marks={marks}
    />,
  );
}

const openMenu = (title: string) => fireEvent.click(screen.getByRole("button", { name: menu.open.replace("{title}", title) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("menú de acciones de un disco", () => {
  it("abre un diálogo con el foco dentro y un solo menú a la vez", () => {
    render();
    openMenu("Disco top");
    const dialog = screen.getByRole("dialog", { name: "Disco top" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole("button", { name: menu.open.replace("{title}", "Disco top") })).toHaveAttribute("aria-expanded", "true");

    openMenu("Disco girls");
    expect(screen.queryByRole("dialog", { name: "Disco top" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Disco girls" })).toBeInTheDocument();
  });

  it("Escape cierra y devuelve el foco al botón", () => {
    render();
    openMenu("Disco top");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: menu.open.replace("{title}", "Disco top") }));
  });

  it("registrar una escucha marca el disco como escuchado y lo saca de Pendiente", async () => {
    mocks.createListenEntry.mockResolvedValue({
      id: "e1",
      target: { type: "release-group", id: "top", title: "Disco top" },
      listenContext: "first_listen",
      body: null,
      reaction: null,
      audience: "followers",
      createdAt: "2026-09-29T12:00:00Z",
    });
    render();
    const card = screen.getByText("Disco top").closest("li")!;
    expect(within(card).getByText(d.pendingMark)).toBeInTheDocument();

    openMenu("Disco top");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: menu.logListen })));

    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: "top" });
    expect(screen.getByRole("status")).toHaveTextContent(menu.listenLogged);
    expect(within(card).getByText(d.listened)).toBeInTheDocument();
    expect(within(card).queryByText(d.pendingMark)).not.toBeInTheDocument();
  });

  it("calificar guarda las estrellas y actualiza la marca", async () => {
    mocks.saveRating.mockResolvedValue({});
    render();
    openMenu("Disco girls");
    await act(async () => fireEvent.click(screen.getByLabelText(catalogEs.album.relation.starsValue.replace("{stars}", "4,5"))));
    expect(mocks.saveRating).toHaveBeenCalledWith("release-group", "girls", { stars: 4.5 });
    expect(screen.getAllByText("Disco girls")[0]!.closest("li")!).toHaveTextContent("★ 4,5");
  });

  it("el selector de listas recibe las pertenencias del disco", () => {
    render();
    openMenu("Disco top");
    fireEvent.click(screen.getByRole("button", { name: menu.addToList }));
    expect(screen.getByText("selector de listas: Favoritas")).toBeInTheDocument();
  });

  it("un fallo se informa y la marca no cambia", async () => {
    mocks.toggleFavorite.mockRejectedValue(new Error("caído"));
    render();
    openMenu("Disco girls");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: menu.favorite })));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(menu.saveError));
    expect(screen.getByRole("button", { name: menu.favorite })).toHaveAttribute("aria-pressed", "false");
  });

  it("sin sesión invita a iniciar sesión y solo ofrece ir al álbum", () => {
    render(null);
    openMenu("Disco top");
    const dialog = screen.getByRole("dialog", { name: "Disco top" });
    expect(within(dialog).getByText(menu.signInPrompt)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: menu.logListen })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: `${menu.goToAlbum} →` })).toHaveAttribute("href", "/album/top");
  });
});
