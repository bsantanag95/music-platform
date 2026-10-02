import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { TasteFingerprint } from "./TasteFingerprint";
import type { TasteFingerprint as TasteFingerprintData } from "@/services/profiles/stats";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  ),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

const base: TasteFingerprintData = {
  ratingsVisible: true,
  ratingCurve: null,
  totalRatings: 0,
  decades: [],
  genres: [],
  declaredMissing: [],
  genreDataAvailable: false,
  split: { ratedArtists: 0, ratedAlbums: 0, ratedSongs: 0, collection: 0, lists: 0 },
  summary: [],
};

describe("TasteFingerprint", () => {
  it("dibuja la curva y su equivalente textual cuando hay datos", async () => {
    renderWithIntl(
      await TasteFingerprint({
        fingerprint: {
          ...base,
          totalRatings: 4,
          ratingCurve: [
            { stars: 3, count: 1 },
            { stars: 4, count: 3 },
          ],
        },
      }),
    );
    // Equivalente textual: tabla sr-only con caption y filas.
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("fingerprint.a11yCurveCaption");
    expect(table).toHaveTextContent("3");
    expect(table).toHaveTextContent("4");
  });

  it("muestra el texto de curva vacía cuando ratingCurve es null", async () => {
    renderWithIntl(await TasteFingerprint({ fingerprint: base }));
    expect(screen.getByText("fingerprint.ratingCurveEmpty")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra 'sin datos de género' cuando genreDataAvailable es false", async () => {
    renderWithIntl(await TasteFingerprint({ fingerprint: base }));
    expect(screen.getByText("fingerprint.genresEmpty")).toBeInTheDocument();
  });

  it("lista las familias con sus géneros (en el idioma de la página) y su equivalente textual", async () => {
    renderWithIntl(
      await TasteFingerprint({
        fingerprint: {
          ...base,
          genreDataAvailable: true,
          genres: [
            {
              family: "rock",
              count: 5,
              topGenres: [
                { slug: "shoegaze", name: "shoegaze", nameEs: "shoegazing" },
                { slug: "dream-pop", name: "dream pop", nameEs: null },
              ],
            },
            { family: "latin", count: 1, topGenres: [] },
          ],
        },
      }),
    );
    expect(screen.getByText("shoegazing, dream pop")).toBeInTheDocument();
    expect(screen.getByText(/fingerprint.a11yRidgeDetail.*families.rock.*shoegazing, dream pop/)).toBeInTheDocument();
    expect(screen.getByText(/fingerprint.a11yRidge:.*families.latin/)).toBeInTheDocument();
  });

  it("arma el reparto solo con los conteos > 0", async () => {
    renderWithIntl(
      await TasteFingerprint({
        fingerprint: { ...base, split: { ...base.split, ratedAlbums: 12, collection: 3 } },
      }),
    );
    expect(screen.getByText(/fingerprint.splitAlbums/)).toBeInTheDocument();
    expect(screen.queryByText(/fingerprint.splitSongs/)).not.toBeInTheDocument();
  });

  it("marca las familias declaradas y nombra las declaradas que no aparecen", async () => {
    renderWithIntl(
      await TasteFingerprint({
        fingerprint: {
          ...base,
          genreDataAvailable: true,
          genres: [
            { family: "rock", count: 5, topGenres: [], declared: true },
            { family: "pop", count: 2, topGenres: [] },
          ],
          declaredMissing: ["jazz"],
        },
      }),
    );
    expect(screen.getAllByTitle("fingerprint.declaredBadge")).toHaveLength(1);
    expect(screen.getByText(/fingerprint.a11yRidge:.*families.rock.*. fingerprint.a11yDeclared/)).toBeInTheDocument();
    expect(screen.getByText(/fingerprint.declaredMissing.*families.jazz/)).toBeInTheDocument();
  });

  it("sin géneros declarados no hay marcas ni línea adicional", async () => {
    renderWithIntl(
      await TasteFingerprint({
        fingerprint: { ...base, genreDataAvailable: true, genres: [{ family: "rock", count: 5, topGenres: [] }] },
      }),
    );
    expect(screen.queryByTitle("fingerprint.declaredBadge")).toBeNull();
    expect(screen.queryByText(/declaredMissing/)).toBeNull();
  });
});
