import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { reviewHref } from "@/lib/catalog-links";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { parseGenreParams } from "@/services/genres/page-params";
import type { GenreList } from "@/services/genres/lists";
import { GenreListsPreview, GenreListsView, GenreRecentReviews } from "./GenreCommunity";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/lists/CommunityListCard", () => ({
  CommunityListCard: ({ list, canSave }: { list: { title: string }; canSave: boolean }) => (
    <span data-testid="list-card" data-can-save={String(canSave)}>
      {list.title}
    </span>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const list = (id: string, title: string, genreAlbumCount: number) => ({ id, title, genreAlbumCount }) as unknown as GenreList;
const review = (over: Record<string, unknown> = {}, userOver: Record<string, unknown> = {}) => ({
  review: {
    id: "r1",
    title: "Un clásico",
    body: "cuerpo",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    rating: { stars: 4.5, detailedScore: null },
    user: { id: "u1", username: "ana", displayName: "Ana", deactivated: false, ...userOver },
    ...over,
  },
  album: { id: "rg1", title: "Souvlaki", coverThumbUrl: null },
});

describe("GenreListsView", () => {
  const params = parseGenreParams({ tab: "lists" });

  it("muestra cada lista con la cantidad de álbumes del género y pasa si se puede guardar", () => {
    renderWithIntl(<GenreListsView slug="shoegaze" params={params} lists={[list("l1", "Mi lista", 5), list("l2", "Otra", 1)]} hasNext={false} canSave />);
    expect(screen.getAllByTestId("list-card").map((c) => c.getAttribute("data-can-save"))).toEqual(["true", "true"]);
    expect(screen.getByText("5 álbumes de este género")).toBeInTheDocument();
    expect(screen.getByText("1 álbum de este género")).toBeInTheDocument();
  });

  it("sin listas muestra el estado vacío con la invitación a crear una solo si hay sesión", () => {
    const { unmount } = renderWithIntl(<GenreListsView slug="shoegaze" params={params} lists={[]} hasNext={false} canSave />);
    expect(screen.getByText("Todavía no hay listas de este género")).toBeInTheDocument();
    expect(screen.getByText(/al menos 3 álbumes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear una lista" })).toHaveAttribute("href", "/es/me/lists");
    unmount();
    renderWithIntl(<GenreListsView slug="shoegaze" params={params} lists={[]} hasNext={false} canSave={false} />);
    expect(screen.queryByRole("link", { name: "Crear una lista" })).toBeNull();
  });

  it("pagina", () => {
    renderWithIntl(<GenreListsView slug="shoegaze" params={parseGenreParams({ tab: "lists", page: "2" })} lists={[list("l1", "x", 3)]} hasNext canSave={false} />);
    expect(screen.getByRole("link", { name: "Página siguiente" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=lists&page=3");
  });
});

describe("GenreListsPreview", () => {
  it("enlaza 'Ver todas' a la pestaña Listas", () => {
    renderWithIntl(<GenreListsPreview slug="shoegaze" params={parseGenreParams({})} lists={[list("l1", "Mi lista", 4)]} canSave={false} />);
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute("href", "/es/genre/shoegaze?tab=lists");
    expect(screen.getByTestId("list-card")).toHaveTextContent("Mi lista");
  });

  it("sin listas no renderiza nada", () => {
    const { container } = renderWithIntl(<GenreListsPreview slug="shoegaze" params={parseGenreParams({})} lists={[]} canSave={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("GenreRecentReviews", () => {
  it("muestra el álbum, el extracto, el autor y enlaza al detalle de la reseña", () => {
    renderWithIntl(<GenreRecentReviews reviews={[review()]} />);
    const section = within(screen.getByRole("region", { name: "Reseñas recientes" }));
    expect(section.getByRole("link", { name: "Souvlaki" })).toHaveAttribute("href", expect.stringMatching(/^\/es\/album\//));
    expect(section.getByRole("link", { name: "Un clásico" })).toHaveAttribute("href", `/es${reviewHref("ana", "Souvlaki", "r1")}`);
    expect(section.getByText("por Ana")).toBeInTheDocument();
    expect(section.getByRole("img", { name: "Nota: 4,5 estrellas" })).toBeInTheDocument();
  });

  it("una cuenta desactivada se muestra enmascarada", () => {
    renderWithIntl(<GenreRecentReviews reviews={[review({}, { deactivated: true, username: "", displayName: null })]} />);
    expect(screen.getByText("por Cuenta desactivada")).toBeInTheDocument();
  });

  it("una reseña sin nota no muestra estrellas", () => {
    renderWithIntl(<GenreRecentReviews reviews={[review({ rating: null })]} />);
    expect(screen.queryByRole("img", { name: /Nota/ })).toBeNull();
  });

  it("sin reseñas no renderiza la sección", () => {
    const { container } = renderWithIntl(<GenreRecentReviews reviews={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
