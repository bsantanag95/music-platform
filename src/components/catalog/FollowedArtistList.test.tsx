import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FollowedArtistList } from "./FollowedArtistList";
import type { FollowedArtistDto } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  followArtist: vi.fn(),
  unfollowArtist: vi.fn(),
  toggleFavorite: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} alt={props.alt as string} />,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api/catalog", () => ({
  followArtist: mocks.followArtist,
  unfollowArtist: mocks.unfollowArtist,
}));

vi.mock("@/lib/api/favorites", () => ({
  toggleFavorite: mocks.toggleFavorite,
}));

// AddToListPanel carga las listas propias al montar; se aísla igual que en
// AlbumCard.test.tsx para no tener que mockear `@/lib/api/lists` acá.
vi.mock("@/components/lists/AddToListPanel", () => ({
  AddToListPanel: () => <div data-testid="mock-add-to-list-panel" />,
}));

const artists: FollowedArtistDto[] = [
  { id: "a1", name: "Zebra Katz", type: "person", photoUrl: null },
  { id: "a2", name: "AC/DC", type: "group", photoUrl: null },
];

describe("FollowedArtistList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra un estado vacío atractivo cuando no se sigue a nadie", () => {
    renderWithIntl(<FollowedArtistList initial={[]} />);

    expect(screen.getByText("Todavía no seguís a ningún artista")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar en el catálogo" })).toHaveAttribute(
      "href",
      "/search",
    );
  });

  it("al hacer click en 'Siguiendo' cambia el botón a 'Seguir' sin quitar la fila", async () => {
    const user = userEvent.setup();
    mocks.unfollowArtist.mockResolvedValue({ following: false });
    renderWithIntl(<FollowedArtistList initial={artists} />);

    // El primer artista de la lista (orden "Recientes") es Zebra Katz.
    const [firstButton] = screen.getAllByRole("button", { name: "Siguiendo" });
    await user.click(firstButton!);

    expect(mocks.unfollowArtist).toHaveBeenCalledWith("a1");
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
    // La fila sigue en el DOM: no desaparece hasta salir de la sección o recargar.
    expect(screen.getByText("Zebra Katz")).toBeInTheDocument();
  });

  it("un segundo click sobre 'Seguir' vuelve a seguir al artista", async () => {
    const user = userEvent.setup();
    mocks.unfollowArtist.mockResolvedValue({ following: false });
    mocks.followArtist.mockResolvedValue({ following: true });
    renderWithIntl(<FollowedArtistList initial={artists} />);

    const [firstButton] = screen.getAllByRole("button", { name: "Siguiendo" });
    await user.click(firstButton!);
    await user.click(screen.getByRole("button", { name: "Seguir" }));

    expect(mocks.followArtist).toHaveBeenCalledWith("a1");
    expect(screen.getAllByRole("button", { name: "Siguiendo" })).toHaveLength(2);
  });

  it("filtra por nombre con el buscador", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} />);

    await user.type(screen.getByPlaceholderText("Buscar en tus artistas"), "AC/DC");

    expect(screen.queryByText("Zebra Katz")).not.toBeInTheDocument();
    expect(screen.getByText("AC/DC")).toBeInTheDocument();
  });

  it("ordena alfabéticamente al elegir 'Alfabético'", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} />);

    await user.selectOptions(screen.getByLabelText("Ordenar"), "alpha");

    const names = screen.getAllByRole("link").map((el) => el.textContent).filter(Boolean);
    const firstArtistIndex = names.indexOf("AC/DC");
    const secondArtistIndex = names.indexOf("Zebra Katz");
    expect(firstArtistIndex).toBeGreaterThanOrEqual(0);
    expect(firstArtistIndex).toBeLessThan(secondArtistIndex);
  });

  it("marca como favorito desde el menú '···'", async () => {
    const user = userEvent.setup();
    mocks.toggleFavorite.mockResolvedValue({ id: "fav-1" });
    renderWithIntl(<FollowedArtistList initial={artists} />);

    const menus = screen.getAllByRole("button", { name: "Más acciones" });
    await user.click(menus[0]!);
    await user.click(screen.getByRole("menuitem", { name: "Marcar como favorito" }));

    expect(mocks.toggleFavorite).toHaveBeenCalledWith({ type: "artist", id: "a1" });
    expect(await screen.findByRole("status")).toHaveTextContent("Agregado a favoritos");
  });

  it("abre el panel de 'Agregar a lista' desde el menú '···'", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} />);

    const menus = screen.getAllByRole("button", { name: "Más acciones" });
    await user.click(menus[0]!);
    await user.click(screen.getByRole("menuitem", { name: "Agregar elemento" }));

    expect(screen.getByTestId("mock-add-to-list-panel")).toBeInTheDocument();
  });
});
