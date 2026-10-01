import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import catalogEs from "../../../messages/es/catalog.json";
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
const detail = catalogEs.album.relation.detail;

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

function ratingsOf(stars: number, detailedScore: number | null) {
  return {
    own: { id: RATING_ID, stars, detailedScore, createdAt: "", updatedAt: "2026-10-02T10:00:00.000Z" },
    aggregate: { count: 1, averageStars: null, averageDetailedScore: null },
  };
}
const noRating = { own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } };

function renderRow(entry: MyRatingEntry = album()) {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  renderWithIntl(<MyRatingRow entry={entry} onUpdate={onUpdate} onDelete={onDelete} />);
  return { onUpdate, onDelete };
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

  it("sin puntaje muestra 'Sin afinar' como acción que abre el diálogo", () => {
    renderRow(album({ detailedScore: null, stars: 4 }));
    expect(screen.queryByText("86/100")).not.toBeInTheDocument();
    const mark = screen.getByRole("button", { name: t.untunedAction });
    expect(mark).toHaveTextContent(t.untuned);

    fireEvent.click(mark);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toHaveAttribute("min", "71");
    expect(screen.getByRole("slider")).toHaveAttribute("max", "80");
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

  it("afinar desde el diálogo guarda solo el puntaje y actualiza la fila en el lugar", async () => {
    mocks.saveRating.mockResolvedValue({});
    mocks.getRatings.mockResolvedValue(ratingsOf(4.5, 88));
    const { onUpdate } = renderRow();

    fireEvent.click(screen.getByRole("button", { name: "86/100" }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "88" } });
    fireEvent.click(screen.getByRole("button", { name: detail.save }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG_ID, { detailedScore: 88 }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(RATING_ID, expect.objectContaining({ stars: 4.5, detailedScore: 88 })),
    );
  });

  it("borrar la nota desde el diálogo quita la fila", async () => {
    mocks.deleteRating.mockResolvedValue(null);
    mocks.getRatings.mockResolvedValue(noRating);
    const { onDelete } = renderRow();

    fireEvent.click(screen.getByRole("button", { name: "86/100" }));
    fireEvent.click(screen.getByRole("button", { name: detail.delete }));
    fireEvent.click(await screen.findByRole("button", { name: detail.deleteConfirm }));

    await waitFor(() => expect(mocks.deleteRating).toHaveBeenCalledWith("release-group", RG_ID));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(RATING_ID));
  });
});
