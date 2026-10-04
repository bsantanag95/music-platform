import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import { MyRatingRow } from "./MyRatingRow";
import type { MyRatingEntry } from "@/lib/api/schemas";

// openspec: add-my-ratings-library (design D7, D8, D9).

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const mocks = vi.hoisted(() => ({
  saveRating: vi.fn(),
  getRatings: vi.fn(),
  deleteRating: vi.fn(),
  highlightRating: vi.fn(),
  unhighlightRating: vi.fn(),
}));
vi.mock("@/lib/api/social", () => mocks);

const t = ratingsEs;

const RATING_ID = "550e8400-e29b-41d4-a716-446655440001";
const RG_ID = "550e8400-e29b-41d4-a716-446655440002";
const ARTIST_ID = "550e8400-e29b-41d4-a716-446655440003";
const REC_ID = "550e8400-e29b-41d4-a716-446655440004";

function album(overrides: Partial<MyRatingEntry> = {}): MyRatingEntry {
  return {
    id: RATING_ID,
    targetType: "release-group",
    stars: 4.5,
    detailedScore: 86,
    updatedAt: "2026-10-01T10:00:00.000Z",
    target: {
      id: RG_ID,
      title: "Bad Animals",
      coverThumbUrl: null,
      artistName: "Heart",
      artistId: ARTIST_ID,
      year: 1987,
    },
    ...overrides,
  };
}

function renderRow(entry: MyRatingEntry = album(), extra: { showArtist?: boolean; showType?: boolean } = {}) {
  const onUpdate = vi.fn();
  const onEdit = vi.fn();
  renderWithIntl(<MyRatingRow entry={entry} onUpdate={onUpdate} onEdit={onEdit} {...extra} />);
  return { onUpdate, onEdit };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MyRatingRow", () => {
  it("muestra título, año, artista y tipo, con enlaces al álbum y al artista", () => {
    renderRow();
    const title = screen.getByRole("link", { name: "Bad Animals" });
    expect(title).toHaveAttribute("href", albumHref("Heart", "Bad Animals", RG_ID));
    expect(screen.getByText("1987")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Heart" })).toHaveAttribute("href", artistHref("Heart", ARTIST_ID));
    expect(screen.getByText(t.typeAlbum)).toBeInTheDocument();
    expect(screen.getByTestId("cover")).toBeInTheDocument();
  });

  it("sin showArtist ni showType omite artista y tipo pero conserva el año y no deja un separador suelto", () => {
    renderRow(album(), { showArtist: false, showType: false });
    expect(screen.queryByRole("link", { name: "Heart" })).not.toBeInTheDocument();
    expect(screen.queryByText(t.typeAlbum)).not.toBeInTheDocument();
    expect(screen.queryByText("·")).not.toBeInTheDocument();
    expect(screen.getByText("1987")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bad Animals" })).toBeInTheDocument();
  });

  it("con showType=false muestra el artista sin el tipo ni separador", () => {
    renderRow(album(), { showType: false });
    expect(screen.getByRole("link", { name: "Heart" })).toBeInTheDocument();
    expect(screen.queryByText(t.typeAlbum)).not.toBeInTheDocument();
    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });

  it("con showArtist=false muestra solo el tipo, sin separador", () => {
    renderRow(album(), { showArtist: false });
    expect(screen.getByText(t.typeAlbum)).toBeInTheDocument();
    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });

  it("una entrada sin artista no deja un '·' colgando", () => {
    renderRow(album({ target: { ...album().target, artistName: null, artistId: null } }));
    expect(screen.getByText(t.typeAlbum)).toBeInTheDocument();
    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });

  it("es una fila compacta: título y nota comparten línea desde sm y las estrellas son chicas", () => {
    renderRow();
    const article = screen.getByRole("article");
    expect(article.className).toContain("sm:items-center");
    const group = screen.getByRole("group", { name: "Estrellas de Bad Animals" });
    expect(group.querySelector("svg")?.getAttribute("class")).toContain("size-5");
    expect(group.querySelector("svg")?.getAttribute("class")).not.toContain("size-6");
  });

  it("una canción enlaza a su página y se rotula como canción", () => {
    renderRow(
      album({
        targetType: "recording",
        target: { id: REC_ID, title: "Alone", coverThumbUrl: null, artistName: "Heart", artistId: ARTIST_ID, year: null },
      }),
    );
    const title = screen.getByRole("link", { name: "Alone" });
    expect(title).toHaveAttribute("href", songHref("Heart", "Alone", REC_ID));
    expect(screen.getByText(t.typeSong)).toBeInTheDocument();
    expect(screen.queryByText("1987")).not.toBeInTheDocument();
  });

  it("con puntaje muestra las estrellas y 86/100, sin la marca 'Sin afinar'", () => {
    renderRow();
    expect(screen.getByRole("radio", { name: "4,5 estrellas" })).toBeChecked();
    expect(screen.getByRole("button", { name: "86/100" })).toHaveTextContent("86/100");
    expect(screen.queryByText(t.untuned)).not.toBeInTheDocument();
  });

  it("sin puntaje muestra 'Sin afinar' como acción que pide abrir el diálogo", () => {
    const entry = album({ detailedScore: null, stars: 4 });
    const { onEdit } = renderRow(entry);
    expect(screen.queryByText("86/100")).not.toBeInTheDocument();
    const mark = screen.getByRole("button", { name: t.untunedAction });
    expect(mark).toHaveTextContent(t.untuned);

    fireEvent.click(mark);
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it("el puntaje pide abrir el diálogo con la valoración de la fila (el diálogo vive en el orquestador)", () => {
    const entry = album();
    const { onEdit } = renderRow(entry);
    fireEvent.click(screen.getByRole("button", { name: "86/100" }));
    expect(onEdit).toHaveBeenCalledWith(entry);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("los grupos de estrellas llevan una leyenda y etiquetas legibles", () => {
    renderRow();
    expect(screen.getByRole("group", { name: "Estrellas de Bad Animals" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "0,5 estrellas" })).toBeInTheDocument();
  });

  it("cambiar a estrellas incoherentes con el puntaje lo quita y lo avisa", async () => {
    mocks.saveRating.mockResolvedValue({});
    const { onUpdate } = renderRow();
    fireEvent.click(screen.getByRole("radio", { name: "5,0 estrellas" }));

    await waitFor(() =>
      expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG_ID, { stars: 5, detailedScore: undefined }),
    );
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(RATING_ID, expect.objectContaining({ stars: 5, detailedScore: null })),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Se quitó el puntaje 86");
  });

  it("cambiar las estrellas sin puntaje no avisa nada", async () => {
    mocks.saveRating.mockResolvedValue({});
    const { onUpdate } = renderRow(album({ detailedScore: null, stars: 3 }));
    fireEvent.click(screen.getByRole("radio", { name: "4,0 estrellas" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(RATING_ID, expect.objectContaining({ stars: 4, detailedScore: null })),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("elegir las mismas estrellas no guarda nada", () => {
    renderRow();
    fireEvent.click(screen.getByRole("radio", { name: "4,5 estrellas" }));
    expect(mocks.saveRating).not.toHaveBeenCalled();
  });

  it("si falla el guardado de estrellas no actualiza la fila", async () => {
    mocks.saveRating.mockRejectedValue(new Error("red"));
    const { onUpdate } = renderRow();
    fireEvent.click(screen.getByRole("radio", { name: "5,0 estrellas" }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalled());
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "5,0 estrellas" })).toBeEnabled();
  });
});
