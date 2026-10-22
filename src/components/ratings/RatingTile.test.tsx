import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import { albumHref, songHref } from "@/lib/catalog-links";
import { RatingTile } from "./RatingTile";
import type { MyRatingEntry } from "@/lib/api/schemas";

// openspec: redesign-ratings-views (my-ratings-view-modes, "Modo Gráfico con la nota visible").

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ cover, priority }: { cover: string | null; priority?: boolean }) => (
    <span data-testid="cover" data-cover={cover ?? ""} data-priority={String(Boolean(priority))} />
  ),
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

function renderTile(
  entry: MyRatingEntry = album(),
  extra: { showArtist?: boolean; showType?: boolean; priority?: boolean } = {},
) {
  const onEdit = vi.fn();
  renderWithIntl(
    <ul>
      <RatingTile entry={entry} onEdit={onEdit} {...extra} />
    </ul>,
  );
  return { onEdit };
}

const caption = () => screen.getByTestId("rating-caption");

describe("RatingTile", () => {
  it("la leyenda siempre visible muestra título, artista, estrellas y puntaje, sin overlay", () => {
    renderTile();
    expect(caption()).toHaveTextContent("Bad Animals");
    expect(caption()).toHaveTextContent("Heart");
    expect(caption()).toHaveTextContent("86");
    expect(screen.getByRole("img", { name: "4,5 estrellas" })).toBeInTheDocument();
    expect(screen.queryByTestId("rating-overlay")).not.toBeInTheDocument();
    // Nada sobre la imagen salvo la marca de tipo, que no captura el cursor.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("link").contains(screen.getByRole("button"))).toBe(false);
  });

  it("la línea de detalle junta artista, tipo y año", () => {
    renderTile();
    expect(caption()).toHaveTextContent("Heart · Álbum · 1987");
  });

  it("sin showArtist ni showType omite artista y tipo pero conserva el año; la etiqueta accesible sigue completa", () => {
    renderTile(album(), { showArtist: false, showType: false });
    expect(caption()).not.toHaveTextContent("Heart");
    expect(caption()).not.toHaveTextContent("Álbum");
    expect(caption()).toHaveTextContent("1987");
    expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Bad Animals, Heart, Álbum, 4,5 estrellas, 86/100");
  });

  it("con showType=false muestra el artista y el año sin el tipo", () => {
    renderTile(album(), { showType: false });
    expect(caption()).toHaveTextContent("Heart · 1987");
    expect(caption()).not.toHaveTextContent("Álbum");
  });

  it("sin año ni artista ni tipo no dibuja la línea de detalle", () => {
    renderTile(album({ target: { ...album().target, year: null } }), { showArtist: false, showType: false });
    expect(caption()).not.toHaveTextContent("·");
    expect(caption()).not.toHaveTextContent("1987");
  });

  it("lleva una marca fija de tipo: disco para álbum, nota musical para canción", () => {
    renderTile();
    expect(screen.getByTestId("rating-type-badge")).toHaveAttribute("data-type", "release-group");
    expect(screen.getByTestId("rating-type-badge").querySelectorAll("circle")).toHaveLength(2);
    expect(screen.getByTestId("rating-type-badge").className).toContain("pointer-events-none");
  });

  it("una canción muestra la marca de nota musical y 'Canción' en la leyenda", () => {
    renderTile(
      album({
        targetType: "recording",
        target: { id: RG_ID, title: "Alone", coverThumbUrl: null, artistName: "Heart", artistId: ARTIST_ID, year: 1976 },
      }),
    );
    expect(screen.getByTestId("rating-type-badge")).toHaveAttribute("data-type", "recording");
    expect(screen.getByTestId("rating-type-badge").querySelector("path")).not.toBeNull();
    expect(caption()).toHaveTextContent("Heart · Canción · 1976");
    expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Alone, Heart, Canción, 4,5 estrellas, 86/100");
  });

  it("la carátula enlaza a la ficha y su etiqueta lleva título, artista, tipo, estrellas y puntaje", () => {
    renderTile();
    const link = screen.getByRole("link", { name: "Bad Animals, Heart, Álbum, 4,5 estrellas, 86/100" });
    expect(link).toHaveAttribute("href", albumHref("Heart", "Bad Animals", RG_ID));
    expect(screen.getByTestId("cover")).toHaveAttribute("data-cover", "https://example.com/cover.jpg");
  });

  it("el título enlaza igual pero no es un segundo punto de tabulación ni de lectura", () => {
    renderTile();
    const titleLink = caption().querySelector("a")!;
    expect(titleLink).toHaveAttribute("href", albumHref("Heart", "Bad Animals", RG_ID));
    expect(titleLink).toHaveAttribute("aria-hidden", "true");
    expect(titleLink).toHaveAttribute("tabindex", "-1");
    expect(screen.getAllByRole("link")).toHaveLength(1);
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
    renderTile(album({ target: { ...album().target, artistName: null, artistId: null } }));
    expect(screen.getByRole("link", { name: "Bad Animals, Álbum, 4,5 estrellas, 86/100" })).toBeInTheDocument();
  });

  it("el puntaje abre el diálogo con la entrada y no navega", () => {
    const entry = album();
    const { onEdit } = renderTile(entry);
    const button = screen.getByRole("button", { name: "Editar la nota de Bad Animals" });
    expect(button).toHaveTextContent("86");
    expect(button).not.toHaveTextContent("/100");
    // El botón es un hermano del enlace, no un descendiente: activarlo no dispara la navegación.
    expect(screen.getByRole("link").contains(button)).toBe(false);

    fireEvent.click(button);
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it("sin puntaje muestra un guion con la ayuda 'Sin afinar' como acción que abre el diálogo", () => {
    const entry = album({ detailedScore: null, stars: 4 });
    const { onEdit } = renderTile(entry);
    expect(screen.queryByText("86")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Bad Animals, Heart, Álbum, 4,0 estrellas, ${t.untuned}` })).toBeInTheDocument();
    const button = screen.getByRole("button", { name: t.untunedAction });
    expect(button).toHaveTextContent("—");
    expect(button).toHaveAttribute("title", t.untuned);
    expect(caption()).not.toHaveTextContent(t.untuned);

    fireEvent.click(button);
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it("el botón del puntaje llega a 44 px con puntero grueso", () => {
    renderTile();
    expect(screen.getByRole("button", { name: "Editar la nota de Bad Animals" }).className).toContain(
      "[@media(pointer:coarse)]:min-h-11",
    );
  });

  it("sin carátula propia entrega null al componente de carátula (disco genérico)", () => {
    renderTile(album({ target: { ...album().target, coverThumbUrl: null } }));
    expect(screen.getByTestId("cover")).toHaveAttribute("data-cover", "");
  });

  it("la carátula prioritaria se pide con prioridad", () => {
    renderTile(album(), { priority: true });
    expect(screen.getByTestId("cover")).toHaveAttribute("data-priority", "true");
  });
});
