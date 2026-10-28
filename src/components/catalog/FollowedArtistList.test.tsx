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
  { id: "a1", name: "Zebra Katz", type: "person", photoUrl: null, favorite: false },
  { id: "a2", name: "AC/DC", type: "group", photoUrl: null, favorite: true },
];

async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("button", { name: `Acciones para «${name}»` }));
}

describe("FollowedArtistList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/es/me/artists");
  });

  it("muestra un estado vacío atractivo cuando no se sigue a nadie", () => {
    renderWithIntl(<FollowedArtistList initial={[]} />);

    expect(screen.getByText("Todavía no sigues a ningún artista")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar artistas" })).toHaveAttribute("href", "/search?type=artist");
  });

  it("la fila no lleva botón de seguimiento", async () => {
    renderWithIntl(<FollowedArtistList initial={artists} />);
    await screen.findByRole("button", { name: "Acciones para «Zebra Katz»" });
    expect(screen.queryByRole("button", { name: "Siguiendo" })).not.toBeInTheDocument();
  });

  it("dejar de seguir desde el menú quita la fila y Deshacer la repone en su lugar", async () => {
    const user = userEvent.setup();
    mocks.unfollowArtist.mockResolvedValue({ following: false });
    mocks.followArtist.mockResolvedValue({ following: true });
    renderWithIntl(<FollowedArtistList initial={artists} />);

    await openMenu(user, "Zebra Katz");
    await user.click(screen.getByRole("menuitem", { name: "Dejar de seguir" }));

    expect(mocks.unfollowArtist).toHaveBeenCalledWith("a1");
    expect(screen.queryByText("Zebra Katz")).not.toBeInTheDocument();
    expect(screen.getByText("Dejaste de seguir a Zebra Katz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(mocks.followArtist).toHaveBeenCalledWith("a1");
    const names = screen.getAllByRole("link").map((el) => el.textContent).filter(Boolean);
    expect(names.indexOf("Zebra Katz")).toBeLessThan(names.indexOf("AC/DC"));
  });

  it("si dejar de seguir falla, la fila se queda y lo avisa", async () => {
    const user = userEvent.setup();
    mocks.unfollowArtist.mockRejectedValue(new Error("boom"));
    renderWithIntl(<FollowedArtistList initial={artists} />);

    await openMenu(user, "Zebra Katz");
    await user.click(screen.getByRole("menuitem", { name: "Dejar de seguir" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos dejar de seguirlo");
    expect(screen.getByText("Zebra Katz")).toBeInTheDocument();
  });

  it("arranca con la búsqueda y el orden de la URL y los escribe al cambiar", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} initialFilters={{ q: "ac", sort: "alpha" }} />);

    expect(screen.getByPlaceholderText("Buscar en tus artistas")).toHaveValue("ac");
    expect(await screen.findByText("AC/DC")).toBeInTheDocument();
    expect(screen.queryByText("Zebra Katz")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Buscar en tus artistas"));
    await user.selectOptions(screen.getByLabelText("Ordenar"), "recent");
    expect(window.location.search).toBe("");
    await user.selectOptions(screen.getByLabelText("Ordenar"), "alpha");
    expect(window.location.search).toBe("?sort=alpha");
  });

  it("filtra por nombre con el buscador", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} />);
    await screen.findByText("AC/DC");

    await user.type(screen.getByPlaceholderText("Buscar en tus artistas"), "AC/DC");

    expect(screen.queryByText("Zebra Katz")).not.toBeInTheDocument();
    expect(screen.getByText("AC/DC")).toBeInTheDocument();
  });

  it("ordena alfabéticamente al elegir 'Alfabético'", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} />);

    await user.selectOptions(screen.getByLabelText("Ordenar"), "alpha");
    await screen.findByText("AC/DC");

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

    await openMenu(user, "Zebra Katz");
    await user.click(screen.getByRole("menuitem", { name: "Marcar como favorito" }));

    expect(mocks.toggleFavorite).toHaveBeenCalledWith({ type: "artist", id: "a1" });
    expect(await screen.findByRole("status")).toHaveTextContent("Agregado a favoritos");

    // Ya es favorito: el menú ofrece quitarlo.
    await openMenu(user, "Zebra Katz");
    expect(screen.getByRole("menuitem", { name: "Quitar favorito" })).toBeInTheDocument();
  });

  it("un favorito ya marcado ofrece quitarlo", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} />);

    await openMenu(user, "AC/DC");
    expect(screen.getByRole("menuitem", { name: "Quitar favorito" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Marcar como favorito" })).not.toBeInTheDocument();
  });

  it("abre el panel de 'Añadir a una lista' desde el menú '···'", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FollowedArtistList initial={artists} />);

    await openMenu(user, "Zebra Katz");
    await user.click(screen.getByRole("menuitem", { name: "Añadir a una lista" }));

    expect(screen.getByTestId("mock-add-to-list-panel")).toBeInTheDocument();
  });
});
