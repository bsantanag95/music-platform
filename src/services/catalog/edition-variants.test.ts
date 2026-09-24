import { describe, expect, it, vi } from "vitest";
import page1 from "../musicbrainz/__fixtures__/dsotm-release-browse-page1.json";
import page2 from "../musicbrainz/__fixtures__/dsotm-release-browse-page2.json";
import type { MBReleaseBrowseByGroupItem } from "../musicbrainz/types";
import {
  detectEditionVariants,
  editionOwnName,
  effectiveTrackCount,
  extraTracks,
  isBoxEdition,
  normalizeTrackTitle,
  type EditionForVariants,
} from "./edition-variants";

vi.mock("@/db", () => ({ db: {} }));
const { mapReleaseEdition } = await import("./release-editions");

const ALBUM = "The Dark Side of the Moon";

function dsotmEditions(): EditionForVariants[] {
  return [...page1.releases, ...page2.releases].map((release) => {
    const mapped = mapReleaseEdition(release as MBReleaseBrowseByGroupItem);
    return {
      ...mapped,
      id: mapped.mbid,
      labels: mapped.labels.flatMap((l) => (l.name ? [l.name] : [])),
    };
  });
}

function edition(overrides: Partial<EditionForVariants>): EditionForVariants {
  return {
    id: "e",
    mbid: "e",
    title: ALBUM,
    disambiguation: null,
    status: "Official",
    releaseDate: null,
    releaseYear: 2011,
    country: "GB",
    packaging: null,
    formats: ["CD", "CD"],
    mediumCount: 2,
    trackCount: 20,
    labels: [],
    ...overrides,
  };
}

describe("detectEditionVariants con las ediciones reales de DSOTM", () => {
  const variants = detectEditionVariants(dsotmEditions(), 10, ALBUM);

  it("encuentra una sola variante real, la Experience Edition, agrupando sus cuatro ediciones", () => {
    const regular = variants.filter((v) => !v.isBox);
    expect(regular).toHaveLength(1);
    expect(regular[0]).toMatchObject({
      estimatedExtraTracks: 10,
      editionCount: 4,
      countries: ["BR", "GB", "JP", "US"],
      year: 2011,
    });
    expect(regular[0]!.name).toMatch(/Experience Edition/);
  });

  it("marca como cajas las ediciones de 74, 152 y 193 pistas y las deja al final", () => {
    const boxes = variants.filter((v) => v.isBox);
    expect(boxes.map((b) => b.estimatedExtraTracks + 10).sort((a, b) => a - b)).toEqual([74, 152, 193]);
    expect(variants.slice(-3).every((v) => v.isBox)).toBe(true);
  });

  it("no toma como variantes las ediciones de 9 pistas ni los SACD de 3 capas", () => {
    expect(variants.some((v) => v.estimatedExtraTracks <= 0)).toBe(false);
    expect(variants.some((v) => v.formats.some((f) => /layer/i.test(f)))).toBe(false);
  });

  it("da el mismo resultado con otro orden de entrada", () => {
    const reversed = detectEditionVariants([...dsotmEditions()].reverse(), 10, ALBUM);
    expect(reversed).toEqual(variants);
  });
});

describe("reglas de variantes", () => {
  it("agrupa ediciones con los mismos formatos aunque la desambiguación traiga detalles de prensado", () => {
    const variants = detectEditionVariants(
      [
        edition({ id: "a", mbid: "a", disambiguation: "Deluxe, printed in EU" }),
        edition({ id: "b", mbid: "b", disambiguation: "Deluxe, printed in USA", country: "US" }),
      ],
      10,
      ALBUM,
    );
    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({ name: "Deluxe", editionCount: 2, countries: ["GB", "US"] });
  });

  it("ignora ediciones no oficiales", () => {
    expect(detectEditionVariants([edition({ status: "Bootleg" })], 10, ALBUM)).toEqual([]);
  });

  it("sin nombre propio deja el nombre nulo para el fallback de la interfaz", () => {
    expect(editionOwnName({ title: ALBUM, disambiguation: null }, ALBUM)).toBeNull();
    expect(editionOwnName({ title: "Album (Deluxe)", disambiguation: "x" }, ALBUM)).toBe("Album (Deluxe)");
  });

  it("cuenta una sola capa de un SACD híbrido", () => {
    expect(
      effectiveTrackCount({
        formats: ["Hybrid SACD (CD layer)", "Hybrid SACD (SACD layer, 2 channels)", "Hybrid SACD (SACD layer, multichannel)"],
        trackCount: 30,
      }),
    ).toBe(10);
    expect(effectiveTrackCount({ formats: ["CD", "CD"], trackCount: 20 })).toBe(20);
  });

  it("detecta cajas por embalaje, cantidad de discos o recuento", () => {
    expect(isBoxEdition({ packaging: "Box", mediumCount: 1, trackCount: 10 }, 10)).toBe(true);
    expect(isBoxEdition({ packaging: null, mediumCount: 4, trackCount: 20 }, 10)).toBe(true);
    expect(isBoxEdition({ packaging: null, mediumCount: 2, trackCount: 31 }, 10)).toBe(true);
    expect(isBoxEdition({ packaging: "Jewel Case", mediumCount: 2, trackCount: 20 }, 10)).toBe(false);
  });
});

describe("normalizeTrackTitle y extraTracks", () => {
  it("quita solo las marcas de remasterización", () => {
    expect(normalizeTrackTitle("Money - 2011 Remaster")).toBe("money");
    expect(normalizeTrackTitle("Money (Remastered)")).toBe("money");
    expect(normalizeTrackTitle("Money [2003 Remaster]")).toBe("money");
    expect(normalizeTrackTitle("Money - Remastered 2003")).toBe("money");
    expect(normalizeTrackTitle("Canción de Amor")).toBe("cancion de amor");
    expect(normalizeTrackTitle("Money (Live)")).toBe("money (live)");
    expect(normalizeTrackTitle("Money (Demo)")).toBe("money (demo)");
  });

  it("devuelve las pistas que no están en la lista principal ni por grabación ni por título", () => {
    const main = [
      { recordingId: "r-money", title: "Money" },
      { recordingId: "r-time", title: "Time" },
    ];
    const variant = [
      { recordingId: "r-money", title: "Money" },
      { recordingId: "r-money-remaster", title: "Money - 2011 Remaster" },
      { recordingId: "r-money-live", title: "Money (Live)" },
      { recordingId: "r-demo", title: "Us and Them (Demo)" },
    ];
    expect(extraTracks(variant, main).map((t) => t.recordingId)).toEqual(["r-money-live", "r-demo"]);
  });
});
