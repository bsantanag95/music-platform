import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import { albumHref, songHref } from "@/lib/catalog-links";
import { RatingTile } from "./RatingTile";
import type { MyRatingEntry } from "@/lib/api/schemas";

// openspec: add-ratings-view-modes (my-ratings-view-modes, "Modo Gráfico").

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ cover }: { cover: string | null }) => <span data-testid="cover" data-cover={cover ?? ""} />,
}));

const t = ratingsEs;

const ID = "550e8400-e29b-41d4-a716-446655440001";
const RG_ID = "550e8400-e29b-41d4-a716-446655440002";
const ARTIST_ID = "550e8400-e29b-41d4-a716-446655440003";

function album(overrides: Partial<MyRatingEntry> = {}): MyRatingEntry {
  return {
    id: ID,
    targetType: "release-group",
    stars: 4.5,
    detailedScore: 86,
    updatedAt: "2026-10-01T10:00:00.000Z",
    target: {
      id: RG_ID,
      title: "Bad Animals",
      coverThumbUrl: "https://example.com/cover.jpg",
      artistName: "Heart",
      artistId: ARTIST_ID,
      year: 1987,
    },
    ...overrides,
  };
}

function renderTile(entry: MyRatingEntry = album(), extra: { showArtist?: boolean; showType?: boolean } = {}) {
  const onEdit = vi.fn();
  renderWithIntl(
    <ul>
      <RatingTile entry={entry} onEdit={onEdit} {...extra} />
    </ul>,
  );
  return { onEdit };
}

describe("RatingTile", () => {
  it("el overlay muestra estrellas, el puntaje 86/100, el título y el artista", () => {
    renderTile();
    const overlay = screen.getByTestId("rating-overlay");
    expect(overlay).toHaveTextContent("86/100");
    expect(overlay).toHaveTextContent("Bad Animals");
    expect(overlay).toHaveTextContent("Heart");
    expect(screen.getByRole("img", { name: "4,5 estrellas" })).toBeInTheDocument();
  });

  it("el overlay indica el tipo y el año junto al artista", () => {
    renderTile();
    expect(screen.getByTestId("rating-overlay")).toHaveTextContent("Álbum · 1987");
  });

  it("sin showArtist ni showType el overlay omite artista y tipo pero conserva el año; la etiqueta accesible sigue completa", () => {
    renderTile(album(), { showArtist: false, showType: false });
    const overlay = screen.getByTestId("rating-overlay");
    expect(overlay).not.toHaveTextContent("Heart");
    expect(overlay).not.toHaveTextContent("Álbum");
    expect(overlay).toHaveTextContent("1987");
    expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Bad Animals, Heart, Álbum, 4,5 estrellas, 86/100");
  });

  it("con showType=false muestra el artista y el año sin el tipo", () => {
    renderTile(album(), { showType: false });
    const overlay = screen.getByTestId("rating-overlay");
    expect(overlay).toHaveTextContent("Heart");
    expect(overlay).not.toHaveTextContent("Álbum");
    expect(overlay).toHaveTextContent("1987");
  });

  it("sin año ni tipo no dibuja la línea de detalle", () => {
    renderTile(album({ target: { ...album().target, year: null } }), { showArtist: false, showType: false });
    const overlay = screen.getByTestId("rating-overlay");
    expect(overlay).not.toHaveTextContent("·");
    expect(overlay).not.toHaveTextContent("1987");
  });

  it("lleva una marca fija de tipo: disco para álbum, nota musical para canción", () => {
    renderTile();
    expect(screen.getByTestId("rating-type-badge")).toHaveAttribute("data-type", "release-group");
    expect(screen.getByTestId("rating-type-badge").querySelectorAll("circle")).toHaveLength(2);
    // No depende del overlay (se ve sin hover) ni captura el cursor.
    expect(screen.getByTestId("rating-overlay").contains(screen.getByTestId("rating-type-badge"))).toBe(false);
    expect(screen.getByTestId("rating-type-badge").className).toContain("pointer-events-none");
  });

  it("una canción muestra la marca de nota musical y 'Canción' en el overlay", () => {
    renderTile(
      album({
        targetType: "recording",
        target: { id: RG_ID, title: "Alone", coverThumbUrl: null, artistName: "Heart", artistId: ARTIST_ID, year: 1976 },
      }),
    );
    expect(screen.getByTestId("rating-type-badge")).toHaveAttribute("data-type", "recording");
    expect(screen.getByTestId("rating-type-badge").querySelector("path")).not.toBeNull();
    expect(screen.getByTestId("rating-overlay")).toHaveTextContent("Canción · 1976");
    expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Alone, Heart, Canción, 4,5 estrellas, 86/100");
  });

  it("la carátula enlaza a la ficha y su etiqueta lleva título, artista, estrellas y puntaje", () => {
    renderTile();
    const link = screen.getByRole("link", { name: "Bad Animals, Heart, Álbum, 4,5 estrellas, 86/100" });
    expect(link).toHaveAttribute("href", albumHref("Heart", "Bad Animals", RG_ID));
    expect(screen.getByTestId("cover")).toHaveAttribute("data-cover", "https://example.com/cover.jpg");
  });

  it("una canción enlaza a su página", () => {
    renderTile(
      album({
        targetType: "recording",
        target: { id: RG_ID, title: "Alone", coverThumbUrl: null, artistName: "Heart", artistId: ARTIST_ID, year: null },
      }),
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", songHref("Heart", "Alone", RG_ID));
  });

  it("sin artista la etiqueta omite ese dato", () => {
    renderTile(
      album({ target: { ...album().target, artistName: null, artistId: null } }),
    );
    expect(screen.getByRole("link", { name: "Bad Animals, Álbum, 4,5 estrellas, 86/100" })).toBeInTheDocument();
  });

  it("'Editar nota' pide abrir el diálogo con la entrada y no navega", () => {
    const entry = album();
    const { onEdit } = renderTile(entry);
    const button = screen.getByRole("button", { name: "Editar la nota de Bad Animals" });
    expect(button).toHaveTextContent(t.editRating);
    // El botón es un hermano del enlace, no un descendiente: activarlo no dispara la navegación.
    expect(screen.getByRole("link").contains(button)).toBe(false);

    fireEvent.click(button);
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it("sin puntaje el overlay muestra 'Sin afinar' como acción que abre el diálogo", () => {
    const entry = album({ detailedScore: null, stars: 4 });
    const { onEdit } = renderTile(entry);
    expect(screen.queryByText("86/100")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Bad Animals, Heart, Álbum, 4,0 estrellas, ${t.untuned}` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t.untunedAction }));
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it("el overlay no captura el cursor salvo en sus botones y se revela con hover, foco y sin hover", () => {
    renderTile();
    const overlay = screen.getByTestId("rating-overlay");
    expect(overlay.className).toContain("pointer-events-none");
    expect(overlay.className).toContain("opacity-0");
    expect(overlay.className).toContain("group-hover:opacity-100");
    expect(overlay.className).toContain("group-focus-within:opacity-100");
    expect(overlay.className).toContain("[@media(hover:none)]:opacity-100");
    expect(screen.getByRole("button", { name: "Editar la nota de Bad Animals" }).className).toContain(
      "pointer-events-auto",
    );
  });

  it("sin carátula propia entrega null al componente de carátula (disco genérico)", () => {
    renderTile(
      album({ target: { ...album().target, coverThumbUrl: null } }),
    );
    expect(screen.getByTestId("cover")).toHaveAttribute("data-cover", "");
  });
});
