import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { GenreArtist } from "@/services/genres/artists";
import { parseGenreParams } from "@/services/genres/page-params";
import { GenreArtistCard } from "./GenreArtistCard";
import { GenreArtistFilters } from "./GenreArtistFilters";
import { GenreDiscoverRail } from "./GenreDiscoverRail";
import { GenreFollowButton } from "./GenreFollowButton";

const mocks = vi.hoisted(() => ({ follow: vi.fn(), unfollow: vi.fn(), replace: vi.fn() }));

vi.mock("@/lib/api/catalog", () => ({ followArtist: mocks.follow, unfollowArtist: mocks.unfollow }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));

const artist = (over: Partial<GenreArtist> = {}): GenreArtist => ({
  id: "a1",
  name: "Slowdive",
  type: "group",
  photoUrl: null,
  albumCount: 2,
  discographyComplete: true,
  hasMbid: true,
  featuredAlbum: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.follow.mockResolvedValue({});
  mocks.unfollow.mockResolvedValue({});
});

describe("GenreFollowButton", () => {
  it("Seguir alterna a Siguiendo de inmediato y llama a la API", async () => {
    renderWithIntl(<GenreFollowButton artistId="a1" artistName="Slowdive" initialFollowing={false} />);
    const button = screen.getByRole("button", { name: "Seguir a Slowdive" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(mocks.follow).toHaveBeenCalledWith("a1");
    expect(await screen.findByRole("button", { name: "Dejar de seguir a Slowdive" })).toHaveAttribute("aria-pressed", "true");
  });

  it("Siguiendo lo deja de seguir", async () => {
    renderWithIntl(<GenreFollowButton artistId="a1" artistName="Slowdive" initialFollowing />);
    await userEvent.click(screen.getByRole("button", { name: "Dejar de seguir a Slowdive" }));
    expect(mocks.unfollow).toHaveBeenCalledWith("a1");
    expect(await screen.findByRole("button", { name: "Seguir a Slowdive" })).toBeInTheDocument();
  });

  it("si la operación falla vuelve al estado anterior", async () => {
    mocks.follow.mockRejectedValue(new Error("falló"));
    renderWithIntl(<GenreFollowButton artistId="a1" artistName="Slowdive" initialFollowing={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Seguir a Slowdive" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Seguir a Slowdive" })).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("se deshabilita mientras guarda para no duplicar el envío", async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.follow.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithIntl(<GenreFollowButton artistId="a1" artistName="Slowdive" initialFollowing={false} />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toBeDisabled();
    resolve({});
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
    expect(mocks.follow).toHaveBeenCalledTimes(1);
  });
});

describe("GenreArtistCard", () => {
  it("sin sesión muestra el disco destacado pero ninguna marca personal ni botón", () => {
    renderWithIntl(
      <GenreArtistCard artist={artist({ featuredAlbum: { id: "rg1", title: "Souvlaki", year: 1993 }, known: true })} authenticated={false} />,
    );
    expect(screen.getByRole("link", { name: /Souvlaki/ })).toHaveTextContent("Empieza por «Souvlaki» · 1993");
    expect(screen.queryByText("Ya lo conoces")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("con sesión muestra el botón y «Ya lo conoces» si es conocido y no lo sigue", () => {
    renderWithIntl(<GenreArtistCard artist={artist({ known: true, following: false })} authenticated />);
    expect(screen.getByText("Ya lo conoces")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir a Slowdive" })).toBeInTheDocument();
  });

  it("si ya lo sigue no repite «Ya lo conoces»: lo dice el botón", () => {
    renderWithIntl(<GenreArtistCard artist={artist({ known: true, following: true })} authenticated />);
    expect(screen.queryByText("Ya lo conoces")).toBeNull();
    expect(screen.getByRole("button", { name: "Dejar de seguir a Slowdive" })).toBeInTheDocument();
  });

  it("un desconocido no lleva etiqueta", () => {
    renderWithIntl(<GenreArtistCard artist={artist({ known: false, following: false })} authenticated />);
    expect(screen.queryByText("Ya lo conoces")).toBeNull();
  });

  it("el botón no está dentro de ningún enlace", () => {
    renderWithIntl(<GenreArtistCard artist={artist({ featuredAlbum: { id: "rg1", title: "Souvlaki", year: 1993 } })} authenticated />);
    const button = screen.getByRole("button");
    expect(button.closest("a")).toBeNull();
  });

  it("con la discografía sin explorar dice «Discografía sin explorar» y no «0 álbumes»", () => {
    renderWithIntl(<GenreArtistCard artist={artist({ albumCount: 0, discographyComplete: false })} />);
    expect(screen.getByText("Discografía sin explorar")).toBeInTheDocument();
    expect(screen.queryByText(/0 álbumes/)).toBeNull();
  });

  it("sin explorar pero con álbumes conocidos NO muestra la cantidad parcial y conserva el disco destacado", () => {
    renderWithIntl(
      <GenreArtistCard
        artist={artist({ albumCount: 2, discographyComplete: false, featuredAlbum: { id: "rg1", title: "Souvlaki", year: 1993 } })}
      />,
    );
    expect(screen.getByText("Discografía sin explorar")).toBeInTheDocument();
    expect(screen.queryByText(/2 álbumes/)).toBeNull();
    expect(screen.getByRole("link", { name: /Souvlaki/ })).toBeInTheDocument();
  });

  it("con la discografía explorada muestra la cantidad de álbumes del género", () => {
    renderWithIntl(<GenreArtistCard artist={artist({ albumCount: 2, discographyComplete: true })} />);
    expect(screen.getByText("2 álbumes del género")).toBeInTheDocument();
    expect(screen.queryByText("Discografía sin explorar")).toBeNull();
  });

  it("sin disco destacado no muestra el bloque", () => {
    renderWithIntl(<GenreArtistCard artist={artist()} />);
    expect(screen.queryByText(/Empieza por/)).toBeNull();
  });
});

describe("GenreArtistFilters", () => {
  const facets = {
    countries: [
      { code: "CL", label: "Chile", count: 4 },
      { code: "US", label: "Estados Unidos", count: 20 },
    ],
    debutDecades: [{ decade: 2010, count: 3 }],
  };
  const base = parseGenreParams({ tab: "artists", page: "3" });

  it("cada filtro navega con la página en 1 y solo con valores no predeterminados", async () => {
    renderWithIntl(<GenreArtistFilters slug="shoegaze" params={base} facets={facets} authenticated />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "País" }), "CL");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=artists&pais=CL");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Debut" }), "2010");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=artists&debut=2010");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "descubrir");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=artists&orden=descubrir");
    await userEvent.click(screen.getByRole("checkbox", { name: "Discografía corta" }));
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=artists&tam=corta");
    await userEvent.click(screen.getByRole("checkbox", { name: "Que aún no conozco" }));
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=artists&conocidos=no");
  });

  it("«Que aún no conozco» solo se ofrece con sesión", () => {
    renderWithIntl(<GenreArtistFilters slug="shoegaze" params={base} facets={facets} authenticated={false} />);
    expect(screen.queryByRole("checkbox", { name: "Que aún no conozco" })).toBeNull();
  });

  it("los selectores de país y debut solo se ofrecen con opciones reales", () => {
    renderWithIntl(<GenreArtistFilters slug="shoegaze" params={base} facets={{ countries: [], debutDecades: [] }} authenticated />);
    expect(screen.queryByRole("combobox", { name: "País" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Debut" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toBeInTheDocument();
  });

  it("las opciones muestran el nombre del país y la cantidad", () => {
    renderWithIntl(<GenreArtistFilters slug="shoegaze" params={base} facets={facets} authenticated />);
    const country = within(screen.getByRole("combobox", { name: "País" }));
    expect(country.getByRole("option", { name: "Estados Unidos (20)" })).toHaveValue("US");
    expect(within(screen.getByRole("combobox", { name: "Debut" })).getByRole("option", { name: "2010s (3)" })).toHaveValue("2010");
  });

  it("el orden ofrece los cinco valores y la búsqueda envía el texto recortado", async () => {
    renderWithIntl(<GenreArtistFilters slug="shoegaze" params={base} facets={facets} authenticated />);
    const options = within(screen.getByRole("combobox", { name: "Ordenar por" })).getAllByRole("option");
    expect(options.map((o) => o.getAttribute("value"))).toEqual(["albumes", "seguidos", "az", "recientes", "descubrir"]);
    await userEvent.type(screen.getByRole("searchbox"), "  ride {Enter}");
    expect(mocks.replace).toHaveBeenLastCalledWith("/genre/shoegaze?tab=artists&q=ride");
  });

  it("«Limpiar filtros» aparece solo con filtros activos", () => {
    const { unmount } = renderWithIntl(<GenreArtistFilters slug="shoegaze" params={base} facets={facets} authenticated />);
    expect(screen.queryByRole("link", { name: "Limpiar filtros" })).toBeNull();
    unmount();
    renderWithIntl(
      <GenreArtistFilters slug="shoegaze" params={parseGenreParams({ tab: "artists", pais: "CL" })} facets={facets} authenticated />,
    );
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=artists");
  });

  it("los campos llevan el nombre de su parámetro para funcionar sin JavaScript", () => {
    const { container } = renderWithIntl(<GenreArtistFilters slug="shoegaze" params={base} facets={facets} authenticated />);
    const names = [...container.querySelectorAll("[name]")].map((el) => el.getAttribute("name"));
    expect(names).toEqual(expect.arrayContaining(["tab", "q", "pais", "debut", "orden", "tam", "conocidos"]));
  });
});

describe("GenreDiscoverRail", () => {
  const params = parseGenreParams({});
  const artists = [artist({ id: "a1", name: "Slowdive" }), artist({ id: "a2", name: "Ride" })];

  it("con sesión dice que excluye lo conocido y «Ver todo» lleva los filtros explícitos", () => {
    renderWithIntl(<GenreDiscoverRail slug="shoegaze" params={params} artists={artists} authenticated />);
    expect(screen.getByRole("heading", { name: "Para descubrir" })).toBeInTheDocument();
    expect(screen.getByText("Sin los artistas que ya conoces")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute(
      "href",
      "/es/genre/shoegaze?tab=artists&tam=corta&conocidos=no&orden=descubrir",
    );
  });

  it("un anónimo no ve subtítulo ni el filtro de conocidos", () => {
    renderWithIntl(<GenreDiscoverRail slug="shoegaze" params={params} artists={artists} authenticated={false} />);
    expect(screen.queryByText("Sin los artistas que ya conoces")).toBeNull();
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/es/genre/shoegaze?tab=artists&tam=corta&orden=descubrir");
  });

  it("sin artistas no renderiza nada", () => {
    const { container } = renderWithIntl(<GenreDiscoverRail slug="shoegaze" params={params} artists={[]} authenticated />);
    expect(container).toBeEmptyDOMElement();
  });
});
