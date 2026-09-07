import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { TasteFingerprint } from "./TasteFingerprint";
import type { TasteFingerprint as TasteFingerprintData } from "@/services/profiles/stats";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  ),
}));

const base: TasteFingerprintData = {
  ratingsVisible: true,
  ratingCurve: null,
  totalRatings: 0,
  decades: [],
  genres: [],
  genreDataAvailable: false,
  split: { ratedArtists: 0, ratedAlbums: 0, ratedSongs: 0, collection: 0, lists: 0 },
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

  it("lista los géneros con equivalente textual cuando hay datos", async () => {
    renderWithIntl(
      await TasteFingerprint({
        fingerprint: {
          ...base,
          genreDataAvailable: true,
          genres: [
            { label: "shoegaze", count: 5 },
            { label: "dream pop", count: 3 },
          ],
        },
      }),
    );
    expect(screen.getByText(/fingerprint.a11yRidge.*shoegaze/)).toBeInTheDocument();
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
});
